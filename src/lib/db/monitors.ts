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
  monitor: Omit<DbMonitor, "id" | "last_checked_at">,
) {
  const { data, error } = await supabase
    .from("monitors")
    .insert({
      user_id: userId,
      requirement: monitor.requirement,
      category: monitor.category,
      minimum_severity: monitor.minimum_severity,
      keywords: monitor.keywords,
      target_url: monitor.target_url,
      active: monitor.active,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create monitor.");
  return data as DbMonitor;
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
