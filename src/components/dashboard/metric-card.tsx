"use client";

import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  trend: string;
  tone?: "live" | "attention" | "neutral";
};

export function MetricCard({ icon: Icon, label, value, trend, tone = "neutral" }: MetricCardProps) {
  return (
    <Card className="p-5 transition-colors hover:border-cyan-200/25" glow>
      <div className="flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-300/10 text-sentra-cyan">
          <Icon className="h-5 w-5" />
        </span>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-xs",
            tone === "live"
              ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
              : tone === "attention"
                ? "border-rose-300/20 bg-rose-400/10 text-rose-100"
                : "border-white/10 bg-white/[0.055] text-white/60",
          )}
        >
          {trend}
        </span>
      </div>
      <p className="mt-8 text-sm uppercase tracking-[0.24em] text-white/35">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </Card>
  );
}
