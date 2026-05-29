import type {
  EvidenceSource,
  ExecutiveIntelligenceReport,
  IntelligenceAnalysis,
  IntelligenceSignal,
  VerifiedClaim,
} from "@/types/intelligence";

const severityScore: Record<IntelligenceSignal["severity"], number> = {
  low: 30,
  medium: 52,
  high: 74,
  critical: 92,
};

function hostFromSource(source: string) {
  const url = source.match(/https?:\/\/[^\s)]+/i)?.[0];
  if (!url) return undefined;

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function evidenceUrlFromRaw(raw: string, index: number) {
  const urls = Array.from(raw.matchAll(/https?:\/\/[^\s"',)\\]+/gi)).map((match) => match[0]);
  return urls[index];
}

function buildEvidenceSources(
  signals: IntelligenceSignal[],
  evidence: string,
  provider: ExecutiveIntelligenceReport["provider"],
): EvidenceSource[] {
  const sourceMap = new Map<string, EvidenceSource>();

  signals.forEach((signal, index) => {
    const url = evidenceUrlFromRaw(evidence, index);
    const publisher = hostFromSource(signal.source) ?? (provider === "bright-data" ? "Collected web evidence" : signal.source);
    const id = `source-${index + 1}`;
    const key = `${publisher}-${url ?? signal.source}`;
    if (sourceMap.has(key)) return;

    sourceMap.set(key, {
      id,
      title: signal.source,
      url,
      publisher,
      freshness: signal.timestamp || "latest collected run",
      reliability: provider === "bright-data" ? Math.min(96, Math.round(signal.confidence * 100 + 5)) : 66,
      claimSupported: signal.title,
    });
  });

  if (!sourceMap.size) {
    sourceMap.set("demo-evidence", {
      id: "source-1",
      title: provider === "bright-data" ? "Collected web evidence" : "Demo intelligence stream",
      publisher: provider === "bright-data" ? "Bright Data" : "Sentra demo dataset",
      freshness: "current run",
      reliability: provider === "bright-data" ? 82 : 58,
      claimSupported: "Monitor requirement requires further corroboration.",
    });
  }

  return Array.from(sourceMap.values()).slice(0, 6);
}

function buildVerifiedClaims(signals: IntelligenceSignal[], sources: EvidenceSource[]): VerifiedClaim[] {
  if (!signals.length) {
    return [
      {
        id: "claim-1",
        claim: "No matching signal crossed the configured monitor threshold.",
        status: "partial",
        confidence: 52,
        sourceIds: sources.slice(0, 1).map((source) => source.id),
      },
    ];
  }

  return signals.slice(0, 5).map((signal, index) => ({
    id: `claim-${index + 1}`,
    claim: `${signal.title}: ${signal.summary}`,
    status: signal.confidence >= 0.86 ? "verified" : signal.confidence >= 0.68 ? "partial" : "unsupported",
    confidence: Math.round(signal.confidence * 100),
    sourceIds: [sources[index % sources.length]?.id ?? sources[0]?.id].filter(Boolean),
  }));
}

export function createExecutiveReport({
  requirement,
  analysis,
  matchedSignals,
  evidence,
  provider,
}: {
  requirement: string;
  analysis: IntelligenceAnalysis;
  matchedSignals: IntelligenceSignal[];
  evidence: string;
  provider: ExecutiveIntelligenceReport["provider"];
}): ExecutiveIntelligenceReport {
  const signals = matchedSignals.length ? matchedSignals : analysis.signals;
  const sources = buildEvidenceSources(signals, evidence, provider);
  const claims = buildVerifiedClaims(matchedSignals, sources);
  const topSignal = matchedSignals[0] ?? analysis.signals[0];
  const riskScore = Math.max(
    Math.round((analysis.confidenceScore || 0.65) * 100),
    topSignal ? severityScore[topSignal.severity] : 42,
  );
  const confidence = Math.round(
    Math.min(0.98, Math.max(0.45, analysis.confidenceScore || topSignal?.confidence || 0.62)) * 100,
  );
  const unsupportedCount = claims.filter((claim) => claim.status === "unsupported").length;
  const partialCount = claims.filter((claim) => claim.status === "partial").length;
  const hallucinationRisk =
    provider === "demo" || unsupportedCount ? "high" : partialCount > claims.length / 2 ? "medium" : "low";

  return {
    id: crypto.randomUUID(),
    monitorRequirement: requirement,
    generatedAt: new Date().toISOString(),
    provider,
    verdict: matchedSignals.length
      ? `${matchedSignals.length} monitored signal${matchedSignals.length === 1 ? "" : "s"} require review`
      : "No monitored signal crossed the action threshold",
    riskScore,
    confidence,
    situation: matchedSignals.length
      ? `${analysis.summary} The strongest matching signal is "${topSignal.title}".`
      : `${analysis.summary} No collected signal fully matched the configured threshold yet.`,
    impact: matchedSignals.length
      ? `Potential impact is concentrated around ${topSignal.category} with ${topSignal.severity} severity.`
      : "Impact remains watchlist-level until stronger corroborated evidence appears.",
    actionPlan: (analysis.recommendations.length ? analysis.recommendations : [
      "Validate the collected evidence with a human owner.",
      "Keep the monitor active until the signal stabilizes.",
      "Prepare a stakeholder update if the risk score rises.",
    ]).slice(0, 5),
    watchItems: [
      ...analysis.risks.slice(0, 3),
      ...analysis.opportunities.slice(0, 2).map((item) => `Opportunity: ${item}`),
    ].slice(0, 5),
    evidenceSources: sources,
    verifiedClaims: claims,
    observedFacts: matchedSignals.slice(0, 4).map((signal) => signal.summary),
    forecasts: analysis.opportunities.slice(0, 3),
    hallucinationRisk,
  };
}
