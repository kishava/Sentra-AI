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

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

export function matchesMonitor(monitor: MonitorRule, signal: IntelligenceSignal) {
  if (monitor.category !== "any" && signal.category !== monitor.category) return false;
  if (severityRank[signal.severity] < severityRank[monitor.minimumSeverity]) return false;

  const requirementTokens = monitor.keywords?.length ? monitor.keywords : tokenize(monitor.requirement);
  if (!requirementTokens.length) return false;

  const haystack = `${signal.title} ${signal.summary} ${signal.source} ${signal.category}`.toLowerCase();
  return requirementTokens.some((token) => haystack.includes(token.toLowerCase()));
}

export function filterSignalsForMonitor(monitor: MonitorRule, signals: IntelligenceSignal[]) {
  return signals.filter((signal) => matchesMonitor(monitor, signal));
}
