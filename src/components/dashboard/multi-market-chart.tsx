"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";

type AssetQuote = {
  id: string;
  name: string;
  symbol: string;
  kind: "crypto" | "stock";
  color: string;
  price: number;
  change24h: number | null;
  change7d: number;
};

type MultiMarketPayload = {
  series: Array<Record<string, string | number>>;
  assets: AssetQuote[];
  indexLabel: string;
  updatedAt: string;
};

const POLL_MS = 45_000;

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatIndex(value: number) {
  return value.toFixed(1);
}

function CustomTooltip({
  active,
  payload,
  label,
  assets,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; color?: string }>;
  label?: string;
  assets: AssetQuote[];
}) {
  if (!active || !payload?.length) return null;
  const byId = new Map(assets.map((asset) => [asset.id, asset]));

  return (
    <div className="rounded-2xl border border-white/12 bg-[rgba(8,12,28,0.96)] px-4 py-3 text-xs text-white shadow-xl">
      <p className="mb-2 text-white/50">{label}</p>
      <ul className="space-y-1.5">
        {payload
          .filter((entry) => entry.dataKey && entry.dataKey !== "time" && entry.dataKey !== "label")
          .sort((a, b) => Number(b.value) - Number(a.value))
          .map((entry) => {
            const asset = byId.get(String(entry.dataKey));
            if (!asset) return null;
            const indexed = Number(entry.value);
            const perf = indexed - 100;
            return (
              <li key={entry.dataKey} className="flex items-center justify-between gap-6">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: asset.color }} />
                  <span className="font-medium">{asset.symbol}</span>
                  <span className="text-white/40">{asset.kind}</span>
                </span>
                <span>
                  <span className="text-white/70">{formatUsd(asset.price)}</span>
                  <span className={perf >= 0 ? " ml-2 text-emerald-400" : " ml-2 text-rose-400"}>
                    {perf >= 0 ? "+" : ""}
                    {perf.toFixed(1)}% idx
                  </span>
                </span>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

export function MultiMarketChart() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<MultiMarketPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/market/multi", { cache: "no-store" });
      const payload = (await response.json()) as MultiMarketPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not load markets.");
      setData(payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load markets.");
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
    return () => window.clearInterval(interval);
  }, [load]);

  const assets = data?.assets ?? [];

  return (
    <Card className="p-6" glow>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-white/35">Market intelligence</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Crypto &amp; equities</h3>
          <p className="mt-1 text-sm text-white/45">
            {data?.indexLabel ?? "7d indexed performance"} — comparable on one scale (100 = week open)
          </p>
        </div>
        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
          {loading ? "Loading…" : error ? "Offline" : `Live · ${assets.length} assets`}
        </span>
      </div>

      {assets.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {assets.map((asset) => {
            const change = asset.change24h ?? asset.change7d;
            const positive = change >= 0;
            return (
              <div
                key={asset.id}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"
                style={{ borderLeftColor: asset.color, borderLeftWidth: 3 }}
              >
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span className="font-semibold text-white">{asset.symbol}</span>
                  <span className="capitalize">{asset.kind}</span>
                </div>
                <p className="mt-0.5 text-sm font-medium text-white">{formatUsd(asset.price)}</p>
                <p className={`text-xs ${positive ? "text-emerald-400" : "text-rose-400"}`}>
                  {asset.change24h != null
                    ? `${positive ? "+" : ""}${asset.change24h.toFixed(2)}% 24h`
                    : `${positive ? "+" : ""}${asset.change7d.toFixed(2)}% 7d`}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="h-80">
        {error && (
          <div className="flex h-full items-center justify-center rounded-3xl border border-rose-300/20 bg-rose-400/10 px-6 text-center text-sm text-rose-100">
            {error}
          </div>
        )}
        {!error && mounted && data?.series.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.series}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="rgba(255,255,255,0.38)"
                tickLine={false}
                axisLine={false}
                minTickGap={32}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.38)"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatIndex(Number(value))}
                domain={["auto", "auto"]}
                width={44}
              />
              <Tooltip content={<CustomTooltip assets={assets} />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.65)", paddingBottom: 8 }}
                formatter={(value) => {
                  const asset = assets.find((item) => item.id === value);
                  return asset ? asset.symbol : String(value);
                }}
              />
              {assets.map((asset) => (
                <Line
                  key={asset.id}
                  type="monotone"
                  dataKey={asset.id}
                  name={asset.id}
                  stroke={asset.color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : !error ? (
          <div className="h-full animate-pulse rounded-3xl bg-white/[0.04]" />
        ) : null}
      </div>
    </Card>
  );
}
