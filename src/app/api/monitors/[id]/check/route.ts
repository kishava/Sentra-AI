import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { getSignalsForRun, saveIntelligenceRun } from "@/lib/db/intelligence";
import { getMonitor, recordMonitorEvents, updateMonitorChecked } from "@/lib/db/monitors";
import { filterSignalsForMonitor } from "@/lib/monitor-match";
import { checkRateLimit } from "@/lib/rate-limit";
import { collectWebIntelligence } from "@/services/bright-data";
import { generateEnterpriseAnalysis } from "@/services/openai";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    const limited = await checkRateLimit(auth.user.id, "monitor_check");
    if (!limited.allowed) {
      return NextResponse.json({ error: limited.message }, { status: 429 });
    }

    const { id } = await context.params;
    const monitor = await getMonitor(auth.supabase, auth.user.id, id);
    if (!monitor) {
      return NextResponse.json({ error: "Monitor not found." }, { status: 404 });
    }

    const webEvidence = await collectWebIntelligence({
      query: monitor.requirement,
      targetUrl: monitor.target_url ?? undefined,
      mode: monitor.target_url ? "unlocker" : "serp",
    });

    const analysis = await generateEnterpriseAnalysis(monitor.requirement, webEvidence.evidence);
    const runId = await saveIntelligenceRun(auth.supabase, auth.user.id, {
      query: monitor.requirement,
      provider: webEvidence.provider,
      evidencePreview: analysis.summary,
      analysis,
    });

    const savedSignals = await getSignalsForRun(auth.supabase, auth.user.id, runId);

    const matched = filterSignalsForMonitor(
      {
        requirement: monitor.requirement,
        category: monitor.category as "any",
        minimumSeverity: monitor.minimum_severity,
        keywords: monitor.keywords,
      },
      savedSignals.length ? savedSignals : analysis.signals,
    );

    await recordMonitorEvents(auth.supabase, auth.user.id, monitor.id, matched);
    await updateMonitorChecked(auth.supabase, auth.user.id, monitor.id);

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
