import { plainEnglishMonitorSummary } from "@/lib/monitor-history";
import type { MonitorIntent, Severity } from "@/types/intelligence";

function extractTargetUrl(input: string) {
  const match = input.match(/https?:\/\/[^\s<>()\]]+/i)?.[0]?.replace(/[.,;!?]+$/, "");
  if (!match) return undefined;
  try {
    return new URL(match).toString();
  } catch {
    return undefined;
  }
}

export function buildMonitorSearchQuery(requirement: string, keywords: string[]) {
  const meaningful = keywords.filter((token) => token.length >= 2).slice(0, 6);
  if (meaningful.length >= 2) return meaningful.join(" ");
  const cleaned = requirement
    .replace(/^alert me when\s+/i, "")
    .replace(/^notify me when\s+/i, "")
    .replace(/^watch\s+/i, "")
    .replace(/^monitor\s+/i, "")
    .trim();
  return cleaned.slice(0, 120) || requirement.trim().slice(0, 120);
}

/** Client-safe fallback when monitor-intent API is unavailable. */
export function inferMonitorIntentHeuristically(input: string): MonitorIntent {
  const lower = input.toLowerCase();
  const category = lower.match(/price|pricing|discount|incentive|lease|cost|billing|stock|share/)
    ? "pricing"
    : lower.match(/hire|hiring|role|jobs|recruit/)
      ? "hiring"
      : lower.match(/sentiment|complaint|social|negative|positive|review/)
        ? "sentiment"
        : lower.match(/competitor|launch|product|rival|battlecard/)
          ? "competitor"
          : lower.match(/risk|regulat|lawsuit|outage|security|critical/)
            ? "risk"
            : lower.match(/market|trend|demand|industry/)
              ? "market"
              : "any";
  const minimumSeverity: Severity = lower.match(/urgent|critical|immediate|severe|crisis/)
    ? "critical"
    : lower.match(/important|major|high|escalate/)
      ? "high"
      : lower.match(/minor|low|FYI/i)
        ? "low"
        : "medium";
  const keywords = Array.from(
    new Set(
      lower
        .split(/[^a-z0-9]+/i)
        .filter((token) => token.length >= 3)
        .slice(0, 8),
    ),
  );

  const normalizedRequirement = input.trim();
  const searchQuery = buildMonitorSearchQuery(normalizedRequirement, keywords);
  return {
    normalizedRequirement,
    searchQuery,
    targetUrl: extractTargetUrl(input),
    category,
    minimumSeverity,
    keywords,
    rationale: "Interpreted from your wording — adjust category below if needed.",
    plainSummary: plainEnglishMonitorSummary({
      requirement: input,
      normalizedRequirement,
      category,
      minimumSeverity,
    }),
    confidence: 0.58,
    provider: "heuristic",
  };
}
