import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { createMonitor, getMonitor } from "@/lib/db/monitors";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensurePlatformSecrets } from "@/lib/secrets/platform-secrets";
import { monitorCheckErrorStatus, runMonitorCheck } from "@/services/monitor-check";
import type { WorkspaceContext } from "@/lib/gtm/workspace-context";
import type { Severity } from "@/types/intelligence";

export const runtime = "nodejs";
export const maxDuration = 120;

type LocalMonitorPayload = {
  requirement?: string;
  searchQuery?: string;
  category?: string;
  minimumSeverity?: Severity;
  keywords?: string[];
  targetUrl?: string;
  workspace?: WorkspaceContext;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensurePlatformSecrets();
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    try {
      const limited = await checkRateLimit(auth.user.id, "monitor_check");
      if (!limited.allowed) {
        return NextResponse.json({ error: limited.message }, { status: 429 });
      }
    } catch (rateError) {
      console.warn("Monitor check rate limit skipped", rateError);
    }

    const body = (await request.json().catch(() => ({}))) as LocalMonitorPayload;
    const { id } = await context.params;
    const canPersist = Boolean(auth.supabase && !auth.localMode);

    let stored: Awaited<ReturnType<typeof getMonitor>> = null;
    if (canPersist) {
      stored = await getMonitor(auth.supabase!, auth.user.id, id);
    }

    const requirement = body.requirement?.trim() || stored?.requirement?.trim();
    if (!requirement) {
      return NextResponse.json(
        { error: "Monitor not found. Refresh the page and try again." },
        { status: 404 },
      );
    }

    if (canPersist && !stored) {
      try {
        stored = await createMonitor(auth.supabase!, auth.user.id, {
          id,
          requirement,
          category: body.category ?? "any",
          minimum_severity: body.minimumSeverity ?? "medium",
          keywords: body.keywords ?? [],
          target_url: body.targetUrl ?? null,
          active: true,
          search_query: body.searchQuery?.trim() ?? null,
          plain_summary: null,
        });
      } catch (error) {
        console.warn("Monitor upsert on check skipped", error);
      }
    }

    const monitor = {
      id,
      requirement,
      category: body.category ?? stored?.category ?? "any",
      minimum_severity: body.minimumSeverity ?? stored?.minimum_severity ?? "medium",
      keywords: body.keywords ?? stored?.keywords ?? [],
      target_url: body.targetUrl ?? stored?.target_url ?? null,
    };

    const result = await runMonitorCheck(monitor, {
      supabase: canPersist ? auth.supabase! : undefined,
      userId: auth.user.id,
      persist: canPersist,
      workspace: body.workspace,
      searchQuery: body.searchQuery?.trim() ?? stored?.search_query ?? undefined,
      targetUrl: body.targetUrl ?? monitor.target_url,
    });

    return NextResponse.json({
      provider: result.provider,
      searchQuery: result.searchQuery,
      matchedCount: result.matchedCount,
      signalCount: result.signalCount,
      signals: result.signals,
      analysis: result.analysis,
      report: result.report,
      detectedChanges: result.detectedChanges,
      evidencePreview: result.evidencePreview,
    });
  } catch (error) {
    console.error("Monitor check failed", error);
    const message = error instanceof Error ? error.message : "Monitor check failed.";
    const status = monitorCheckErrorStatus(error);
    if (/401|403|signed in|unauthorized/i.test(message)) {
      return NextResponse.json(
        { error: "Sign in required for live monitor checks." },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: message }, { status });
  }
}
