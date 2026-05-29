"use client";

import { AlertTriangle, BriefcaseBusiness, LineChart, Megaphone, Tags } from "lucide-react";
import { signalStream } from "@/data/mock-intelligence";
import { cn } from "@/lib/utils";
import type { IntelligenceSignal, Severity } from "@/types/intelligence";
import { Card } from "@/components/ui/card";

const severityClass: Record<Severity, string> = {
  low: "border-sky-300/20 bg-sky-400/10 text-sky-100",
  medium: "border-amber-300/20 bg-amber-400/10 text-amber-100",
  high: "border-orange-300/20 bg-orange-400/10 text-orange-100",
  critical: "border-rose-300/25 bg-rose-400/10 text-rose-100",
};

const categoryIcon: Record<IntelligenceSignal["category"], typeof AlertTriangle> = {
  competitor: Megaphone,
  market: LineChart,
  risk: AlertTriangle,
  pricing: Tags,
  hiring: BriefcaseBusiness,
  sentiment: AlertTriangle,
};

export function SignalFeed({ signals = signalStream }: { signals?: IntelligenceSignal[] }) {
  return (
    <Card id="signals" className="scroll-mt-28 p-5 md:p-6" glow>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-[0.24em] text-white/35">Live signals</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Autonomous activity feed</h3>
        </div>
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sentra-cyan opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-sentra-cyan" />
        </span>
      </div>
      <div className="grid gap-3">
        {signals.map((signal) => {
          const Icon = categoryIcon[signal.category];
          return (
            <div
              key={signal.id}
              className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 transition-colors"
            >
              <div className="flex gap-4">
                <span className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-sentra-cyan">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-medium text-white">{signal.title}</h4>
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px]", severityClass[signal.severity])}>
                      {signal.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/55">{signal.summary}</p>
                  <p className="mt-3 break-words text-xs text-white/35">
                    {signal.source} - confidence {Math.round(signal.confidence * 100)}% - {signal.timestamp}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {signals.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/45">
            No matching signals for this.
          </div>
        )}
      </div>
    </Card>
  );
}
