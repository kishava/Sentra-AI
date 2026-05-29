"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, ShieldAlert } from "lucide-react";
import { MonitorCenter } from "@/components/dashboard/monitor-center";
import { toast } from "sonner";
import { SignalFeed } from "@/components/dashboard/signal-feed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signalStream } from "@/data/mock-intelligence";

const filters = ["All", "Critical", "Pricing", "Hiring", "Sentiment", "Competitors"];

function AlertsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const filterParam = searchParams.get("filter");
  const activeFilter =
    filterParam && filters.includes(filterParam) ? filterParam : "All";

  const filteredSignals = useMemo(() => {
    if (activeFilter === "All") return signalStream;
    if (activeFilter === "Critical") {
      return signalStream.filter((signal) => signal.severity === "critical");
    }
    if (activeFilter === "Competitors") {
      return signalStream.filter((signal) => signal.category === "competitor");
    }

    return signalStream.filter((signal) => signal.category === activeFilter.toLowerCase());
  }, [activeFilter]);

  function updateFilter(filter: string) {
    router.replace(filter === "All" ? "/alerts" : `/alerts?filter=${filter}`, { scroll: false });
  }

  return (
    <>
      <section className="mb-8">
        <Card className="p-5 md:p-8" glow>
          <Badge variant="risk">Realtime enterprise alerts</Badge>
          <div className="mt-5 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="min-w-0">
              <h1 className="type-display-lg text-white">
                Alert center
              </h1>
              <p className="mt-4 max-w-2xl text-white/55">
                Prioritized risk notifications from competitor launches, pricing changes,
                hiring spikes, sentiment shifts, and live market movement.
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setShowFilterPanel((value) => !value);
                toast.message("Alert filters ready", {
                  description: "Choose a severity or signal category below.",
                });
              }}
            >
              <Filter className="h-4 w-4" /> Configure filters
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {filters.map((filter) => (
              <button
                key={filter}
                className={
                  activeFilter === filter
                    ? "rounded-full border border-cyan-200/40 bg-cyan-300/15 px-4 py-2 text-sm text-cyan-100 transition"
                    : "rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/60 transition"
                }
                onClick={() => updateFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          {showFilterPanel && (
            <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.045] p-4 text-sm text-white/55">
              Showing <span className="font-semibold text-white">{filteredSignals.length}</span> matching
              alert{filteredSignals.length === 1 ? "" : "s"} for{" "}
              <span className="font-semibold text-cyan-100">{activeFilter}</span>.
            </div>
          )}
        </Card>
      </section>

      <MonitorCenter />

      <section className="mb-8 grid gap-5 md:grid-cols-3">
        {filteredSignals.slice(0, 3).map((signal) => (
          <Card key={signal.id} className="p-5" glow>
            <ShieldAlert className="h-6 w-6 text-rose-200" />
            <p className="mt-5 text-sm uppercase tracking-[0.24em] text-white/35">{signal.category}</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{signal.title}</h3>
            <p className="mt-3 text-sm leading-6 text-white/55">{signal.summary}</p>
          </Card>
        ))}
      </section>

      <SignalFeed signals={filteredSignals} />
    </>
  );
}

export default function AlertsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading alerts…</p>}>
      <AlertsPageContent />
    </Suspense>
  );
}
