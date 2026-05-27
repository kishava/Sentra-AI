import { SignalFeed } from "@/components/dashboard/signal-feed";
import { Badge } from "@/components/ui/badge";
import type { DashboardSignalSource } from "@/hooks/use-dashboard-signals";
import type { IntelligenceSignal } from "@/types/intelligence";

export function LiveSignalsPanel({
  signals,
  source,
  loading,
  lastUpdated,
}: {
  signals: IntelligenceSignal[];
  source: DashboardSignalSource;
  loading: boolean;
  lastUpdated: Date | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-3">
        {lastUpdated && (
          <span className="text-xs text-white/38">
            Synced {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <Badge variant={source === "live" ? "cyan" : "violet"}>
          {loading ? "Syncing signals" : source === "live" ? "Live briefing signals" : "Preview signals"}
        </Badge>
      </div>
      <SignalFeed signals={signals} />
    </div>
  );
}
