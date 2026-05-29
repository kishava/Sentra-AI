import OpenAI from "openai";
import { getPlatformEnv } from "@/lib/secrets/platform-secrets";
import { isFeatherlessConfigured } from "@/lib/llm/featherless";

const AIML_DEFAULT_BASE_URL = "https://api.aimlapi.com/v1";

export function isAimlConfigured() {
  return Boolean(getPlatformEnv("AIML_API_KEY"));
}

/** At least one inference provider is configured. */
export function isLlmConfigured() {
  return isAimlConfigured() || isFeatherlessConfigured();
}

/** All LLM traffic routes through AI/ML API (OpenAI-compatible gateway). */
export function getLlmClient(): OpenAI | null {
  const aimlKey = getPlatformEnv("AIML_API_KEY");
  if (!aimlKey) return null;

  return new OpenAI({
    apiKey: aimlKey,
    baseURL: getPlatformEnv("AIML_BASE_URL") || AIML_DEFAULT_BASE_URL,
  });
}

export function getLlmProviderLabel(): "aiml" | null {
  return isAimlConfigured() ? "aiml" : null;
}

export function getAnalysisModel() {
  return process.env.AIML_MODEL_ANALYSIS?.trim() || "gpt-4o-mini";
}

export function getChatModel() {
  return process.env.AIML_MODEL_CHAT?.trim() || "gpt-4o";
}

export function getSearchModel() {
  return process.env.AIML_MODEL_SEARCH?.trim() || "gpt-4o-search-preview";
}

export function getSearchFallbackModel() {
  return process.env.AIML_MODEL_SEARCH_MINI?.trim() || "gpt-4o-mini-search-preview";
}

/** AIML live-web search tuning for gpt-4o-search-preview (and mini variant). */
export function getLiveSearchWebOptions(): {
  search_context_size: "low" | "medium" | "high";
  user_location: {
    type: "approximate";
    approximate: { country: string };
  };
} {
  const raw = process.env.AIML_SEARCH_CONTEXT_SIZE?.trim().toLowerCase();
  const search_context_size: "low" | "medium" | "high" =
    raw === "low" || raw === "high" ? raw : "medium";
  const timezone = process.env.SENTRA_TIMEZONE?.trim() || "Asia/Colombo";
  const country = timezone.includes("Colombo") ? "LK" : timezone.startsWith("America/") ? "US" : "US";

  return {
    search_context_size,
    user_location: {
      type: "approximate" as const,
      approximate: { country },
    },
  };
}

export function getIntentModel() {
  return process.env.AIML_MODEL_INTENT?.trim() || "gpt-4o-mini";
}

export function getWorldModel() {
  return process.env.AIML_MODEL_WORLD?.trim() || "gpt-4o";
}

export function getVisionModel() {
  return process.env.AIML_MODEL_VISION?.trim() || "gpt-4o";
}

export function getTranscribeModel() {
  return process.env.AIML_MODEL_TRANSCRIBE?.trim() || "whisper-1";
}

/** Search / reasoning models on AIML often reject temperature and other sampling params. */
export function modelSupportsTemperature(model: string) {
  const id = model.toLowerCase();
  if (id.includes("search")) return false;
  if (/^o[134]/.test(id) || id.includes("-o1") || id.includes("-o3")) return false;
  return true;
}

export function getModelSamplingOptions(model: string, temperature: number) {
  return modelSupportsTemperature(model) ? { temperature } : {};
}

export function isIncompatibleModelParamError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message?: unknown }).message)
        : String(error);
  return /incompatible request argument|unsupported (?:parameter|value)|temperature|response_format/i.test(
    message,
  );
}

type ChatCompletionBody = OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;

type LiveSearchChatBody = ChatCompletionBody & {
  web_search_options?: ReturnType<typeof getLiveSearchWebOptions>;
};

export async function createLiveSearchChatCompletion(
  client: OpenAI,
  params: Omit<ChatCompletionBody, "temperature">,
) {
  const body: LiveSearchChatBody = {
    ...params,
    web_search_options: getLiveSearchWebOptions(),
  };

  try {
    return await client.chat.completions.create(body as ChatCompletionBody);
  } catch (error) {
    if (isIncompatibleModelParamError(error) && "web_search_options" in body) {
      const retryBody = { ...params };
      return await client.chat.completions.create(retryBody as ChatCompletionBody);
    }
    throw error;
  }
}

export async function createChatCompletion(client: OpenAI, params: ChatCompletionBody) {
  const sampling = getModelSamplingOptions(params.model, params.temperature ?? 0.35);
  const body: ChatCompletionBody = {
    ...params,
    ...sampling,
  };
  if (!modelSupportsTemperature(params.model)) {
    delete body.temperature;
  }

  try {
    return await client.chat.completions.create(body);
  } catch (error) {
    if (isIncompatibleModelParamError(error) && ("temperature" in body || "response_format" in body)) {
      const retryBody = { ...body };
      delete retryBody.temperature;
      delete retryBody.response_format;
      return await client.chat.completions.create(retryBody);
    }
    throw error;
  }
}
