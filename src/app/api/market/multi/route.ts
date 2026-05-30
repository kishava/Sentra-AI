import { NextResponse } from "next/server";
import { MARKET_ASSETS } from "@/lib/market/assets";
import { buildIndexedChart, downsampleRaw, type RawPricePoint } from "@/lib/market/series";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FETCH_HEADERS = { Accept: "application/json", "User-Agent": "Sentra-AI/1.0" };

async function fetchCryptoHistory(coingeckoId: string): Promise<RawPricePoint[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=7`;
  const response = await fetch(url, { cache: "no-store", headers: FETCH_HEADERS });
  if (!response.ok) return [];
  const json = (await response.json()) as { prices?: [number, number][] };
  const raw = (json.prices ?? []).map(([time, price]) => ({ time, price }));
  return downsampleRaw(raw);
}

async function fetchCryptoSpot(ids: string[]) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  const response = await fetch(url, { cache: "no-store", headers: FETCH_HEADERS });
  if (!response.ok) return {};
  return (await response.json()) as Record<string, { usd?: number; usd_24h_change?: number }>;
}

async function fetchStockHistory(symbol: string): Promise<RawPricePoint[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1h&range=7d`;
  const response = await fetch(url, { cache: "no-store", headers: FETCH_HEADERS });
  if (!response.ok) return [];
  const json = (await response.json()) as {
    chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ close?: Array<number | null> }> } }> };
  };
  const result = json.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const raw: RawPricePoint[] = [];
  for (let index = 0; index < timestamps.length; index += 1) {
    const price = closes[index];
    if (price == null || !Number.isFinite(price)) continue;
    raw.push({ time: timestamps[index] * 1000, price });
  }
  return downsampleRaw(raw);
}

export async function GET() {
  try {
    const cryptoAssets = MARKET_ASSETS.filter((asset) => asset.coingeckoId);
    const stockAssets = MARKET_ASSETS.filter((asset) => asset.yahooSymbol);

    const spotMap = await fetchCryptoSpot(cryptoAssets.map((asset) => asset.coingeckoId!));

    const settled = await Promise.allSettled(
      MARKET_ASSETS.map(async (asset) => {
        if (asset.coingeckoId) {
          const points = await fetchCryptoHistory(asset.coingeckoId);
          return { id: asset.id, points };
        }
        if (asset.yahooSymbol) {
          const points = await fetchStockHistory(asset.yahooSymbol);
          return { id: asset.id, points };
        }
        return { id: asset.id, points: [] as RawPricePoint[] };
      }),
    );

    const seriesByAsset: Record<string, RawPricePoint[]> = {};
    for (const result of settled) {
      if (result.status === "fulfilled" && result.value.points.length >= 2) {
        seriesByAsset[result.value.id] = result.value.points;
      }
    }

    const chart = buildIndexedChart(seriesByAsset);
    if (!chart.length) {
      return NextResponse.json({ error: "No market series available." }, { status: 502 });
    }

    const quotes = MARKET_ASSETS.filter((asset) => seriesByAsset[asset.id]).map((asset) => {
      const spot = asset.coingeckoId ? spotMap[asset.coingeckoId] : undefined;
      const last = seriesByAsset[asset.id][seriesByAsset[asset.id].length - 1]?.price ?? 0;
      const first = seriesByAsset[asset.id][0]?.price ?? last;
      const change7d = first > 0 ? ((last - first) / first) * 100 : 0;
      return {
        id: asset.id,
        name: asset.name,
        symbol: asset.symbol,
        kind: asset.kind,
        color: asset.color,
        price: spot?.usd ?? last,
        change24h: spot?.usd_24h_change ?? null,
        change7d: Math.round(change7d * 100) / 100,
      };
    });

    return NextResponse.json(
      {
        currency: "USD",
        indexed: true,
        indexLabel: "7d performance (base 100)",
        series: chart,
        assets: quotes,
        updatedAt: new Date().toISOString(),
        sources: ["coingecko", "yahoo-finance"],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Failed to load market data." }, { status: 500 });
  }
}
