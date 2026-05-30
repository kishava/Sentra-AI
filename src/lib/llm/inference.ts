import type OpenAI from "openai";
import {
  createChatCompletion,
  getAnalysisModel,
  getChatModel,
  getIntentModel,
  getLlmClient,
} from "@/lib/llm/client";
import {
  getFeatherlessChatModel,
  getFeatherlessClient,
  getFeatherlessFastModel,
} from "@/lib/llm/featherless";

type ChatCompletionBody = OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;

export function isLlmAuthError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message?: unknown }).message)
        : String(error);
  return /401|403|unauthorized|signed in|invalid.*api.?key|authentication/i.test(message);
}

type InferenceProvider = "aiml" | "featherless";

function buildProviderChain(preferFeatherless: boolean) {
  const aiml = getLlmClient();
  const featherless = getFeatherlessClient();
  const chain: Array<{
    provider: InferenceProvider;
    client: OpenAI;
    model: string;
  }> = [];

  const push = (provider: InferenceProvider, client: OpenAI | null, model: string) => {
    if (!client) return;
    if (chain.some((entry) => entry.provider === provider)) return;
    chain.push({ provider, client, model });
  };

  if (preferFeatherless) {
    push("featherless", featherless, getFeatherlessChatModel());
    push("aiml", aiml, getChatModel());
  } else {
    push("aiml", aiml, getChatModel());
    push("featherless", featherless, getFeatherlessChatModel());
  }

  return chain;
}

/** Try AIML first (default), then Featherless when the primary provider rejects the API key. */
export async function createChatCompletionWithFallback(
  params: Omit<ChatCompletionBody, "model">,
  options?: {
    aimlModel?: string;
    featherlessModel?: string;
    preferFeatherless?: boolean;
  },
) {
  const preferFeatherless =
    options?.preferFeatherless ??
    process.env.SENTRA_AGENT_PROVIDER?.trim().toLowerCase() === "featherless";

  const chain = buildProviderChain(preferFeatherless);
  if (!chain.length) {
    throw new Error("Configure AIML_API_KEY or FEATHERLESS_API_KEY in the Supabase vault.");
  }

  let lastError: unknown;
  for (const entry of chain) {
    const model =
      entry.provider === "aiml"
        ? options?.aimlModel ?? getAnalysisModel()
        : options?.featherlessModel ?? getFeatherlessChatModel();

    try {
      const response = await createChatCompletion(entry.client, { ...params, model });
      return { response, provider: entry.provider };
    } catch (error) {
      lastError = error;
      if (!isLlmAuthError(error)) throw error;
      console.warn(`[llm] ${entry.provider} auth failed, trying next provider`);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All inference providers rejected the request. Check API keys in Settings.");
}

export async function createIntentCompletionWithFallback(
  params: Omit<ChatCompletionBody, "model">,
) {
  const preferFeatherless = process.env.SENTRA_AGENT_PROVIDER?.trim().toLowerCase() === "featherless";
  return createChatCompletionWithFallback(params, {
    aimlModel: getIntentModel(),
    featherlessModel: getFeatherlessFastModel(),
    preferFeatherless,
  });
}
