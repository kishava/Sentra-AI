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
  if (tokens.length === 2) return matchedTokens.length >= 1;
  return matchedTokens.length >= 2;
}

export function filterSignalsForMonitor(monitor: MonitorRule, signals: IntelligenceSignal[]) {
  const strict = signals.filter((signal) => matchesMonitor(monitor, signal));
  if (strict.length) return strict;

  const haystackSignals = signals.map((signal) => ({
    signal,
    haystack: `${signal.title} ${signal.summary} ${signal.source}`.toLowerCase(),
  }));

  const tokens = (
    monitor.keywords?.length
      ? monitor.keywords.map((token) => token.toLowerCase())
      : tokenize(monitor.requirement)
  ).filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

  if (tokens.length) {
    const soft = haystackSignals
      .filter(({ haystack }) => tokens.some((token) => tokenMatches(haystack, token)))
      .map(({ signal }) => signal);
    if (soft.length) return soft.slice(0, 6);
  }

  // Show top analysis signals when strict keyword matching finds nothing.
  return signals
    .filter((signal) => severityRank[signal.severity] >= severityRank[monitor.minimumSeverity])
    .slice(0, 4);
}
