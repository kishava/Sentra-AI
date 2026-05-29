import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import { listActiveMonitorsDueForCronWithUsers } from "@/lib/db/monitors";
import { ensurePlatformSecrets } from "@/lib/secrets/platform-secrets";
import { getBrightDataReadiness } from "@/lib/bright-data/config";
import { runMonitorCheck } from "@/services/monitor-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured() || !getSupabaseServiceRoleKey()) {
    return NextResponse.json({ error: "Supabase is required for scheduled monitor checks." }, { status: 503 });
  }

  const readiness = getBrightDataReadiness("serp");
  if (!readiness.ready) {
    return NextResponse.json(
      { error: readiness.message, skipped: true },
      { status: 503 },
    );
  }

  try {
    await ensurePlatformSecrets();
    const admin = createAdminClient();
    const due = await listActiveMonitorsDueForCronWithUsers(admin, 6);
    const results: Array<{ monitorId: string; userId: string; matchedCount: number; provider: string }> = [];
    const errors: Array<{ monitorId: string; error: string }> = [];

    for (const monitor of due) {
      try {
        const result = await runMonitorCheck(
          {
            id: monitor.id,
            requirement: monitor.requirement,
            category: monitor.category,
            minimum_severity: monitor.minimum_severity,
            keywords: monitor.keywords,
            target_url: monitor.target_url,
          },
          {
            supabase: admin,
            userId: monitor.user_id,
            persist: true,
          },
        );
        results.push({
          monitorId: monitor.id,
          userId: monitor.user_id,
          matchedCount: result.matchedCount,
          provider: result.provider,
        });
      } catch (error) {
        errors.push({
          monitorId: monitor.id,
          error: error instanceof Error ? error.message : "Monitor check failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      checked: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    console.error("Cron monitor run failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed" },
      { status: 500 },
    );
  }
}
