import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { getMonitor } from "@/lib/db/monitors";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensurePlatformSecrets } from "@/lib/secrets/platform-secrets";
import { monitorCheckErrorStatus, runMonitorCheck } from "@/services/monitor-check";
import type { WorkspaceContext } from "@/lib/gtm/workspace-context";
import type { Severity } from "@/types/intelligence";

export const runtime = "nodejs";

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
      if (stored) {
        monitor = stored;
      } else if (body.requirement?.trim()) {
        monitor = {
          id,
          requirement: body.requirement.trim(),
          category: body.category ?? "any",
          minimum_severity: body.minimumSeverity ?? "medium",
          keywords: body.keywords ?? [],
          target_url: body.targetUrl ?? null,
        };
      } else {
        return NextResponse.json({ error: "Monitor not found." }, { status: 404 });
      }
    }

    const result = await runMonitorCheck(monitor, {
      supabase: auth.localMode ? undefined : auth.supabase ?? undefined,
      userId: auth.user.id,
      persist: !auth.localMode && Boolean(auth.supabase),
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Monitor check failed." },
      { status: monitorCheckErrorStatus(error) },
    );
  }
}
