"use client";

import { Activity, BellRing, Building2, Radar, TrendingUp } from "lucide-react";
import { DashboardBriefing } from "@/components/dashboard/dashboard-briefing";
import { IntelligenceCharts } from "@/components/dashboard/intelligence-charts";
import { LiveSignalsPanel } from "@/components/dashboard/live-signals-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RiskHeatmap } from "@/components/dashboard/risk-heatmap";
import { AiOrb } from "@/components/shared/ai-orb";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const metrics = [
  { icon: Radar, label: "Signals monitored", value: "—", trend: "Refresh briefing", sample: true },
  { icon: BellRing, label: "Active alerts", value: "—", trend: "Create monitors", sample: true },
  { icon: Building2, label: "Companies tracked", value: "—", trend: "Live after checks", sample: true },
  { icon: TrendingUp, label: "Trend velocity", value: "—", trend: "Illustrative", sample: true },
];

export default function DashboardPage() {
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
            <AiOrb speaking size="md" className="shrink-0 self-center" />
          </div>
        </Card>
        <DashboardBriefing />
      </section>

      <section className="mb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/35">Sample metrics until live runs populate</p>
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
        <LiveSignalsPanel />
        <div className="grid gap-5">
          <RiskHeatmap />
          <Card className="p-6" glow>
            <Activity className="h-7 w-7 text-sentra-cyan" />
            <h3 className="mt-5 text-2xl font-semibold text-white">Next step</h3>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Open Alerts to create a monitor and run Check now — each check uses Bright Data SERP
              or Unlocker, then matches signals to your rule.
            </p>
          </Card>
        </div>
      </section>
    </>
  );
}
