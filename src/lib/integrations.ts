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
import { discoverBrightDataZones } from "@/services/bright-data";

function buildBrightDataStatus(serpZone: boolean, unlockerZone: boolean, brightDataKey: boolean) {
  return {
    apiKey: brightDataKey,
    serpZone,
    unlockerZone,
    ready: brightDataKey && (serpZone || unlockerZone),
    message: !brightDataKey
      ? "Add BRIGHT_DATA_API_KEY to .env.local"
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
  const brightDataKey = Boolean(process.env.BRIGHT_DATA_API_KEY?.trim());
  const serpZone = Boolean(process.env.BRIGHT_DATA_SERP_ZONE?.trim());
  const unlockerZone = Boolean(process.env.BRIGHT_DATA_WEB_UNLOCKER_ZONE?.trim());
  const llmReady = isLlmConfigured();

  return {
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
    ),
    aiml: isAimlConfigured(),
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
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
    elevenlabs: Boolean(
      process.env.ELEVENLABS_API_KEY?.trim() && process.env.ELEVENLABS_VOICE_ID?.trim(),
    ),
    brightData: buildBrightDataStatus(serpZone, unlockerZone, brightDataKey),
  };
}

/** Enriches status by probing the Bright Data account when zone env vars are missing. */
export async function getIntegrationStatusWithDiscovery() {
  const base = getIntegrationStatus();
  const apiKey = process.env.BRIGHT_DATA_API_KEY?.trim();
  if (!apiKey || (base.brightData.serpZone && base.brightData.unlockerZone)) {
    return base;
  }

  const discovered = await discoverBrightDataZones(apiKey);
  const serpZone = base.brightData.serpZone || Boolean(discovered.serp);
  const unlockerZone = base.brightData.unlockerZone || Boolean(discovered.unlocker);
  const brightData = buildBrightDataStatus(serpZone, unlockerZone, base.brightData.apiKey);
  const envHints: string[] = [];
  if (!base.brightData.serpZone && discovered.serp) envHints.push(`BRIGHT_DATA_SERP_ZONE=${discovered.serp}`);
  if (!base.brightData.unlockerZone && discovered.unlocker) {
    envHints.push(`BRIGHT_DATA_WEB_UNLOCKER_ZONE=${discovered.unlocker}`);
  }
  if (envHints.length) {
    brightData.message = `Zones found in your Bright Data account. Add to .env.local: ${envHints.join(" ")}`;
  }

  return { ...base, brightData };
}
