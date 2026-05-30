"use client";

import Link from "next/link";
import { ArrowRight, Radar } from "lucide-react";
import { DashboardBriefing } from "@/components/dashboard/dashboard-briefing";
import { LiveSignalsPanel } from "@/components/dashboard/live-signals-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RiskHeatmap } from "@/components/dashboard/risk-heatmap";
import { WorkspacePage, WorkspacePageHeader, WorkspaceSection } from "@/components/workspace/workspace-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDashboardSignals } from "@/hooks/use-dashboard-signals";
import dynamic from "next/dynamic";
import { Activity, BellRing, Building2, TrendingUp } from "lucide-react";

const IntelligenceCharts = dynamic(
  () => import("@/components/dashboard/intelligence-charts").then((mod) => mod.IntelligenceCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-72 animate-pulse gap-5 rounded-[28px] border border-white/10 bg-white/[0.04] xl:grid-cols-2" />
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
    <WorkspacePage>
      <WorkspacePageHeader
        badge="Enterprise intelligence OS"
        title="Live enterprise signals, analyzed before they become obvious."
        description="Refresh your briefing to collect live web evidence with Bright Data, then create monitors and run the GTM research agent from the Monitors workspace."
        aside={<DashboardBriefing />}
      />

      <WorkspaceSection
        title="Signal snapshot"
        description={
          source === "live"
            ? "Synchronized intelligence from your latest briefing or monitor run."
            : "Preview data until a live Bright Data collection completes."
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant={source === "live" ? "cyan" : "violet"}>
            {source === "live" ? "Live · Bright Data" : "Preview mode"}
          </Badge>
          {lastUpdated && (
            <p className="text-xs text-white/38">
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection title="Market trends">
        <IntelligenceCharts />
      </WorkspaceSection>

      <WorkspaceSection title="Live intelligence">
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <LiveSignalsPanel signals={signals} source={source} loading={loading} lastUpdated={lastUpdated} />
          <div className="grid gap-5">
            <RiskHeatmap signals={signals} source={source} loading={loading} />
            <Card className="p-6" glow>
              <Activity className="h-7 w-7 text-sentra-cyan" />
              <h3 className="mt-5 text-2xl font-semibold text-white">GTM command center</h3>
              <p className="mt-3 text-sm leading-6 text-white/55">
                Account context, battlecard analysis, MCP research agent, and monitor creation live in Monitors.
              </p>
              <Button asChild variant="neon" className="mt-5">
                <Link href="/alerts#gtm-workspace">
                  Open monitors <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Card>
          </div>
        </div>
      </WorkspaceSection>
    </WorkspacePage>
  );
}
