"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Card } from "@/components/ui/card";

type ProviderRow = {
  id: string;
  label: string;
  color: string;
  requestsToday: number;
  budgetUnits: number;
  usagePercent: number;
  detail: string;
  live: boolean;
};

type UsagePayload = {
  providers: ProviderRow[];
  updatedAt: string;
};

/** Fast refresh so usage moves soon after API calls. */
const POLL_MS = 5_000;

const CHART_MARGIN = { top: 8, right: 16, left: 4, bottom: 12 };

function formatUpdatedAgo(iso: string | undefined) {
  if (!iso) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

export function ProviderUsageChart() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<UsagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/usage/providers", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const payload = (await response.json()) as UsagePayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not load provider usage.");
      setData(payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load provider usage.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const chartData = useMemo(
    () =>
      data?.providers.map((provider) => ({
        name: provider.label,
        usage: provider.usagePercent,
        color: provider.color,
        detail: provider.detail,
      })) ?? [],
    [data?.providers],
  );

  const maxUsage = useMemo(
    () => Math.max(10, ...chartData.map((row) => row.usage), 0),
    [chartData],
  );

  const updatedLabel = useMemo(
    () => formatUpdatedAgo(data?.updatedAt),
    [data?.updatedAt, tick],
  );

  return (
    <Card className="p-6" glow>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-white/35">Provider credits</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Usage today</h3>
          <p className="mt-1 text-sm text-white/45">
            Bright Data balance from API · others from Sentra call counts vs daily budget
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
            {loading ? "Loading…" : error ? "Offline" : `Live · ${POLL_MS / 1000}s`}
          </span>
          {!loading && !error && data?.updatedAt ? (
            <span className="text-[10px] text-white/35">Updated {updatedLabel}</span>
          ) : null}
        </div>
      </div>

      {data?.providers.length ? (
        <ul className="mb-4 space-y-1.5 text-xs text-white/50">
          {data.providers.map((provider) => (
            <li key={provider.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: provider.color }} />
              <span className="font-medium text-white/80">{provider.label}</span>
              <span className="text-white/45">{provider.detail}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="h-[22rem] min-h-[352px] w-full overflow-visible pr-1">
        {error ? (
          <div className="flex h-full items-center justify-center rounded-3xl border border-rose-300/20 bg-rose-400/10 px-4 text-center text-sm text-rose-100">
            {error}
          </div>
        ) : mounted && chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={CHART_MARGIN}
              barCategoryGap="18%"
            >
              <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, Math.min(100, Math.ceil(maxUsage * 1.15))]}
                stroke="rgba(255,255,255,0.38)"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "rgba(255,255,255,0.55)" }}
                tickFormatter={(value) => `${value}%`}
                tickMargin={8}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={108}
                stroke="rgba(255,255,255,0.38)"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "rgba(255,255,255,0.75)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(8, 12, 28, 0.95)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "18px",
                  color: "white",
                  fontSize: 12,
                }}
                formatter={(value, _name, item) => [
                  `${Number(value).toFixed(1)}% used`,
                  (item.payload as { detail?: string }).detail ?? "",
                ]}
              />
              <Bar dataKey="usage" radius={[0, 10, 10, 0]} maxBarSize={28}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full animate-pulse rounded-3xl bg-white/[0.04]" />
        )}
      </div>
    </Card>
  );
}
