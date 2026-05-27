import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { DashboardSignalSource } from "@/hooks/use-dashboard-signals";
import { cn } from "@/lib/utils";
import type { IntelligenceSignal, Severity } from "@/types/intelligence";

const categories: Array<{ key: IntelligenceSignal["category"]; label: string }> = [
  { key: "competitor", label: "Competitor" },
  { key: "market", label: "Market" },
  { key: "risk", label: "Risk" },
  { key: "pricing", label: "Pricing" },
  { key: "hiring", label: "Hiring" },
  { key: "sentiment", label: "Sentiment" },
];

const severityScore: Record<Severity, number> = {
  low: 25,
  medium: 50,
  high: 75,
  critical: 100,
};

export function RiskHeatmap({
  signals,
  source,
  loading,
}: {
  signals: IntelligenceSignal[];
  source: DashboardSignalSource;
  loading: boolean;
}) {
  const cells = categories.map(({ key, label }) => {
    const matching = signals.filter((signal) => signal.category === key);
    const score = matching.length
      ? Math.round(
          matching.reduce((sum, signal) => sum + severityScore[signal.severity] * signal.confidence, 0) /
            matching.length,
        )
      : 0;

    return { key, label, score, count: matching.length };
  });
  const activeCells = cells.filter((cell) => cell.count);
  const pressureIndex = activeCells.length
    ? Math.round(activeCells.reduce((sum, cell) => sum + cell.score, 0) / activeCells.length)
    : 0;
  const highestPressure = [...activeCells].sort((left, right) => right.score - left.score)[0];

  return (
    <Card className="p-6" glow>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-white/35">Exposure overview</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Surface Pressure Index</h3>
        </div>
        <Badge variant={source === "live" ? "cyan" : "violet"}>{source === "live" ? "Live" : "Preview"}</Badge>
      </div>
      <div className="mt-5 flex items-end gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <p className="text-4xl font-semibold text-white">{loading ? "--" : pressureIndex}</p>
        <p className="pb-1 text-sm leading-5 text-white/48">
          {loading
            ? "Synchronizing latest signal exposure."
            : highestPressure
            ? `Highest exposure: ${highestPressure.label} (${highestPressure.score})`
            : "No current signal exposure detected."}
        </p>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {cells.map(({ key, label, score, count }) => (
          <div
            key={key}
            className={cn(
              "rounded-2xl border p-4",
              score > 80
                ? "border-rose-300/25 bg-rose-400/15"
                : score > 60
                  ? "border-amber-300/25 bg-amber-400/12"
                  : "border-cyan-300/20 bg-cyan-400/10",
            )}
          >
            <p className="truncate text-sm text-white/60">{label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{!loading && count ? score : "--"}</p>
            <p className="mt-1 text-[11px] text-white/38">
              {loading ? "Syncing" : count ? `${count} signal${count === 1 ? "" : "s"}` : "No signal"}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-white/38">
        Severity weighted by confidence across the latest synchronized signals.
      </p>
    </Card>
  );
}
