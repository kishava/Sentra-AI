import OpenAI from "openai";

const AIML_DEFAULT_BASE_URL = "https://api.aimlapi.com/v1";

export function isAimlConfigured() {
  return Boolean(process.env.AIML_API_KEY?.trim());
}

export function isLlmConfigured() {
  return Boolean(process.env.AIML_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim());
}

/** Prefer AIML hackathon key; optional legacy OpenAI key as fallback. */
export function getLlmClient(): OpenAI | null {
  const aimlKey = process.env.AIML_API_KEY?.trim();
  if (aimlKey) {
    return new OpenAI({
      apiKey: aimlKey,
      baseURL: process.env.AIML_BASE_URL?.trim() || AIML_DEFAULT_BASE_URL,
    });
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    return new OpenAI({ apiKey: openaiKey });
  }

  return null;
}

export function getLlmProviderLabel(): "aiml" | "openai" | null {
  if (isAimlConfigured()) return "aiml";
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  return null;
}

export function getAnalysisModel() {
  return (
    process.env.AIML_MODEL_ANALYSIS?.trim() ||
    process.env.OPENAI_MONITOR_INTENT_MODEL?.trim() ||
    "gpt-4o-mini"
  );
}

export function getChatModel() {
  return process.env.AIML_MODEL_CHAT?.trim() || process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o";
}

export function getSearchModel() {
  return process.env.AIML_MODEL_SEARCH?.trim() || "gpt-4o-search-preview";
}

export function getIntentModel() {
  return (
    process.env.AIML_MODEL_INTENT?.trim() ||
    process.env.OPENAI_MONITOR_INTENT_MODEL?.trim() ||
    "gpt-4o-mini"
  );
}

export function getWorldModel() {
  return (
    process.env.AIML_MODEL_WORLD?.trim() ||
    process.env.OPENAI_WORLD_MODEL?.trim() ||
    process.env.OPENAI_CHAT_MODEL?.trim() ||
    "gpt-4o"
  );
}

export function getVisionModel() {
  return process.env.AIML_MODEL_VISION?.trim() || process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o";
}

export function getTranscribeModel() {
  return (
    process.env.AIML_MODEL_TRANSCRIBE?.trim() ||
    process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() ||
    "gpt-4o-transcribe"
  );
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
