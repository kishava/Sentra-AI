import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntelligenceAnalysis, IntelligenceSignal } from "@/types/intelligence";

export async function saveIntelligenceRun(
  supabase: SupabaseClient,
  userId: string,
  input: {
    query: string;
    provider: "bright-data" | "demo";
    evidencePreview: string;
    analysis: IntelligenceAnalysis;
  },
) {
  const { data: run, error: runError } = await supabase
    .from("intelligence_runs")
    .insert({
      user_id: userId,
      query: input.query,
      provider: input.provider,
      evidence_preview: input.evidencePreview.slice(0, 2000),
      analysis: input.analysis,
    })
    .select("id")
    .single();

  if (runError || !run) {
    throw new Error(runError?.message ?? "Failed to save intelligence run.");
  }

  if (input.analysis.signals.length) {
    const rows = input.analysis.signals.map((signal) => ({
      run_id: run.id,
      user_id: userId,
      title: signal.title,
      source: signal.source,
      summary: signal.summary,
      category: signal.category,
      severity: signal.severity,
      confidence: signal.confidence,
      signal_timestamp: signal.timestamp,
    }));

    const { error: signalsError } = await supabase.from("signals").insert(rows);
    if (signalsError) throw new Error(signalsError.message);
  }

  return run.id;
}

export async function getSignalsForRun(supabase: SupabaseClient, userId: string, runId: string) {
  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .eq("run_id", runId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map(
    (row): IntelligenceSignal => ({
      id: row.id,
      title: row.title,
      source: row.source,
      summary: row.summary,
      category: row.category as IntelligenceSignal["category"],
      severity: row.severity as IntelligenceSignal["severity"],
      confidence: row.confidence,
      timestamp: row.signal_timestamp,
    }),
  );
}

export async function getLatestSignals(supabase: SupabaseClient, userId: string, limit = 20) {
  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map(
    (row): IntelligenceSignal => ({
      id: row.id,
      title: row.title,
      source: row.source,
      summary: row.summary,
      category: row.category as IntelligenceSignal["category"],
      severity: row.severity as IntelligenceSignal["severity"],
      confidence: row.confidence,
      timestamp: row.signal_timestamp,
    }),
  );
}

export async function getLatestBriefing(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("intelligence_runs")
    .select("id, query, provider, analysis, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
