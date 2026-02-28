import type { SessionState } from "../jetnet/session";
import { getMarketTrends } from "../jetnet/api";
import type { ModelTrendSignals } from "../../shared/types";

interface CacheEntry {
  data: ModelTrendSignals;
  expiresAt: number;
}

const cache = new Map<number, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getCached(modelId: number): ModelTrendSignals | null {
  const entry = cache.get(modelId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(modelId);
    return null;
  }
  return entry.data;
}

function setCache(modelId: number, data: ModelTrendSignals): void {
  cache.set(modelId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function classifyTrend(
  values: number[] | undefined,
  ascending: "Increasing" | "Improving" | "Rising",
  flat: "Stable" | "Flat",
  descending: "Decreasing" | "Worsening" | "Falling" | "Declining"
): string {
  if (!values || values.length < 2) return flat;

  const recent = values.slice(-3);
  const earlier = values.slice(0, Math.max(1, values.length - 3));

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

  if (earlierAvg === 0) return flat;

  const change = (recentAvg - earlierAvg) / earlierAvg;
  if (change > 0.05) return ascending;
  if (change < -0.05) return descending;
  return flat;
}

function normalizeResponse(
  modelId: number,
  raw: Record<string, unknown>
): ModelTrendSignals {
  const data = (raw as any).markettrendsresult || (raw as any).result || raw;

  const inventoryData = data.inventorycount || data.inventory || [];
  const domData = data.avgdaysonmarket || data.daysonmarket || [];
  const priceData = data.avgaskingprice || data.askingprice || [];
  const transData = data.transactioncount || data.transactions || [];

  const inventoryValues = Array.isArray(inventoryData)
    ? inventoryData.map((d: any) => Number(d.value || d.count || d.y || 0))
    : [];
  const domValues = Array.isArray(domData)
    ? domData.map((d: any) => Number(d.value || d.days || d.y || 0))
    : [];
  const priceValues = Array.isArray(priceData)
    ? priceData.map((d: any) => Number(d.value || d.price || d.y || 0))
    : [];
  const transValues = Array.isArray(transData)
    ? transData.map((d: any) => Number(d.value || d.count || d.y || 0))
    : [];

  const avgDom =
    domValues.length > 0
      ? Math.round(domValues.reduce((a: number, b: number) => a + b, 0) / domValues.length)
      : null;

  const inventoryTrend = classifyTrend(
    inventoryValues,
    "Increasing",
    "Stable",
    "Decreasing"
  ) as "Increasing" | "Stable" | "Decreasing";

  const domTrend = classifyTrend(
    domValues.map((v: number) => -v),
    "Improving",
    "Stable",
    "Worsening"
  ) as "Improving" | "Stable" | "Worsening";

  const askingPriceTrend = classifyTrend(
    priceValues,
    "Rising",
    "Flat",
    "Falling"
  ) as "Rising" | "Flat" | "Falling";

  const transactionVelocityTrend = classifyTrend(
    transValues,
    "Increasing",
    "Stable",
    "Declining"
  ) as "Increasing" | "Stable" | "Declining";

  let heatScore = 0.5;
  let signals = 0;
  let totalWeight = 0;

  if (inventoryTrend === "Decreasing") {
    heatScore += 0.15;
    signals++;
  } else if (inventoryTrend === "Increasing") {
    heatScore -= 0.1;
    signals++;
  }
  totalWeight++;

  if (domTrend === "Improving") {
    heatScore += 0.15;
    signals++;
  } else if (domTrend === "Worsening") {
    heatScore -= 0.1;
    signals++;
  }
  totalWeight++;

  if (askingPriceTrend === "Rising") {
    heatScore += 0.1;
    signals++;
  } else if (askingPriceTrend === "Falling") {
    heatScore -= 0.1;
    signals++;
  }
  totalWeight++;

  if (transactionVelocityTrend === "Increasing") {
    heatScore += 0.1;
    signals++;
  } else if (transactionVelocityTrend === "Declining") {
    heatScore -= 0.1;
    signals++;
  }
  totalWeight++;

  if (avgDom !== null) {
    if (avgDom < 120) heatScore += 0.1;
    else if (avgDom > 300) heatScore -= 0.1;
  }

  heatScore = Math.max(0, Math.min(1, heatScore));

  let marketHeatLabel: "Strong" | "Moderate" | "Weak";
  if (heatScore >= 0.65) marketHeatLabel = "Strong";
  else if (heatScore >= 0.4) marketHeatLabel = "Moderate";
  else marketHeatLabel = "Weak";

  return {
    modelId,
    avgDaysOnMarket: avgDom,
    inventoryTrend,
    domTrend,
    askingPriceTrend,
    transactionVelocityTrend,
    marketHeatScore: Math.round(heatScore * 100) / 100,
    marketHeatLabel,
  };
}

export async function fetchModelTrends(
  modelId: number,
  session: SessionState
): Promise<ModelTrendSignals> {
  const cached = getCached(modelId);
  if (cached) return cached;

  const raw = await getMarketTrends(modelId, session);
  const signals = normalizeResponse(modelId, raw);

  setCache(modelId, signals);
  return signals;
}
