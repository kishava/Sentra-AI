import { getSignalsForRun, saveIntelligenceRun } from "@/lib/db/intelligence";
import { recordMonitorEvents, updateMonitorChecked } from "@/lib/db/monitors";
import { saveIntelligenceReport } from "@/lib/db/reports";
import {
  recordChangeDetected,
  recordCheckComplete,
  recordReportGenerated,
} from "@/lib/monitor-timeline";
import { filterSignalsForMonitor } from "@/lib/monitor-match";
import {
  BrightDataCollectionError,
  BrightDataNotConfiguredError,
} from "@/lib/bright-data/config";
import { enrichQueryWithWorkspace, type WorkspaceContext } from "@/lib/gtm/workspace-context";
import { planGtmCollection } from "@/lib/bright-data/router";
import { createExecutiveReport } from "@/services/intelligence-report";
import { runChangeDetection } from "@/services/change-detection";
import { bundleToLegacyEvidence, collectFromPlan } from "@/services/gtm-research";
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
  searchQuery: string;
  matchedCount: number;
  signalCount: number;
  signals: ReturnType<typeof filterSignalsForMonitor>;
  analysis: Awaited<ReturnType<typeof generateEnterpriseAnalysis>>;
  report: ReturnType<typeof createExecutiveReport>;
  detectedChanges: ReturnType<typeof runChangeDetection>["changes"];
};

export async function runMonitorCheck(
  monitor: MonitorCheckInput,
  options?: {
    supabase?: SupabaseClient;
    userId?: string;
    persist?: boolean;
    workspace?: WorkspaceContext | null;
    searchQuery?: string;
    targetUrl?: string | null;
  },
): Promise<MonitorCheckResult> {
  const collectionQuery = options?.searchQuery?.trim() || monitor.requirement;
  const targetUrl = options?.targetUrl ?? monitor.target_url;
  const enrichedRequirement = enrichQueryWithWorkspace(monitor.requirement, options?.workspace);
  const enrichedSearchQuery = enrichQueryWithWorkspace(collectionQuery, options?.workspace);
  const plan = planGtmCollection(
    targetUrl ? `${enrichedSearchQuery} ${targetUrl}` : enrichedSearchQuery,
    { preferMcp: true },
  );

  const bundle = await collectFromPlan(plan, { multiSource: true });
  const webEvidence = bundleToLegacyEvidence(bundle);

  const changeResult = runChangeDetection({
    monitorId: monitor.id,
    evidence: webEvidence.evidence,
    targetUrl: monitor.target_url ?? plan.targetUrl,
    userId: options?.userId,
  });

  const analysis = await generateEnterpriseAnalysis(
    enrichedRequirement,
    webEvidence.evidence,
    options?.workspace,
  );

  const mergedSignals = [
    ...changeResult.changeSignals,
    ...analysis.signals.filter(
      (signal) => !changeResult.changeSignals.some((change) => change.title.includes(signal.title.slice(0, 20))),
    ),
  ];

  let savedSignals = mergedSignals;
  if (options?.persist && options.supabase && options.userId) {
    try {
      const runId = await saveIntelligenceRun(options.supabase, options.userId, {
        query: monitor.requirement,
        provider: webEvidence.provider,
        evidencePreview: analysis.summary,
        analysis: { ...analysis, signals: mergedSignals },
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
    savedSignals.length ? savedSignals : mergedSignals,
  );

  if (options?.persist && options.supabase && options.userId) {
    try {
      await recordMonitorEvents(options.supabase, options.userId, monitor.id, matched);
      await updateMonitorChecked(options.supabase, options.userId, monitor.id);
    } catch (error) {
      console.warn("Monitor event persistence skipped", error);
    }
  }

  const collectionMeta = {
    collectedAt: changeResult.snapshot.collectedAt,
    brightDataMode: changeResult.snapshot.brightDataMode,
  };

  const report = createExecutiveReport({
    requirement: monitor.requirement,
    analysis: { ...analysis, signals: mergedSignals },
    matchedSignals: matched,
    evidence: webEvidence.evidence,
    provider: webEvidence.provider,
    detectedChanges: changeResult.changes,
    collectionMeta,
  });

  changeResult.changes.forEach((change) => {
    recordChangeDetected({
      monitorId: monitor.id,
      monitorRequirement: monitor.requirement,
      field: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
      sourceUrl: change.sourceUrl,
      severity: change.severity,
      changeId: change.id,
      userId: options?.userId,
    });
  });

  recordCheckComplete({
    monitorId: monitor.id,
    monitorRequirement: monitor.requirement,
    matchedCount: matched.length,
    provider: webEvidence.provider,
    userId: options?.userId,
  });

  recordReportGenerated({
    monitorId: monitor.id,
    monitorRequirement: monitor.requirement,
    reportId: report.id,
    verdict: report.verdict,
    riskScore: report.riskScore,
    userId: options?.userId,
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
    searchQuery: collectionQuery,
    matchedCount: matched.length,
    signalCount: mergedSignals.length,
    signals: matched,
    analysis: { ...analysis, signals: mergedSignals },
    report,
    detectedChanges: changeResult.changes,
  };
}

export function monitorCheckErrorStatus(error: unknown) {
  if (error instanceof BrightDataNotConfiguredError) return 503;
  if (error instanceof BrightDataCollectionError) return 502;
  return 500;
}
