import { getSignalsForRun, saveIntelligenceRun } from "@/lib/db/intelligence";
import { recordMonitorEvents, updateMonitorChecked } from "@/lib/db/monitors";
import { saveIntelligenceReport } from "@/lib/db/reports";
import { filterSignalsForMonitor } from "@/lib/monitor-match";
import {
  BrightDataCollectionError,
  BrightDataNotConfiguredError,
} from "@/lib/bright-data/config";
import { collectWebIntelligence } from "@/services/bright-data";
import { createExecutiveReport } from "@/services/intelligence-report";
import { generateEnterpriseAnalysis } from "@/services/openai";
import type { Severity } from "@/types/intelligence";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MonitorCheckInput = {
  id: string;
  requirement: string;
  category: string;
  minimum_severity: Severity;
  keywords: string[];
  target_url: string | null;
};

export type MonitorCheckResult = {
  provider: "bright-data" | "demo";
  matchedCount: number;
  signals: ReturnType<typeof filterSignalsForMonitor>;
  analysis: Awaited<ReturnType<typeof generateEnterpriseAnalysis>>;
  report: ReturnType<typeof createExecutiveReport>;
};

export async function runMonitorCheck(
  monitor: MonitorCheckInput,
  options?: {
    supabase?: SupabaseClient;
    userId?: string;
    persist?: boolean;
  },
): Promise<MonitorCheckResult> {
  const webEvidence = await collectWebIntelligence({
    query: monitor.requirement,
    targetUrl: monitor.target_url ?? undefined,
    mode: monitor.target_url ? "unlocker" : "serp",
  });

  const analysis = await generateEnterpriseAnalysis(monitor.requirement, webEvidence.evidence);

  let savedSignals = analysis.signals;
  if (options?.persist && options.supabase && options.userId) {
    try {
      const runId = await saveIntelligenceRun(options.supabase, options.userId, {
        query: monitor.requirement,
        provider: webEvidence.provider,
        evidencePreview: analysis.summary,
        analysis,
      });
      savedSignals = await getSignalsForRun(options.supabase, options.userId, runId);
    } catch (error) {
      console.warn("Monitor run persistence skipped", error);
    }
  }

  const matched = filterSignalsForMonitor(
    {
      requirement: monitor.requirement,
      category: monitor.category as "any",
      minimumSeverity: monitor.minimum_severity,
      keywords: monitor.keywords,
    },
    savedSignals.length ? savedSignals : analysis.signals,
  );

  if (options?.persist && options.supabase && options.userId) {
    try {
      await recordMonitorEvents(options.supabase, options.userId, monitor.id, matched);
      await updateMonitorChecked(options.supabase, options.userId, monitor.id);
    } catch (error) {
      console.warn("Monitor event persistence skipped", error);
    }
  }

  const report = createExecutiveReport({
    requirement: monitor.requirement,
    analysis,
    matchedSignals: matched,
    evidence: webEvidence.evidence,
    provider: webEvidence.provider,
  });

  if (options?.persist && options.supabase && options.userId) {
    try {
      await saveIntelligenceReport(options.supabase, options.userId, report, monitor.id);
    } catch (error) {
      console.warn("Report persistence skipped", error);
    }
  }

  return {
    provider: webEvidence.provider,
    matchedCount: matched.length,
    signals: matched,
    analysis,
    report,
  };
}

export function monitorCheckErrorStatus(error: unknown) {
  if (error instanceof BrightDataNotConfiguredError) return 503;
  if (error instanceof BrightDataCollectionError) return 502;
  return 500;
}
