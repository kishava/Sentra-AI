import axios from "axios";
import { getPlatformEnv } from "@/lib/secrets/platform-secrets";

export type ResolvedBrightDataZones = {
  serp?: string;
  unlocker?: string;
  scraper?: string;
  browser?: string;
};

type BrightDataZone = { name: string; type: string };

let cachedZones: ResolvedBrightDataZones | null = null;

function mapZoneTypes(zones: BrightDataZone[]): ResolvedBrightDataZones {
  const unlocker = zones.find((z) => z.type === "unblocker" || z.type === "unlocker")?.name;
  return {
    serp: zones.find((z) => z.type === "serp")?.name,
    unlocker,
    scraper:
      zones.find(
        (z) =>
          z.type === "dc" ||
          z.type === "scraper" ||
          z.type === "web_scraper" ||
          z.type === "dca" ||
          z.type === "dataset" ||
          z.type === "res_rotating",
      )?.name || unlocker,
    browser: zones.find(
      (z) =>
        z.type === "browser" ||
        z.type === "browser_api" ||
        z.type === "scr_browser" ||
        z.type === "scraping_browser",
    )?.name,
  };
}

export async function fetchActiveBrightDataZones(apiKey: string): Promise<ResolvedBrightDataZones> {
  const response = await axios.get<BrightDataZone[]>("https://api.brightdata.com/zone/get_active_zones", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    timeout: 15000,
  });
  return mapZoneTypes(response.data ?? []);
}

export async function resolveAllBrightDataZones(force = false): Promise<ResolvedBrightDataZones> {
  if (cachedZones && !force) return cachedZones;

  const fromEnv: ResolvedBrightDataZones = {
    serp: getPlatformEnv("BRIGHT_DATA_SERP_ZONE"),
    unlocker: getPlatformEnv("BRIGHT_DATA_WEB_UNLOCKER_ZONE"),
    scraper: getPlatformEnv("BRIGHT_DATA_SCRAPER_ZONE"),
    browser: getPlatformEnv("BRIGHT_DATA_BROWSER_ZONE"),
  };

  const apiKey = getPlatformEnv("BRIGHT_DATA_API_KEY");
  const managementKey = getPlatformEnv("BRIGHT_DATA_MANAGEMENT_KEY");
  const keys = [apiKey, managementKey].filter(Boolean) as string[];

  let discovered: ResolvedBrightDataZones = {};
  for (const key of keys) {
    try {
      discovered = await fetchActiveBrightDataZones(key);
      if (Object.values(discovered).some(Boolean)) break;
    } catch (error) {
      console.error("Bright Data zone discovery failed", error);
    }
  }

  const unlocker = fromEnv.unlocker || discovered.unlocker;
  cachedZones = {
    serp: fromEnv.serp || discovered.serp,
    unlocker,
    scraper: fromEnv.scraper || discovered.scraper || unlocker,
    browser: fromEnv.browser || discovered.browser,
  };

  return cachedZones;
}

export function invalidateBrightDataZoneCache() {
  cachedZones = null;
}
