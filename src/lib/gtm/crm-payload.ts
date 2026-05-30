import type { ExecutiveIntelligenceReport, IntelligenceAnalysis } from "@/types/intelligence";
import type { WorkspaceContext } from "@/lib/gtm/workspace-context";

export type CrmExportPayload = {
  source: "sentra-ai";
  event: "gtm_intelligence_export";
  exportedAt: string;
  account: {
    companyName?: string;
    industry?: string;
    competitors?: string[];
    markets?: string[];
  };
  intelligence: {
    requirement?: string;
    verdict?: string;
    riskScore?: number;
    confidence?: number;
    situation?: string;
    impact?: string;
    actionPlan?: string[];
    watchItems?: string[];
    summary?: string;
    risks?: string[];
    opportunities?: string[];
    recommendations?: string[];
    evidenceUrls?: string[];
  };
  signals?: Array<{
    title: string;
    category: string;
    severity: string;
    summary: string;
    source: string;
  }>;
};

function splitList(value?: string) {
  if (!value?.trim()) return [];
  return value
    .split(/[,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildCrmExportPayload(options: {
  workspace?: WorkspaceContext | null;
  report?: ExecutiveIntelligenceReport;
  analysis?: IntelligenceAnalysis;
  requirement?: string;
}): CrmExportPayload {
  const { workspace, report, analysis, requirement } = options;

  return {
    source: "sentra-ai",
    event: "gtm_intelligence_export",
    exportedAt: new Date().toISOString(),
    account: {
      companyName: workspace?.companyName?.trim() || undefined,
      industry: workspace?.industry?.trim() || undefined,
      competitors: splitList(workspace?.competitors),
      markets: splitList(workspace?.markets),
    },
    intelligence: {
      requirement: report?.monitorRequirement ?? requirement,
      verdict: report?.verdict,
      riskScore: report?.riskScore,
      confidence: report?.confidence ?? (analysis ? Math.round(analysis.confidenceScore * 100) : undefined),
      situation: report?.situation ?? analysis?.summary,
      impact: report?.impact,
      actionPlan: report?.actionPlan,
      watchItems: report?.watchItems,
      summary: analysis?.summary,
      risks: analysis?.risks ?? report?.observedFacts,
      opportunities: analysis?.opportunities,
      recommendations: analysis?.recommendations ?? report?.actionPlan,
      evidenceUrls: report?.evidenceSources?.map((source) => source.url).filter(Boolean) as string[] | undefined,
    },
    signals: analysis?.signals?.map((signal) => ({
      title: signal.title,
      category: signal.category,
      severity: signal.severity,
      summary: signal.summary,
      source: signal.source,
    })),
  };
}
