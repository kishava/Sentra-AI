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
  const message = getErrorMessage(error);
  const status =
    typeof error === "object" && error && "status" in error
      ? Number((error as { status?: unknown }).status)
      : undefined;
  return (
    status === 401 ||
    status === 403 ||
    /401|403|unauthorized|invalid.*api.?key|authentication|api key/i.test(message) ||
    /you must be signed in to access this resource/i.test(message)
  );
}

export function getInferenceAuthErrorMessage() {
  return "AI provider API key was rejected. Update AIML_API_KEY or FEATHERLESS_API_KEY in .env.local (or run npm run secrets:sync), then restart npm run dev. This is not a Sentra sign-in issue.";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return String(error);
}

export function formatInferenceError(error: unknown) {
  if (isLlmAuthError(error)) {
    return getInferenceAuthErrorMessage();
  }
  return error instanceof Error ? error.message : "Sentra AI could not generate a response.";
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
