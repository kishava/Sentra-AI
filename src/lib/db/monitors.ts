import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntelligenceSignal, Severity } from "@/types/intelligence";

export type DbMonitor = {
  id: string;
  requirement: string;
  category: string;
  minimum_severity: Severity;
  keywords: string[];
  target_url: string | null;
  active: boolean;
  last_checked_at: string | null;
  search_query?: string | null;
  plain_summary?: string | null;
  last_matched_count?: number;
  last_signal_count?: number;
  last_summary?: string | null;
  last_search_query?: string | null;
  last_match_title?: string | null;
  last_provider?: string | null;
};

export async function listMonitors(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("monitors")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DbMonitor[];
}

export async function createMonitor(
  supabase: SupabaseClient,
  userId: string,
  monitor: Omit<DbMonitor, "id" | "last_checked_at"> & {
    id?: string;
    search_query?: string | null;
    plain_summary?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("monitors")
    .insert({
      ...(monitor.id ? { id: monitor.id } : {}),
      user_id: userId,
      requirement: monitor.requirement,
      category: monitor.category,
      minimum_severity: monitor.minimum_severity,
      keywords: monitor.keywords,
      target_url: monitor.target_url,
      active: monitor.active,
      search_query: monitor.search_query ?? null,
      plain_summary: monitor.plain_summary ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create monitor.");
  return data as DbMonitor;
}

export async function updateMonitorActive(
  supabase: SupabaseClient,
  userId: string,
  monitorId: string,
  active: boolean,
) {
  const { error } = await supabase
    .from("monitors")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", monitorId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function deleteMonitor(supabase: SupabaseClient, userId: string, monitorId: string) {
  const { error } = await supabase.from("monitors").delete().eq("id", monitorId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function getMonitor(supabase: SupabaseClient, userId: string, monitorId: string) {
  const { data, error } = await supabase
    .from("monitors")
    .select("*")
    .eq("id", monitorId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as DbMonitor | null;
}

export async function recordMonitorEvents(
  supabase: SupabaseClient,
  userId: string,
  monitorId: string,
  signals: IntelligenceSignal[],
) {
  if (!signals.length) return [];

  const rows = signals.map((signal) => ({
    monitor_id: monitorId,
    signal_id: signal.id,
    user_id: userId,
  }));

  const { data, error } = await supabase
    .from("monitor_events")
    .upsert(rows, { onConflict: "monitor_id,signal_id", ignoreDuplicates: true })
    .select("id, signal_id, seen_at");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateMonitorChecked(supabase: SupabaseClient, userId: string, monitorId: string) {
  await supabase
    .from("monitors")
    .update({ last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", monitorId)
    .eq("user_id", userId);
}

const CRON_MIN_INTERVAL_MS = 30 * 60 * 1000;

export type DbMonitorWithUser = DbMonitor & { user_id: string };

export async function listActiveMonitorsDueForCronWithUsers(supabase: SupabaseClient, limit = 8) {
  const { data, error } = await supabase
    .from("monitors")
    .select("*, user_id")
    .eq("active", true)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(50);

  if (error) throw new Error(error.message);

  const now = Date.now();
  const due = (data ?? []).filter((row) => {
    const last = row.last_checked_at as string | null;
    if (!last) return true;
    return now - new Date(last).getTime() >= CRON_MIN_INTERVAL_MS;
  });

  return due.slice(0, limit) as DbMonitorWithUser[];
}
