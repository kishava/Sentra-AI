"use client";

import { motion } from "framer-motion";
import { Activity, ArrowUpRight, BrainCircuit, GitBranch, ShieldAlert, Telescope } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { IntelligenceNode, WorldEngineReport } from "@/types/world-engine";

const nodeColors = {
  country: "#53f4ff",
  company: "#a855f7",
  government: "#fbbf24",
  technology: "#53f4ff",
  conflict: "#ff4f91",
  market: "#4ade80",
  trend: "#6272ff",
};

function IntelligenceGraph({ report }: { report: WorldEngineReport }) {
  const nodes = report.nodes;
  const points = nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const radius = index === 0 ? 0 : 118;
    return { ...node, x: 180 + Math.cos(angle) * radius, y: 145 + Math.sin(angle) * radius };
  });
  const positions = new Map(points.map((node) => [node.id, node]));

  return (
    <Card className="overflow-hidden p-5" glow>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.23em] text-white/38">Neural intelligence graph</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Relationship propagation</h3>
        </div>
        <GitBranch className="h-5 w-5 text-sentra-cyan" />
      </div>
      <svg viewBox="0 0 360 292" className="mt-4 h-[292px] w-full" role="img" aria-label="Entity relationship graph">
        {report.links.map((link) => {
          const source = positions.get(link.source);
          const target = positions.get(link.target);
          if (!source || !target) return null;
          return (
            <motion.line
              key={`${link.source}-${link.target}`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.25 + link.strength / 180 }}
              transition={{ duration: 0.7 }}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="#53f4ff"
              strokeWidth={Math.max(1, link.strength / 28)}
              strokeDasharray="4 7"
            />
          );
        })}
        {points.map((node, index) => (
          <g key={node.id}>
            <motion.circle
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.05 }}
              cx={node.x}
              cy={node.y}
              r={16 + node.influence / 8}
              fill={`${nodeColors[node.kind]}1b`}
              stroke={nodeColors[node.kind]}
              strokeOpacity="0.5"
            />
            <circle cx={node.x} cy={node.y} r="5" fill={nodeColors[node.kind]} />
            <text x={node.x} y={node.y + 34} textAnchor="middle" fill="rgba(255,255,255,.7)" fontSize="10">
              {node.label.slice(0, 18)}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-2">
        {nodes.slice(0, 5).map((node: IntelligenceNode) => <Badge key={node.id}>{node.kind}: {node.risk}% risk</Badge>)}
      </div>
    </Card>
  );
}

function SignalRadar({ report }: { report: WorldEngineReport }) {
  return (
    <Card className="p-5" glow>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.23em] text-white/38">Signal pulse radar</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Anomaly intensity</h3>
        </div>
        <Activity className="h-5 w-5 text-sentra-cyan" />
      </div>
      <div className="mt-3 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={report.pulse}>
            <PolarGrid stroke="rgba(255,255,255,.12)" />
            <PolarAngleAxis dataKey="domain" tick={{ fill: "rgba(255,255,255,.56)", fontSize: 10 }} />
            <Radar dataKey="intensity" stroke="#53f4ff" fill="#53f4ff" fillOpacity={0.2} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {report.pulse.map((pulse) => (
          <div key={pulse.domain} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-xs">
            <span className="capitalize text-white/60">{pulse.domain}</span>
            <span className={pulse.change >= 0 ? "text-cyan-100" : "text-rose-200"}>
              {pulse.change >= 0 ? "+" : ""}{pulse.change}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ForecastEngine({ report }: { report: WorldEngineReport }) {
  const data = report.forecasts.map((forecast) => ({
    name: forecast.horizon,
    probability: forecast.probability,
    impact: forecast.impact,
  }));

  return (
    <Card className="p-5" glow>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.23em] text-white/38">Predictive timeline engine</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Probability paths</h3>
        </div>
        <Telescope className="h-5 w-5 text-sentra-cyan" />
      </div>
      <div className="mt-5 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="world-probability" x1="0" y1="0" x2="0" y2="1">
                <stop offset="4%" stopColor="#53f4ff" stopOpacity={0.42} />
                <stop offset="95%" stopColor="#53f4ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="world-impact" x1="0" y1="0" x2="0" y2="1">
                <stop offset="4%" stopColor="#ff4fd8" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#ff4fd8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,.08)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="rgba(255,255,255,.4)" />
            <YAxis domain={[0, 100]} axisLine={false} tickLine={false} stroke="rgba(255,255,255,.4)" />
            <Tooltip contentStyle={{ background: "#080d1c", border: "1px solid rgba(255,255,255,.12)", borderRadius: "16px" }} />
            <Area type="monotone" dataKey="probability" stroke="#53f4ff" fill="url(#world-probability)" strokeWidth={2} />
            <Area type="monotone" dataKey="impact" stroke="#ff4fd8" fill="url(#world-impact)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-2">
        {report.forecasts.map((forecast) => (
          <div key={forecast.title} className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
            <div className="flex gap-3">
              <Badge variant={forecast.direction === "negative" ? "risk" : "cyan"}>{forecast.horizon}</Badge>
              <p className="text-sm text-white/78">{forecast.title}</p>
              <span className="ml-auto text-xs text-sentra-cyan">{forecast.probability}%</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/46">{forecast.rationale}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SentimentSystem({ report }: { report: WorldEngineReport }) {
  return (
    <Card className="p-5" glow>
      <p className="text-xs uppercase tracking-[0.23em] text-white/38">Sentiment heatmap system</p>
      <h3 className="mt-2 text-xl font-semibold text-white">Regional pulse</h3>
      <div className="mt-5 grid gap-3">
        {report.signals.map((signal) => {
          const favorable = signal.sentiment >= 0;
          return (
            <div key={signal.id}>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-white/62">{signal.region}</span>
                <span className={favorable ? "text-emerald-200" : "text-rose-200"}>
                  {favorable ? "+" : ""}{signal.sentiment}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(8, Math.abs(signal.sentiment))}%` }}
                  className={`h-full rounded-full ${favorable ? "bg-gradient-to-r from-emerald-300 to-cyan-300" : "bg-gradient-to-r from-amber-300 to-rose-400"}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ScenarioEngine({ report }: { report: WorldEngineReport }) {
  if (!report.scenarioMode || !report.scenario.length) return null;
  return (
    <Card className="p-5 md:p-6" glow>
      <div className="flex items-center gap-3">
        <BrainCircuit className="h-5 w-5 text-sentra-cyan" />
        <div>
          <p className="text-xs uppercase tracking-[0.23em] text-white/38">Scenario simulation engine</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Cascading impact model</h3>
        </div>
      </div>
      <div className="relative mt-6 grid gap-3 lg:grid-cols-4">
        <div className="absolute left-8 right-8 top-10 hidden h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent lg:block" />
        {report.scenario.map((impact, index) => (
          <motion.div
            key={impact.stage}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative rounded-2xl border border-white/10 bg-white/[0.045] p-4"
          >
            <Badge variant={impact.magnitude > 75 ? "risk" : "violet"}>{impact.stage}</Badge>
            <p className="mt-4 text-sm font-medium text-white">{impact.sector}</p>
            <p className="mt-2 text-xs leading-5 text-white/54">{impact.effect}</p>
            <p className="mt-4 flex items-center gap-1 text-xs text-cyan-100"><ArrowUpRight className="h-3 w-3" /> {impact.probability}% modeled likelihood</p>
          </motion.div>
        ))}
      </div>
      <p className="mt-5 flex gap-2 text-xs leading-5 text-amber-100/65">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        Scenario outputs are conditional simulations. They are not claims that these events will occur.
      </p>
    </Card>
  );
}

export { ForecastEngine, IntelligenceGraph, ScenarioEngine, SentimentSystem, SignalRadar };
