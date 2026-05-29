import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExecutiveIntelligenceReport } from "@/types/intelligence";

export type DbIntelligenceReport = {
  id: string;
  monitor_id: string | null;
  title: string;
  risk_score: number;
  confidence: number;
  hallucination_risk: ExecutiveIntelligenceReport["hallucinationRisk"];
  provider: ExecutiveIntelligenceReport["provider"];
  report: ExecutiveIntelligenceReport;
  created_at: string;
};

export async function saveIntelligenceReport(
  supabase: SupabaseClient,
  userId: string,
  report: ExecutiveIntelligenceReport,
  monitorId?: string,
) {
  const { data, error } = await supabase
    .from("intelligence_reports")
    .insert({
      user_id: userId,
      monitor_id: monitorId ?? null,
      title: report.verdict,
      risk_score: report.riskScore,
      confidence: report.confidence,
      hallucination_risk: report.hallucinationRisk,
      provider: report.provider,
      report,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to save report.");
  return data as DbIntelligenceReport;
}

export async function listIntelligenceReports(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("intelligence_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as DbIntelligenceReport[];
}
