"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, ShieldAlert } from "lucide-react";
import { MonitorCenter } from "@/components/dashboard/monitor-center";
import { toast } from "sonner";
import { SignalFeed } from "@/components/dashboard/signal-feed";
import { WorkspacePage, WorkspacePageHeader, WorkspaceSection } from "@/components/workspace/workspace-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signalStream } from "@/data/mock-intelligence";
import type { IntelligenceSignal } from "@/types/intelligence";

const filters = ["All", "Critical", "Pricing", "Hiring", "Sentiment", "Competitors"];

const signalExamplePrompts: Record<string, { prompt: string; category: IntelligenceSignal["category"]; minimumSeverity: IntelligenceSignal["severity"] }> = {
  "sig-001": {
    prompt: "Alert me when Tesla pricing incentives change across regional landing pages.",
    category: "pricing",
    minimumSeverity: "high",
  },
  "sig-002": {
    prompt: "Monitor AI infrastructure hiring spikes in Singapore and funded startups.",
    category: "hiring",
    minimumSeverity: "medium",
  },
  "sig-003": {
    prompt: "Watch for negative sentiment about enterprise cloud billing and pricing changes.",
    category: "sentiment",
    minimumSeverity: "critical",
  },
  "sig-004": {
    prompt: "Tell me if a competitor launches an autonomous procurement agent or workflow product.",
    category: "competitor",
    minimumSeverity: "high",
  },
};

function AlertsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const filterParam = searchParams.get("filter");
  const activeFilter = filterParam && filters.includes(filterParam) ? filterParam : "All";

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

  function useSignalAsPrompt(signal: IntelligenceSignal) {
    const example = signalExamplePrompts[signal.id];
    if (!example) return;

    const params = new URLSearchParams();
    params.set("guidePrompt", example.prompt);
    params.set("guideCategory", example.category);
    params.set("guideSeverity", example.minimumSeverity);
    router.replace(`/alerts?${params.toString()}#create-signal-monitor`, { scroll: false });
    toast.message("Example loaded", { description: "Review the prompt and click Start monitoring." });
  }

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        badge="Realtime enterprise alerts"
        badgeVariant="risk"
        title="Alert center"
        description="Prioritized risk notifications from competitor launches, pricing changes, hiring spikes, sentiment shifts, and live market movement."
        actions={
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
        }
      />

      <WorkspaceSection>
        <div className="flex flex-wrap gap-3">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={
                activeFilter === filter
                  ? "rounded-full border border-cyan-200/40 bg-cyan-300/15 px-4 py-2 text-sm text-cyan-100 transition"
                  : "rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/60 transition hover:border-cyan-200/25 hover:text-white/80"
              }
              onClick={() => updateFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
        {showFilterPanel && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 text-sm text-white/55">
            Showing <span className="font-semibold text-white">{filteredSignals.length}</span> matching alert
            {filteredSignals.length === 1 ? "" : "s"} for{" "}
            <span className="font-semibold text-cyan-100">{activeFilter}</span>.
          </div>
        )}
      </WorkspaceSection>

      <MonitorCenter />

      <WorkspaceSection title="Example signals" description="Click a card to load it as a monitor prompt.">
        <div className="grid gap-5 md:grid-cols-3">
          {filteredSignals.slice(0, 3).map((signal) => (
            <button
              key={signal.id}
              type="button"
              onClick={() => useSignalAsPrompt(signal)}
              className="sentra-focus text-left"
            >
              <Card className="h-full p-5 transition hover:border-cyan-200/25 hover:bg-white/[0.06]" glow>
                <ShieldAlert className="h-6 w-6 text-rose-200" />
                <p className="mt-5 text-sm uppercase tracking-[0.24em] text-white/35">{signal.category}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{signal.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/55">{signal.summary}</p>
                <p className="mt-4 text-xs font-medium text-sentra-cyan">Click to use as monitor prompt</p>
              </Card>
            </button>
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection title="Signal feed">
        <SignalFeed signals={filteredSignals} />
      </WorkspaceSection>
    </WorkspacePage>
  );
}

export default function AlertsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading alerts…</p>}>
      <AlertsPageContent />
    </Suspense>
  );
}
