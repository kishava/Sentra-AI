import axios from "axios";
import { createHash } from "crypto";
import { signalStream } from "@/data/mock-intelligence";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformEnv } from "@/lib/secrets/platform-secrets";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import type { BrightDataRequest } from "@/types/intelligence";

type BrightDataEvidence = {
  provider: "bright-data" | "demo";
  query: string;
  evidence: string;
  raw?: unknown;
  cacheHit?: boolean;
};

const endpointByMode = {
  serp: "BRIGHT_DATA_SERP_ENDPOINT",
  unlocker: "BRIGHT_DATA_WEB_UNLOCKER_ENDPOINT",
  scraper: "BRIGHT_DATA_SCRAPER_ENDPOINT",
  browser: "BRIGHT_DATA_SCRAPER_ENDPOINT",
} as const;

const zoneByMode = {
  serp: "BRIGHT_DATA_SERP_ZONE",
  unlocker: "BRIGHT_DATA_WEB_UNLOCKER_ZONE",
} as const;

type BrightDataZone = { name: string; type: string };

let resolvedZones: { serp?: string; unlocker?: string } | null = null;

function getCacheTtlSeconds() {
  const raw = Number(getPlatformEnv("BRIGHT_DATA_CACHE_TTL_SECONDS") ?? 900);
  return Number.isFinite(raw) && raw > 0 ? raw : 900;
}

function buildCacheKey(mode: string, zone: string, query: string, targetUrl?: string) {
  const payload = `${mode}|${zone}|${query}|${targetUrl ?? ""}`;
  return createHash("sha256").update(payload).digest("hex");
}

async function readCache(cacheKey: string): Promise<BrightDataEvidence | null> {
  if (!getSupabaseServiceRoleKey()) return null;

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("bd_cache")
      .select("payload, expires_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (!data || new Date(data.expires_at) < new Date()) {
      if (data) await admin.from("bd_cache").delete().eq("cache_key", cacheKey);
      return null;
    }

    const cached = data.payload as BrightDataEvidence;
    return { ...cached, cacheHit: true };
  } catch {
    return null;
  }
}

async function writeCache(cacheKey: string, value: BrightDataEvidence) {
  if (!getSupabaseServiceRoleKey()) return;

  try {
    const admin = createAdminClient();
    const expiresAt = new Date(Date.now() + getCacheTtlSeconds() * 1000).toISOString();
    await admin.from("bd_cache").upsert({
      cache_key: cacheKey,
      payload: value,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error("Bright Data cache write failed", error);
  }
}

async function fetchActiveBrightDataZones(apiKey: string) {
  const response = await axios.get<BrightDataZone[]>("https://api.brightdata.com/zone/get_active_zones", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    timeout: 15000,
  });

  const zones = response.data ?? [];
  return {
    serp: zones.find((zone) => zone.type === "serp")?.name,
    unlocker: zones.find((zone) => zone.type === "unblocker" || zone.type === "unlocker")?.name,
  };
}

export async function discoverBrightDataZones(apiKey: string): Promise<{ serp?: string; unlocker?: string }> {
  const managementKey = getPlatformEnv("BRIGHT_DATA_MANAGEMENT_KEY");
  const keys = [apiKey, managementKey].filter(Boolean) as string[];

  for (const key of keys) {
    try {
      return await fetchActiveBrightDataZones(key);
    } catch (error) {
      console.error("Unable to discover Bright Data zones with provided key", error);
    }
  }

  return {};
}

async function resolveBrightDataZones(apiKey: string) {
  if (resolvedZones) return resolvedZones;

  const envSerp = getPlatformEnv("BRIGHT_DATA_SERP_ZONE");
  const envUnlocker = getPlatformEnv("BRIGHT_DATA_WEB_UNLOCKER_ZONE");
  if (envSerp || envUnlocker) {
    resolvedZones = { serp: envSerp, unlocker: envUnlocker };
    return resolvedZones;
  }

  resolvedZones = await discoverBrightDataZones(apiKey);
  return resolvedZones;
}

function getDemoEvidence(query: string): BrightDataEvidence {
  return {
    provider: "demo",
    query,
    evidence: signalStream
      .map((signal) => `${signal.title}: ${signal.summary} Source=${signal.source}`)
      .join("\n"),
  };
}

export function collectDemoWebIntelligence(query: string): BrightDataEvidence {
  return getDemoEvidence(query);
}

export async function collectWebIntelligence({
  query,
  targetUrl,
  mode = "serp",
}: BrightDataRequest): Promise<BrightDataEvidence> {
  const effectiveMode = mode === "scraper" && targetUrl ? "unlocker" : mode;
  const endpointKey = endpointByMode[effectiveMode];
  const endpoint = getPlatformEnv(endpointKey);
  const apiKey = getPlatformEnv("BRIGHT_DATA_API_KEY");
  const zoneKey =
    effectiveMode === "serp" || effectiveMode === "unlocker" ? zoneByMode[effectiveMode] : null;
  let zone = zoneKey ? getPlatformEnv(zoneKey) : null;

  if (apiKey && zoneKey && !zone) {
    const zones = await resolveBrightDataZones(apiKey);
    zone = effectiveMode === "serp" ? zones.serp : zones.unlocker;
  }

  if (!apiKey || !endpoint || (zoneKey && !zone) || (effectiveMode === "unlocker" && !targetUrl)) {
    if (apiKey && zoneKey && !zone) {
      console.warn(
        "Bright Data zone not configured. Create a SERP or Web Unlocker zone in the Bright Data control panel.",
      );
    }
    return getDemoEvidence(query);
  }

  const cacheKey = buildCacheKey(effectiveMode, zone!, query, targetUrl);
  const cached = await readCache(cacheKey);
  if (cached) {
    console.info("Bright Data cache hit", { mode: effectiveMode, cacheKey: cacheKey.slice(0, 12) });
    return cached;
  }

  try {
    const payload =
      effectiveMode === "serp"
        ? {
            zone,
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}&brd_json=1&gl=us&hl=en`,
            format: "json",
            method: "GET",
            country: "us",
          }
        : effectiveMode === "unlocker"
          ? {
              zone,
              url: targetUrl,
              format: "json",
              method: "GET",
              country: "us",
              data_format: "markdown",
            }
          : {
              query,
              url: targetUrl,
              parse: true,
              country: "us",
            };

    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    const result: BrightDataEvidence = {
      provider: "bright-data",
      query,
      evidence: JSON.stringify(response.data).slice(0, 8000),
      raw: response.data,
      cacheHit: false,
    };

    console.info("Bright Data collection success", { mode: effectiveMode, provider: "bright-data" });
    await writeCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Bright Data lookup failed; using demo evidence", error);
    return getDemoEvidence(query);
  }
}

export async function monitorCompetitor(targetUrl: string) {
  return collectWebIntelligence({
    query: `Monitor competitor website changes, pricing, product launches, and hiring signals for ${targetUrl}`,
    targetUrl,
    mode: "unlocker",
  });
}
