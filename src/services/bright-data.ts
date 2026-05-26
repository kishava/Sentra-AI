import axios from "axios";
import { signalStream } from "@/data/mock-intelligence";
import type { BrightDataRequest } from "@/types/intelligence";

type BrightDataEvidence = {
  provider: "bright-data" | "demo";
  query: string;
  evidence: string;
  raw?: unknown;
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

async function resolveBrightDataZones(apiKey: string) {
  if (resolvedZones) return resolvedZones;

  const envSerp = process.env.BRIGHT_DATA_SERP_ZONE?.trim();
  const envUnlocker = process.env.BRIGHT_DATA_WEB_UNLOCKER_ZONE?.trim();
  if (envSerp || envUnlocker) {
    resolvedZones = { serp: envSerp, unlocker: envUnlocker };
    return resolvedZones;
  }

  try {
    const response = await axios.get<BrightDataZone[]>("https://api.brightdata.com/zone/get_active_zones", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      timeout: 15000,
    });

    const zones = response.data ?? [];
    resolvedZones = {
      serp: zones.find((zone) => zone.type === "serp")?.name,
      unlocker: zones.find((zone) => zone.type === "unblocker" || zone.type === "unlocker")?.name,
    };
  } catch (error) {
    console.error("Unable to resolve Bright Data zones", error);
    resolvedZones = {};
  }

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

export async function collectWebIntelligence({
  query,
  targetUrl,
  mode = "serp",
}: BrightDataRequest): Promise<BrightDataEvidence> {
  const endpointKey = endpointByMode[mode];
  const endpoint = process.env[endpointKey];
  const apiKey = process.env.BRIGHT_DATA_API_KEY;
  const zoneKey = mode === "serp" || mode === "unlocker" ? zoneByMode[mode] : null;
  let zone = zoneKey ? process.env[zoneKey]?.trim() : null;

  if (apiKey && zoneKey && !zone) {
    const zones = await resolveBrightDataZones(apiKey);
    zone = mode === "serp" ? zones.serp : zones.unlocker;
  }

  if (!apiKey || !endpoint || (zoneKey && !zone) || (mode === "unlocker" && !targetUrl)) {
    if (apiKey && zoneKey && !zone) {
      console.warn(
        "Bright Data zone not configured. Create a SERP or Web Unlocker zone in the Bright Data control panel.",
      );
    }
    return getDemoEvidence(query);
  }

  try {
    const payload =
      mode === "serp"
        ? {
            zone,
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}&brd_json=1&gl=us&hl=en`,
            format: "json",
            method: "GET",
            country: "us",
          }
        : mode === "unlocker"
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

    const response = await axios.post(
      endpoint,
      payload,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );

    return {
      provider: "bright-data",
      query,
      evidence: JSON.stringify(response.data).slice(0, 8000),
      raw: response.data,
    };
  } catch (error) {
    console.error("Bright Data lookup failed; using demo evidence", error);
    return getDemoEvidence(query);
  }
}

export async function monitorCompetitor(targetUrl: string) {
  return collectWebIntelligence({
    query: `Monitor competitor website changes, pricing, product launches, and hiring signals for ${targetUrl}`,
    targetUrl,
    mode: "scraper",
  });
}
