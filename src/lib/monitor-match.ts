import type { IntelligenceSignal, Severity } from "@/types/intelligence";

const severityRank: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export type MonitorRule = {
  requirement: string;
  category: "any" | IntelligenceSignal["category"];
  minimumSeverity: Severity;
  keywords?: string[];
};

const STOP_WORDS = new Set([
  "about",
  "alert",
  "any",
  "change",
  "changes",
  "for",
  "from",
  "into",
  "monitor",
  "price",
  "pricing",
  "stock",
  "tell",
  "the",
  "watch",
  "when",
  "with",
  "your",
]);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function tokenMatches(haystack: string, token: string) {
  return new RegExp(`\\b${escapeRegExp(token)}\\b`, "i").test(haystack);
}

export function matchesMonitor(monitor: MonitorRule, signal: IntelligenceSignal) {
  if (monitor.category !== "any" && signal.category !== monitor.category) return false;
  if (severityRank[signal.severity] < severityRank[monitor.minimumSeverity]) return false;

  const haystack = `${signal.title} ${signal.summary} ${signal.source}`.toLowerCase();
  const requirement = monitor.requirement.trim().toLowerCase();
  if (requirement.length >= 8 && haystack.includes(requirement.slice(0, Math.min(requirement.length, 48)))) {
    return true;
  }

  const tokens = monitor.keywords?.length
    ? monitor.keywords.map((token) => token.toLowerCase()).filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
    : tokenize(monitor.requirement);

  if (!tokens.length) return false;

  const matchedTokens = tokens.filter((token) => tokenMatches(haystack, token));
  if (tokens.length === 1) return matchedTokens.length === 1;
  return matchedTokens.length >= 2;
}

export function filterSignalsForMonitor(monitor: MonitorRule, signals: IntelligenceSignal[]) {
  return signals.filter((signal) => matchesMonitor(monitor, signal));
}
