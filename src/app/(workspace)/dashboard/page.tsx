"use client";

import dynamic from "next/dynamic";
import { Activity, BellRing, Building2, Radar, TrendingUp } from "lucide-react";
import { DashboardBriefing } from "@/components/dashboard/dashboard-briefing";
import { LiveSignalsPanel } from "@/components/dashboard/live-signals-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RiskHeatmap } from "@/components/dashboard/risk-heatmap";
import { AiOrb } from "@/components/shared/ai-orb";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useDashboardSignals } from "@/hooks/use-dashboard-signals";

const IntelligenceCharts = dynamic(
  () => import("@/components/dashboard/intelligence-charts").then((mod) => mod.IntelligenceCharts),
  {
    ssr: false,
    loading: () => (
      <div className="mb-8 grid h-72 animate-pulse gap-5 rounded-[28px] border border-white/10 bg-white/[0.04] xl:grid-cols-2" />
    ),
  },
);

export default function DashboardPage() {
  const { signals, source, loading, lastUpdated } = useDashboardSignals();
  const priorityAlerts = signals.filter((signal) => signal.severity === "high" || signal.severity === "critical").length;
  const criticalAlerts = signals.filter((signal) => signal.severity === "critical").length;
  const coveredDomains = new Set(signals.map((signal) => signal.category)).size;
  const averageConfidence = signals.length
    ? Math.round((signals.reduce((total, signal) => total + signal.confidence, 0) / signals.length) * 100)
    : 0;
  const metrics = [
    {
      icon: Radar,
      label: "Signals in scope",
      value: loading ? "--" : String(signals.length),
      trend: loading ? "Syncing" : source === "live" ? "Live feed" : "Preview",
      tone: source === "live" ? ("live" as const) : ("neutral" as const),
    },
    {
      icon: BellRing,
      label: "Priority alerts",
      value: loading ? "--" : String(priorityAlerts),
      trend: loading ? "Syncing" : criticalAlerts ? `${criticalAlerts} critical` : "No critical",
      tone: criticalAlerts ? ("attention" as const) : ("neutral" as const),
    },
    {
      icon: Building2,
      label: "Domains covered",
      value: loading ? "--" : String(coveredDomains),
      trend: loading ? "Syncing" : `${signals.length} observations`,
      tone: "neutral" as const,
    },
    {
      icon: TrendingUp,
      label: "Avg confidence",
      value: loading ? "--" : `${averageConfidence}%`,
      trend: source === "live" ? "Current run" : "Preview basis",
      tone: source === "live" ? ("live" as const) : ("neutral" as const),
    },
  ];

  return (
    <>
      <section className="mb-8 grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden p-5 md:p-8" glow>
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <Badge variant="cyan">Enterprise intelligence OS</Badge>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-6xl">
                Live enterprise signals, analyzed before they become obvious.
              </h1>
              <p className="mt-5 max-w-2xl text-white/55">
                Refresh your briefing to collect live web evidence with Bright Data, then monitor
                competitors from Alerts.
              </p>
            </div>
            <AiOrb speaking size="md" static className="shrink-0 self-center" />
          </div>
        </Card>
        <DashboardBriefing />
      </section>

      <section className="mb-4 flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/35">
          {source === "live" ? "Synchronized intelligence snapshot" : "Preview data until a live run completes"}
        </p>
        {lastUpdated && (
          <p className="text-xs text-white/38">
            Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </section>

      <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="mb-8">
        <IntelligenceCharts />
      </section>

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <LiveSignalsPanel signals={signals} source={source} loading={loading} lastUpdated={lastUpdated} />
        <div className="grid gap-5">
          <RiskHeatmap signals={signals} source={source} loading={loading} />
          <Card className="p-6" glow>
            <Activity className="h-7 w-7 text-sentra-cyan" />
            <h3 className="mt-5 text-2xl font-semibold text-white">Next step</h3>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Open Alerts to create a monitor and run Check now - each check uses Bright Data SERP
              or Unlocker, then matches signals to your rule.
            </p>
          </Card>
        </div>
      </section>
    </>
  );
}
