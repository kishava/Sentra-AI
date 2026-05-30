import { getSignalsForRun, saveIntelligenceRun } from "@/lib/db/intelligence";
import {
  appendTimelineEventDb,
  updateMonitorCheckState as persistMonitorCheckState,
} from "@/lib/db/monitor-workspace";
import { recordMonitorEvents, updateMonitorChecked } from "@/lib/db/monitors";
import { saveIntelligenceReport } from "@/lib/db/reports";
import { filterSignalsForMonitor } from "@/lib/monitor-match";
import {
  BrightDataCollectionError,
  BrightDataNotConfiguredError,
} from "@/lib/bright-data/config";
import { enrichQueryWithWorkspace, type WorkspaceContext } from "@/lib/gtm/workspace-context";
import { planGtmCollection } from "@/lib/bright-data/router";
import { createExecutiveReport } from "@/services/intelligence-report";
import { runChangeDetection } from "@/services/change-detection";
import { runChangeDetectionWithDb } from "@/services/change-detection-db";
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
  detectedChanges: Array<{
    id: string;
    field: string;
    oldValue: string;
    newValue: string;
    sourceUrl: string;
    severity: Severity;
  }>;
  evidencePreview: string;
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

  const canPersist = Boolean(options?.persist && options.supabase && options.userId);
  const changeResult = canPersist
    ? await runChangeDetectionWithDb({
        supabase: options!.supabase!,
        userId: options!.userId!,
        monitorId: monitor.id,
        evidence: webEvidence.evidence,
        targetUrl: monitor.target_url ?? plan.targetUrl,
      })
    : runChangeDetection({
        monitorId: monitor.id,
        evidence: webEvidence.evidence,
        targetUrl: monitor.target_url ?? plan.targetUrl,
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
  if (canPersist) {
    try {
      const runId = await saveIntelligenceRun(options!.supabase!, options!.userId!, {
        query: monitor.requirement,
        provider: webEvidence.provider,
        evidencePreview: analysis.summary,
        analysis: { ...analysis, signals: mergedSignals },
      });
      savedSignals = await getSignalsForRun(options!.supabase!, options!.userId!, runId);
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

  if (canPersist) {
    try {
      await recordMonitorEvents(options!.supabase!, options!.userId!, monitor.id, matched);
      await updateMonitorChecked(options!.supabase!, options!.userId!, monitor.id);
      await persistMonitorCheckState(options!.supabase!, options!.userId!, monitor.id, {
        last_matched_count: matched.length,
        last_signal_count: mergedSignals.length,
        last_summary: analysis.summary?.slice(0, 280) ?? null,
        last_search_query: collectionQuery,
        last_match_title: matched[0]?.title ?? mergedSignals[0]?.title ?? null,
        last_provider: webEvidence.provider,
        last_checked_at: new Date().toISOString(),
      });
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

  if (canPersist) {
    try {
      await saveIntelligenceReport(options!.supabase!, options!.userId!, report, monitor.id);
    } catch (error) {
      console.warn("Report persistence skipped", error);
    }

    const supabase = options!.supabase!;
    const userId = options!.userId!;

    for (const change of changeResult.changes) {
      try {
        await appendTimelineEventDb(supabase, userId, {
          type: "change_detected",
          monitorId: monitor.id,
          monitorRequirement: monitor.requirement,
          summary: `${change.field} changed from ${change.oldValue} to ${change.newValue}`,
          severity: change.severity,
          changeId: change.id,
          metadata: {
            sourceUrl: change.sourceUrl,
            oldValue: change.oldValue,
            newValue: change.newValue,
            field: change.field,
          },
        });
      } catch (error) {
        console.warn("Timeline change event skipped", error);
      }
    }

    try {
      await appendTimelineEventDb(supabase, userId, {
        type: "check_complete",
        monitorId: monitor.id,
        monitorRequirement: monitor.requirement,
        summary: `Monitor check completed — ${matched.length} match${matched.length === 1 ? "" : "es"} from ${webEvidence.provider === "bright-data" ? "live Bright Data" : "demo evidence"}.`,
        metadata: { provider: webEvidence.provider, matchedCount: String(matched.length) },
      });
    } catch (error) {
      console.warn("Timeline check event skipped", error);
    }

    for (const signal of matched) {
      try {
        await appendTimelineEventDb(supabase, userId, {
          type: "signal_matched",
          monitorId: monitor.id,
          monitorRequirement: monitor.requirement,
          summary: signal.title,
          severity: signal.severity,
        });
      } catch (error) {
        console.warn("Timeline signal event skipped", error);
      }
    }

    try {
      await appendTimelineEventDb(supabase, userId, {
        type: "report_generated",
        monitorId: monitor.id,
        monitorRequirement: monitor.requirement,
        reportId: report.id,
        summary: report.verdict,
        severity: report.riskScore >= 80 ? "critical" : report.riskScore >= 65 ? "high" : "medium",
        metadata: { riskScore: String(report.riskScore) },
      });
    } catch (error) {
      console.warn("Timeline report event skipped", error);
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
    evidencePreview: webEvidence.evidence.slice(0, 6000),
  };
}

export function monitorCheckErrorStatus(error: unknown) {
  if (error instanceof BrightDataNotConfiguredError) return 503;
  if (error instanceof BrightDataCollectionError) return 502;
  return 500;
}
