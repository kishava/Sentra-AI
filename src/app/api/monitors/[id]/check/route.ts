import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { getMonitor } from "@/lib/db/monitors";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensurePlatformSecrets } from "@/lib/secrets/platform-secrets";
import { monitorCheckErrorStatus, runMonitorCheck } from "@/services/monitor-check";
import type { WorkspaceContext } from "@/lib/gtm/workspace-context";
import type { Severity } from "@/types/intelligence";

export const runtime = "nodejs";
export const maxDuration = 120;

type LocalMonitorPayload = {
  requirement?: string;
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

    let stored: Awaited<ReturnType<typeof getMonitor>> = null;
    if (auth.supabase && !auth.localMode) {
      stored = await getMonitor(auth.supabase, auth.user.id, id);
    }

    const requirement = body.requirement?.trim() || stored?.requirement?.trim();
    if (!requirement) {
      return NextResponse.json(
        { error: "Monitor not found. Refresh the page and try again." },
        { status: 404 },
      );
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
      supabase: stored && auth.supabase ? auth.supabase : undefined,
      userId: auth.user.id,
      persist: Boolean(stored && auth.supabase),
      workspace: body.workspace,
    });

    return NextResponse.json({
      provider: result.provider,
      matchedCount: result.matchedCount,
      signals: result.signals,
      analysis: result.analysis,
      report: result.report,
      detectedChanges: result.detectedChanges,
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
