export type RawPricePoint = { time: number; price: number };

export type MarketSeriesRow = {
  label: string;
  time: number;
  [assetId: string]: string | number;
};

export function downsampleRaw(prices: RawPricePoint[], maxPoints = 48): RawPricePoint[] {
  if (prices.length <= maxPoints) return prices;
  const step = Math.ceil(prices.length / maxPoints);
  const sampled: RawPricePoint[] = [];
  for (let index = 0; index < prices.length; index += step) {
    sampled.push(prices[index]);
  }
  const last = prices[prices.length - 1];
  if (sampled[sampled.length - 1]?.time !== last.time) sampled.push(last);
  return sampled;
}

export function formatTimeLabel(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

/** Index each asset to 100 at series start so crypto & stocks share one axis (% vs 7d open). */
export function buildIndexedChart(
  seriesByAsset: Record<string, RawPricePoint[]>,
  pointCount = 48,
): MarketSeriesRow[] {
  const assetIds = Object.keys(seriesByAsset).filter((id) => seriesByAsset[id]?.length);
  if (!assetIds.length) return [];

  const start = Math.min(...assetIds.map((id) => seriesByAsset[id][0].time));
  const end = Math.max(...assetIds.map((id) => seriesByAsset[id][seriesByAsset[id].length - 1].time));
  const rows: MarketSeriesRow[] = [];

  for (let index = 0; index < pointCount; index += 1) {
    const time =
      pointCount === 1 ? start : start + ((end - start) * index) / (pointCount - 1);
    const row: MarketSeriesRow = {
      time: Math.round(time),
      label: formatTimeLabel(time),
    };

    for (const assetId of assetIds) {
      const points = seriesByAsset[assetId];
      const price = interpolatePrice(points, time);
      const base = points[0].price;
      row[assetId] = base > 0 ? Math.round((price / base) * 1000) / 10 : 100;
    }
    rows.push(row);
  }

  return rows;
}

function interpolatePrice(points: RawPricePoint[], time: number) {
  if (time <= points[0].time) return points[0].price;
  const last = points[points.length - 1];
  if (time >= last.time) return last.price;

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const next = points[index];
    if (time >= prev.time && time <= next.time) {
      const span = next.time - prev.time;
      if (span <= 0) return next.price;
      const weight = (time - prev.time) / span;
      return prev.price + (next.price - prev.price) * weight;
    }
  }
  return last.price;
}
