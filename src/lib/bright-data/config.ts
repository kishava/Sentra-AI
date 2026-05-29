import { getPlatformEnv } from "@/lib/secrets/platform-secrets";
import type { BrightDataRequest } from "@/types/intelligence";

export type BrightDataMode = "serp" | "unlocker" | "scraper" | "browser";

/** Production deploy (Vercel/host) — demo fallback disabled unless explicitly allowed. */
export function isProductionDeploy() {
  if (process.env.VERCEL === "1") return true;
  return process.env.NODE_ENV === "production";
}

/** Local dev may use sample evidence when Bright Data zones are missing. */
export function allowBrightDataDemoFallback() {
  if (process.env.SENTRA_ALLOW_DEMO_FALLBACK === "true") return true;
  if (process.env.SENTRA_ALLOW_DEMO_FALLBACK === "false") return false;
  return !isProductionDeploy();
}

export function requiresLiveBrightData() {
  return !allowBrightDataDemoFallback();
}

export class BrightDataNotConfiguredError extends Error {
  constructor(
    message: string,
    public mode: BrightDataMode,
    public reason: "missing_api_key" | "missing_endpoint" | "missing_zone" | "missing_target_url",
  ) {
    super(message);
    this.name = "BrightDataNotConfiguredError";
  }
}

export class BrightDataCollectionError extends Error {
  constructor(
    message: string,
    public mode: BrightDataMode,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "BrightDataCollectionError";
  }
}

export function getBrightDataReadiness(mode: BrightDataMode = "serp", targetUrl?: string) {
  const apiKey = Boolean(getPlatformEnv("BRIGHT_DATA_API_KEY"));
  const endpointKey =
    mode === "serp"
      ? "BRIGHT_DATA_SERP_ENDPOINT"
      : mode === "unlocker"
        ? "BRIGHT_DATA_WEB_UNLOCKER_ENDPOINT"
        : "BRIGHT_DATA_SCRAPER_ENDPOINT";
  const endpoint = Boolean(getPlatformEnv(endpointKey));
  const serpZone = Boolean(getPlatformEnv("BRIGHT_DATA_SERP_ZONE"));
  const unlockerZone = Boolean(getPlatformEnv("BRIGHT_DATA_WEB_UNLOCKER_ZONE"));
  const effectiveMode = mode === "scraper" && targetUrl ? "unlocker" : mode;
  const needsZone = effectiveMode === "serp" || effectiveMode === "unlocker";
  const zoneReady = effectiveMode === "serp" ? serpZone : effectiveMode === "unlocker" ? unlockerZone : true;
  const needsUrl = effectiveMode === "unlocker";
  const urlReady = !needsUrl || Boolean(targetUrl?.trim());

  const ready = apiKey && endpoint && (!needsZone || zoneReady) && urlReady;

  let message = "Bright Data is configured for live GTM collection.";
  if (!apiKey) message = "Add BRIGHT_DATA_API_KEY to the Supabase vault (npm run secrets:sync).";
  else if (!endpoint) message = `Set ${endpointKey} in the vault.`;
  else if (needsZone && !zoneReady) {
    message =
      effectiveMode === "serp"
        ? "Create a SERP API zone and set BRIGHT_DATA_SERP_ZONE."
        : "Create a Web Unlocker zone and set BRIGHT_DATA_WEB_UNLOCKER_ZONE.";
  } else if (needsUrl && !urlReady) {
    message = "Web Unlocker collection requires an HTTPS target URL.";
  }

  return {
    ready,
    apiKey,
    endpoint,
    serpZone,
    unlockerZone,
    mode: effectiveMode,
    message,
    demoFallbackAllowed: allowBrightDataDemoFallback(),
    production: isProductionDeploy(),
  };
}

export function assertBrightDataReady(request: BrightDataRequest) {
  const mode = (request.mode ?? "serp") as BrightDataMode;
  const readiness = getBrightDataReadiness(mode, request.targetUrl);
  if (readiness.ready || allowBrightDataDemoFallback()) return readiness;

  if (!readiness.apiKey) {
    throw new BrightDataNotConfiguredError(readiness.message, readiness.mode, "missing_api_key");
  }
  if (!readiness.endpoint) {
    throw new BrightDataNotConfiguredError(readiness.message, readiness.mode, "missing_endpoint");
  }
  if ((readiness.mode === "serp" || readiness.mode === "unlocker") && !readiness.serpZone && !readiness.unlockerZone) {
    throw new BrightDataNotConfiguredError(readiness.message, readiness.mode, "missing_zone");
  }
  if (readiness.mode === "unlocker" && !request.targetUrl?.trim()) {
    throw new BrightDataNotConfiguredError(readiness.message, readiness.mode, "missing_target_url");
  }

  throw new BrightDataNotConfiguredError(readiness.message, readiness.mode, "missing_zone");
}
