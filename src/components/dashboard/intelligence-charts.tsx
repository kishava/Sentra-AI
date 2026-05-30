"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MultiMarketChart } from "@/components/dashboard/multi-market-chart";
import { competitorData } from "@/data/mock-intelligence";
import { Card } from "@/components/ui/card";

const colors = ["#53f4ff", "#a855f7", "#ff4fd8", "#4ade80"];

export function IntelligenceCharts() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div id="market" className="scroll-mt-28 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <MultiMarketChart />

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
