"use client";

import { useEffect, useState } from "react";
import { SignalFeed } from "@/components/dashboard/signal-feed";
import { Badge } from "@/components/ui/badge";
import { signalStream } from "@/data/mock-intelligence";
import type { IntelligenceSignal } from "@/types/intelligence";

export function LiveSignalsPanel() {
  const [signals, setSignals] = useState<IntelligenceSignal[]>(signalStream);
  const [source, setSource] = useState<"live" | "sample">("sample");

  useEffect(() => {
    fetch("/api/signals")
      .then((response) => response.json())
      .then((data: { signals?: IntelligenceSignal[]; source?: "live" | "sample" }) => {
        if (data.signals?.length) {
          setSignals(data.signals);
          setSource(data.source ?? "sample");
        }
      })
      .catch(() => {
        setSignals(signalStream);
        setSource("sample");
      });
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Badge variant={source === "live" ? "cyan" : "violet"}>
          {source === "live" ? "From your latest briefing" : "Sample signals"}
        </Badge>
      </div>
      <SignalFeed signals={signals} />
    </div>
  );
}
