"use client";

import { useCallback, useEffect, useState } from "react";
import type { IntelligenceSignal } from "@/types/intelligence";

export const DASHBOARD_SIGNALS_UPDATED_EVENT = "sentra:dashboard-signals-updated";
const SESSION_SNAPSHOT_KEY = "sentra-dashboard-signal-snapshot";

export type DashboardSignalSource = "live" | "sample";

export type DashboardSignalSnapshot = {
  signals: IntelligenceSignal[];
  source: DashboardSignalSource;
  loading: boolean;
  lastUpdated: Date | null;
};

type SignalsResponse = {
  signals?: IntelligenceSignal[];
  source?: DashboardSignalSource;
  generatedAt?: string;
};

function resolvedDate(generatedAt?: string) {
  const value = generatedAt ? new Date(generatedAt) : new Date();
  return Number.isNaN(value.getTime()) ? new Date() : value;
}

function readSessionSnapshot() {
  try {
    const value = window.sessionStorage.getItem(SESSION_SNAPSHOT_KEY);
    return value ? (JSON.parse(value) as SignalsResponse) : null;
  } catch {
    window.sessionStorage.removeItem(SESSION_SNAPSHOT_KEY);
    return null;
  }
}

/** Same on server and first client paint — session cache applied after mount. */
const INITIAL_SNAPSHOT: DashboardSignalSnapshot = {
  signals: [],
  source: "sample",
  loading: true,
  lastUpdated: null,
};

export function useDashboardSignals(refreshInterval = 60000) {
  const [snapshot, setSnapshot] = useState<DashboardSignalSnapshot>(INITIAL_SNAPSHOT);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/signals", { cache: "no-store" });
      if (!response.ok) throw new Error("Signal request failed.");
      const data = (await response.json()) as SignalsResponse;
      const sessionSnapshot = readSessionSnapshot();
      const nextData = data.source === "sample" && sessionSnapshot?.source === "live" ? sessionSnapshot : data;

      setSnapshot({
        signals: nextData.signals ?? [],
        source: nextData.source ?? "sample",
        loading: false,
        lastUpdated: resolvedDate(nextData.generatedAt),
      });
    } catch {
      setSnapshot((current) => ({ ...current, loading: false, lastUpdated: new Date() }));
    }
  }, []);

  useEffect(() => {
    const cached = readSessionSnapshot();
    if (cached?.signals?.length) {
      setSnapshot({
        signals: cached.signals ?? [],
        source: cached.source ?? "sample",
        loading: false,
        lastUpdated: cached.generatedAt ? resolvedDate(cached.generatedAt) : null,
      });
    }

    const initialRefresh = window.setTimeout(() => void refresh(), 0);

    const interval = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, refreshInterval);

    const onSignalsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<SignalsResponse>).detail;
      if (!detail?.signals) {
        void refresh();
        return;
      }

      setSnapshot({
        signals: detail.signals,
        source: detail.source ?? "sample",
        loading: false,
        lastUpdated: resolvedDate(detail.generatedAt),
      });
      window.sessionStorage.setItem(SESSION_SNAPSHOT_KEY, JSON.stringify(detail));
    };

    window.addEventListener(DASHBOARD_SIGNALS_UPDATED_EVENT, onSignalsUpdated);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      window.removeEventListener(DASHBOARD_SIGNALS_UPDATED_EVENT, onSignalsUpdated);
    };
  }, [refresh, refreshInterval]);

  return snapshot;
}
