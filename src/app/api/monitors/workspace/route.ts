import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { getLatestSignals } from "@/lib/db/intelligence";
import {
  getLatestReportsByMonitor,
  listDetectedChanges,
  listTimelineEvents,
} from "@/lib/db/monitor-workspace";
import { listMonitors } from "@/lib/db/monitors";
import type { Severity } from "@/types/intelligence";

export const runtime = "nodejs";

function mapMonitor(row: Awaited<ReturnType<typeof listMonitors>>[number]) {
  return {
    id: row.id,
    requirement: row.requirement,
    searchQuery: row.search_query ?? undefined,
    plainSummary: row.plain_summary ?? undefined,
    category: row.category,
    minimumSeverity: row.minimum_severity as Severity,
    keywords: row.keywords ?? [],
    targetUrl: row.target_url ?? undefined,
    active: row.active,
    createdAt: row.last_checked_at ?? new Date().toISOString(),
    lastCheckedAt: row.last_checked_at ?? undefined,
    lastMatchedCount: row.last_matched_count ?? 0,
    lastSignalCount: row.last_signal_count ?? 0,
    lastSummary: row.last_summary ?? undefined,
    lastSearchQuery: row.last_search_query ?? undefined,
    lastMatchTitle: row.last_match_title ?? undefined,
    lastProvider: row.last_provider ?? undefined,
    alertedSignalIds: [] as string[],
  };
}

export async function GET() {
  try {
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    if (auth.localMode || !auth.supabase) {
      return NextResponse.json({ localMode: true });
    }

    const [monitors, reportsByMonitorId, timeline, detectedChanges, signals] = await Promise.all([
      listMonitors(auth.supabase, auth.user.id),
      getLatestReportsByMonitor(auth.supabase, auth.user.id),
      listTimelineEvents(auth.supabase, auth.user.id),
      listDetectedChanges(auth.supabase, auth.user.id),
      getLatestSignals(auth.supabase, auth.user.id, 50),
    ]);

    return NextResponse.json({
      monitors: monitors.map(mapMonitor),
      reportsByMonitorId,
      timeline,
      detectedChanges,
      signals,
    });
  } catch (error) {
    console.error("Monitor workspace load failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load monitor workspace." },
      { status: 500 },
    );
  }
}
