"use client";

import { Activity, BellRing, Building2, Radar, Sparkles, TrendingUp } from "lucide-react";
import { IntelligenceCharts } from "@/components/dashboard/intelligence-charts";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RiskHeatmap } from "@/components/dashboard/risk-heatmap";
import { SignalFeed } from "@/components/dashboard/signal-feed";
import { AiOrb } from "@/components/shared/ai-orb";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { briefingCards } from "@/data/mock-intelligence";

const metrics = [
  { icon: Radar, label: "Signals monitored", value: "8.2k", trend: "+18%" },
  { icon: BellRing, label: "Active alerts", value: "24", trend: "+7" },
  { icon: Building2, label: "Companies tracked", value: "412", trend: "+31" },
  { icon: TrendingUp, label: "Trend velocity", value: "96", trend: "+12%" },
];

export default function DashboardPage() {
  return (
    <>
      <section className="mb-8 grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden p-5 md:p-8" glow>
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <Badge variant="cyan">Autonomous intelligence active</Badge>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-6xl">
                Live enterprise signals, analyzed before they become obvious.
              </h1>
              <p className="mt-5 max-w-2xl text-white/55">
                Sentra is monitoring competitors, market movements, sentiment, pricing, and
                strategic risk across the live web.
              </p>
            </div>
            <AiOrb speaking size="md" className="shrink-0 self-center" />
          </div>
        </Card>
        <Card className="p-6" glow>
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-sentra-cyan" />
            <p className="font-semibold text-white">AI daily briefing</p>
          </div>
          <div className="mt-5 grid gap-3">
            {briefingCards.map((card) => (
              <div key={card} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-white/62">
                {card}
              </div>
            ))}
          </div>
        </Card>
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
        <SignalFeed />
        <div className="grid gap-5">
          <RiskHeatmap />
          <Card className="p-6" glow>
            <Activity className="h-7 w-7 text-sentra-cyan" />
            <h3 className="mt-5 text-2xl font-semibold text-white">AI recommendation</h3>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Move the pricing watchlist to critical, generate a sales battlecard, and brief
              enterprise account teams before Monday procurement calls.
            </p>
          </Card>
        </div>
      </section>
    </>
  );
}
