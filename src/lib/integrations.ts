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
    brightData: {
      apiKey: brightDataKey,
      serpZone,
      unlockerZone,
      ready: brightDataKey && (serpZone || unlockerZone),
      message: !brightDataKey
        ? "Add BRIGHT_DATA_API_KEY to .env.local"
        : !serpZone && !unlockerZone
          ? "Create SERP or Web Unlocker zones in Bright Data and set BRIGHT_DATA_SERP_ZONE / BRIGHT_DATA_WEB_UNLOCKER_ZONE"
          : "Bright Data is configured",
    },
  };
}
