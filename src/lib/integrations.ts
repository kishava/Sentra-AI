import {
  getAnalysisModel,
  getChatModel,
  getIntentModel,
  getLlmProviderLabel,
  getSearchModel,
  getTranscribeModel,
  getVisionModel,
  getWorldModel,
  isAimlConfigured,
  isLlmConfigured,
} from "@/lib/llm/client";
import {
  getFeatherlessChatModel,
  getFeatherlessVisionModel,
  isFeatherlessConfigured,
} from "@/lib/llm/featherless";
import {
  allowBrightDataDemoFallback,
  isProductionDeploy,
} from "@/lib/bright-data/config";
import { isBrightDataMcpEnabled } from "@/lib/bright-data/config";
import { isSpeechmaticsConfigured } from "@/services/speechmatics-tts";
import { isSpeechmaticsSttConfigured } from "@/services/speechmatics-stt";
import { discoverBrightDataZones } from "@/services/bright-data";
import {
  ensurePlatformSecrets,
  getPlatformEnv,
  getPlatformSecretsSource,
} from "@/lib/secrets/platform-secrets";

function buildBrightDataStatus(
  serpZone: boolean,
  unlockerZone: boolean,
  brightDataKey: boolean,
  extras?: { scraperZone?: boolean; browserZone?: boolean; mcpReady?: boolean },
) {
  const scraperZone = extras?.scraperZone ?? false;
  const browserZone = extras?.browserZone ?? false;
  const mcpReady = extras?.mcpReady ?? false;
  return {
    apiKey: brightDataKey,
    serpZone,
    unlockerZone,
    scraperZone,
    browserZone,
    mcpReady,
    ready: brightDataKey && serpZone && unlockerZone,
    message: !brightDataKey
      ? "Add BRIGHT_DATA_API_KEY to Supabase vault (npm run secrets:sync) or .env.local"
      : !serpZone && !unlockerZone
        ? "Create SERP and Web Unlocker zones in Bright Data, then set BRIGHT_DATA_SERP_ZONE and BRIGHT_DATA_WEB_UNLOCKER_ZONE in .env.local"
        : !serpZone
          ? "Create a SERP API zone in Bright Data and set BRIGHT_DATA_SERP_ZONE in .env.local"
          : !unlockerZone
            ? "Create a Web Unlocker API zone in Bright Data and set BRIGHT_DATA_WEB_UNLOCKER_ZONE in .env.local"
            : "Bright Data is configured",
  };
}

export function getIntegrationStatus() {
  const brightDataKey = Boolean(getPlatformEnv("BRIGHT_DATA_API_KEY"));
  const serpZone = Boolean(getPlatformEnv("BRIGHT_DATA_SERP_ZONE"));
  const unlockerZone = Boolean(getPlatformEnv("BRIGHT_DATA_WEB_UNLOCKER_ZONE"));
  const scraperZone =
    Boolean(getPlatformEnv("BRIGHT_DATA_SCRAPER_ZONE")) ||
    Boolean(getPlatformEnv("BRIGHT_DATA_WEB_UNLOCKER_ZONE"));
  const browserZone = Boolean(getPlatformEnv("BRIGHT_DATA_BROWSER_ZONE"));
  const mcpReady = brightDataKey && isBrightDataMcpEnabled();
  const llmReady = isLlmConfigured();
  const secretsSource = getPlatformSecretsSource();

  return {
    secretsSource,
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
        (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
    ),
    aiml: isAimlConfigured(),
    openai: false,
    llm: {
      ready: llmReady,
      provider: getLlmProviderLabel(),
      models: llmReady
        ? {
            analysis: getAnalysisModel(),
            chat: getChatModel(),
            search: getSearchModel(),
            intent: getIntentModel(),
            world: getWorldModel(),
            vision: getVisionModel(),
            transcribe: getTranscribeModel(),
          }
        : null,
    },
    aimlVoice: isSpeechmaticsConfigured(),
    speechmaticsVoice: isSpeechmaticsConfigured(),
    speechmaticsStt: isSpeechmaticsSttConfigured(),
    featherless: isFeatherlessConfigured(),
    featherlessModels: isFeatherlessConfigured()
      ? {
          chat: getFeatherlessChatModel(),
          vision: getFeatherlessVisionModel(),
        }
      : null,
    brightData: buildBrightDataStatus(serpZone, unlockerZone, brightDataKey, {
      scraperZone,
      browserZone,
      mcpReady,
    }),
    hackathon: {
      track: "GTM Intelligence" as const,
      production: isProductionDeploy(),
      demoFallbackAllowed: allowBrightDataDemoFallback(),
      brightDataLiveRequired: !allowBrightDataDemoFallback(),
    },
  };
}

/** Enriches status by probing the Bright Data account when zone env vars are missing. */
export async function getIntegrationStatusWithDiscovery() {
  await ensurePlatformSecrets();
  const base = getIntegrationStatus();
  const apiKey = getPlatformEnv("BRIGHT_DATA_API_KEY");
  if (!apiKey) {
    return base;
  }

  const discovered = await discoverBrightDataZones(apiKey);
  const serpZone = base.brightData.serpZone || Boolean(discovered.serp);
  const unlockerZone = base.brightData.unlockerZone || Boolean(discovered.unlocker);
  const scraperZone =
    base.brightData.scraperZone ||
    Boolean(getPlatformEnv("BRIGHT_DATA_SCRAPER_ZONE")) ||
    Boolean(discovered.scraper);
  const brightData = buildBrightDataStatus(serpZone, unlockerZone, base.brightData.apiKey, {
    scraperZone,
    browserZone: base.brightData.browserZone || Boolean(discovered.browser),
    mcpReady: base.brightData.mcpReady,
  });
  const envHints: string[] = [];
  if (!base.brightData.serpZone && discovered.serp) envHints.push(`BRIGHT_DATA_SERP_ZONE=${discovered.serp}`);
  if (!base.brightData.unlockerZone && discovered.unlocker) {
    envHints.push(`BRIGHT_DATA_WEB_UNLOCKER_ZONE=${discovered.unlocker}`);
  }
  if (!base.brightData.scraperZone && discovered.scraper) {
    envHints.push(`BRIGHT_DATA_SCRAPER_ZONE=${discovered.scraper}`);
  }
  if (!base.brightData.browserZone && discovered.browser) {
    envHints.push(`BRIGHT_DATA_BROWSER_ZONE=${discovered.browser}`);
  }
  if (envHints.length) {
    brightData.message = `Zones found in your Bright Data account. Add to .env.local: ${envHints.join(" ")}`;
  }

  return { ...base, brightData };
}
