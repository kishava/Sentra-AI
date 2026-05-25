"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { competitorData, trendData } from "@/data/mock-intelligence";
import { Card } from "@/components/ui/card";

const colors = ["#53f4ff", "#a855f7", "#ff4fd8", "#4ade80"];

export function IntelligenceCharts() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div id="market" className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <Card className="p-6" glow>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-white/35">Market intelligence</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Trend velocity</h3>
          </div>
          <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">Live</span>
        </div>
        <div className="h-80">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
              <defs>
                <linearGradient id="market" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#53f4ff" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#53f4ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="risk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff4fd8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ff4fd8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.38)" tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.38)" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "rgba(8, 12, 28, 0.95)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "18px",
                  color: "white",
                }}
              />
              <Area type="monotone" dataKey="market" stroke="#53f4ff" fill="url(#market)" strokeWidth={3} />
              <Area type="monotone" dataKey="risk" stroke="#ff4fd8" fill="url(#risk)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full rounded-3xl bg-white/[0.04]" />
          )}
        </div>
      </Card>

      <Card className="p-6" glow>
        <p className="text-sm uppercase tracking-[0.24em] text-white/35">Competitor comparison</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Signal share</h3>
        <div className="mt-6 h-80">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={competitorData}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.38)" tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.38)" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "rgba(8, 12, 28, 0.95)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "18px",
                  color: "white",
                }}
              />
              <Bar dataKey="velocity" radius={[12, 12, 4, 4]}>
                {competitorData.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length]} />
                ))}
              </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full rounded-3xl bg-white/[0.04]" />
          )}
        </div>
      </Card>
    </div>
  );
}
