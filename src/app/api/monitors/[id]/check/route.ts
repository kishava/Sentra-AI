import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { getSignalsForRun, saveIntelligenceRun } from "@/lib/db/intelligence";
import { getMonitor, recordMonitorEvents, updateMonitorChecked } from "@/lib/db/monitors";
import { filterSignalsForMonitor } from "@/lib/monitor-match";
import { checkRateLimit } from "@/lib/rate-limit";
import { collectWebIntelligence } from "@/services/bright-data";
import { generateEnterpriseAnalysis } from "@/services/openai";
import type { Severity } from "@/types/intelligence";

export const runtime = "nodejs";

type LocalMonitorPayload = {
  requirement?: string;
  category?: string;
  minimumSeverity?: Severity;
  keywords?: string[];
  targetUrl?: string;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    const limited = await checkRateLimit(auth.user.id, "monitor_check");
    if (!limited.allowed) {
      return NextResponse.json({ error: limited.message }, { status: 429 });
    }

    const body = (await request.json().catch(() => ({}))) as LocalMonitorPayload;
    const { id } = await context.params;

    let monitor: {
      requirement: string;
      category: string;
      minimum_severity: Severity;
      keywords: string[];
      target_url: string | null;
      id: string;
    } | null = null;

    if (auth.localMode || !auth.supabase) {
      if (!body.requirement?.trim()) {
        return NextResponse.json(
          { error: "Monitor requirement is required in local mode." },
          { status: 400 },
        );
      }
      monitor = {
        id,
        requirement: body.requirement.trim(),
        category: body.category ?? "any",
        minimum_severity: body.minimumSeverity ?? "medium",
        keywords: body.keywords ?? [],
        target_url: body.targetUrl ?? null,
      };
    } else {
      const stored = await getMonitor(auth.supabase, auth.user.id, id);
      if (!stored) {
        return NextResponse.json({ error: "Monitor not found." }, { status: 404 });
      }
      monitor = stored;
    }

    const webEvidence = await collectWebIntelligence({
      query: monitor.requirement,
      targetUrl: monitor.target_url ?? undefined,
      mode: monitor.target_url ? "unlocker" : "serp",
    });

    const analysis = await generateEnterpriseAnalysis(monitor.requirement, webEvidence.evidence);

    let savedSignals = analysis.signals;
    if (!auth.localMode && auth.supabase) {
      const runId = await saveIntelligenceRun(auth.supabase, auth.user.id, {
        query: monitor.requirement,
        provider: webEvidence.provider,
        evidencePreview: analysis.summary,
        analysis,
      });
      savedSignals = await getSignalsForRun(auth.supabase, auth.user.id, runId);
    }

    const matched = filterSignalsForMonitor(
      {
        requirement: monitor.requirement,
        category: monitor.category as "any",
        minimumSeverity: monitor.minimum_severity,
        keywords: monitor.keywords,
      },
      savedSignals.length ? savedSignals : analysis.signals,
    );

    if (!auth.localMode && auth.supabase) {
      await recordMonitorEvents(auth.supabase, auth.user.id, monitor.id, matched);
      await updateMonitorChecked(auth.supabase, auth.user.id, monitor.id);
    }

    return NextResponse.json({
      provider: webEvidence.provider,
      matchedCount: matched.length,
      signals: matched,
      analysis,
    });
  } catch (error) {
    console.error("Monitor check failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Monitor check failed." },
      { status: 500 },
    );
  }
}
