import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DetectedChange,
  ExecutiveIntelligenceReport,
  MonitorTimelineEvent,
  PageSnapshot,
} from "@/types/intelligence";

export type MonitorCheckState = {
  search_query?: string | null;
  plain_summary?: string | null;
  last_matched_count?: number;
  last_signal_count?: number;
  last_summary?: string | null;
  last_search_query?: string | null;
  last_match_title?: string | null;
  last_provider?: string | null;
  last_checked_at?: string;
};

export async function updateMonitorCheckState(
  supabase: SupabaseClient,
  userId: string,
  monitorId: string,
  state: MonitorCheckState,
) {
  const { error } = await supabase
    .from("monitors")
    .update({
      ...state,
      updated_at: new Date().toISOString(),
    })
    .eq("id", monitorId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function appendTimelineEventDb(
  supabase: SupabaseClient,
  userId: string,
  event: Omit<MonitorTimelineEvent, "id" | "timestamp"> & { timestamp?: string },
) {
  const { data, error } = await supabase
    .from("monitor_timeline_events")
    .insert({
      user_id: userId,
      monitor_id: event.monitorId ?? null,
      event_type: event.type,
      summary: event.summary,
      severity: event.severity ?? null,
      monitor_requirement: event.monitorRequirement ?? null,
      change_id: event.changeId ?? null,
      report_id: event.reportId ?? null,
      metadata: event.metadata ?? {},
      created_at: event.timestamp ?? new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to save timeline event.");

  return mapTimelineRow(data);
}

export async function listTimelineEvents(supabase: SupabaseClient, userId: string, limit = 100) {
  const { data, error } = await supabase
    .from("monitor_timeline_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTimelineRow);
}

export async function saveDetectedChangesDb(
  supabase: SupabaseClient,
  userId: string,
  changes: DetectedChange[],
) {
  if (!changes.length) return [];

  const rows = changes.map((change) => ({
    id: change.id,
    user_id: userId,
    monitor_id: change.monitorId ?? null,
    field: change.field,
    old_value: change.oldValue,
    new_value: change.newValue,
    source_url: change.sourceUrl,
    impact: change.impact,
    severity: change.severity,
    category: change.category,
    detected_at: change.detectedAt,
  }));

  const { data, error } = await supabase
    .from("monitor_detected_changes")
    .upsert(rows, { onConflict: "id" })
    .select("*");

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapChangeRow);
}

export async function listDetectedChanges(supabase: SupabaseClient, userId: string, limit = 50) {
  const { data, error } = await supabase
    .from("monitor_detected_changes")
    .select("*")
    .eq("user_id", userId)
    .order("detected_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapChangeRow);
}

export async function savePageSnapshotDb(
  supabase: SupabaseClient,
  userId: string,
  snapshot: PageSnapshot,
) {
  const { data, error } = await supabase
    .from("monitor_page_snapshots")
    .insert({
      id: snapshot.id,
      user_id: userId,
      monitor_id: snapshot.monitorId ?? null,
      url: snapshot.url,
      content_hash: snapshot.contentHash,
      fields: snapshot.fields,
      raw_excerpt: snapshot.rawExcerpt ?? null,
      bright_data_mode: snapshot.brightDataMode ?? null,
      collected_at: snapshot.collectedAt,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to save page snapshot.");
  return mapSnapshotRow(data);
}

export async function getLatestPageSnapshot(
  supabase: SupabaseClient,
  userId: string,
  monitorId: string,
  url: string,
) {
  const { data, error } = await supabase
    .from("monitor_page_snapshots")
    .select("*")
    .eq("user_id", userId)
    .eq("monitor_id", monitorId)
    .eq("url", url)
    .order("collected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapSnapshotRow(data) : null;
}

export async function getLatestReportsByMonitor(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, ExecutiveIntelligenceReport>> {
  const { data, error } = await supabase
    .from("intelligence_reports")
    .select("*")
    .eq("user_id", userId)
    .not("monitor_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  const map: Record<string, ExecutiveIntelligenceReport> = {};
  for (const row of data ?? []) {
    const monitorId = row.monitor_id as string;
    if (!monitorId || map[monitorId]) continue;
    map[monitorId] = row.report as ExecutiveIntelligenceReport;
  }
  return map;
}

function mapTimelineRow(row: Record<string, unknown>): MonitorTimelineEvent {
  return {
    id: String(row.id),
    type: row.event_type as MonitorTimelineEvent["type"],
    timestamp: String(row.created_at),
    monitorId: row.monitor_id ? String(row.monitor_id) : undefined,
    monitorRequirement: row.monitor_requirement ? String(row.monitor_requirement) : undefined,
    summary: String(row.summary),
    severity: row.severity ? (String(row.severity) as MonitorTimelineEvent["severity"]) : undefined,
    changeId: row.change_id ? String(row.change_id) : undefined,
    reportId: row.report_id ? String(row.report_id) : undefined,
    metadata: (row.metadata as Record<string, string>) ?? {},
  };
}

function mapChangeRow(row: Record<string, unknown>): DetectedChange {
  return {
    id: String(row.id),
    monitorId: row.monitor_id ? String(row.monitor_id) : undefined,
    field: String(row.field),
    oldValue: String(row.old_value),
    newValue: String(row.new_value),
    sourceUrl: String(row.source_url),
    impact: String(row.impact),
    severity: String(row.severity) as DetectedChange["severity"],
    category: String(row.category) as DetectedChange["category"],
    detectedAt: String(row.detected_at),
  };
}

function mapSnapshotRow(row: Record<string, unknown>): PageSnapshot {
  return {
    id: String(row.id),
    monitorId: row.monitor_id ? String(row.monitor_id) : undefined,
    url: String(row.url),
    contentHash: String(row.content_hash),
    fields: (row.fields as Record<string, string>) ?? {},
    rawExcerpt: row.raw_excerpt ? String(row.raw_excerpt) : undefined,
    brightDataMode: row.bright_data_mode
      ? (String(row.bright_data_mode) as PageSnapshot["brightDataMode"])
      : undefined,
    collectedAt: String(row.collected_at),
  };
}
