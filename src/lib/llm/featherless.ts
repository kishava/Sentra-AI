import OpenAI from "openai";
import { createChatCompletion, getLlmClient } from "@/lib/llm/client";
import { getPlatformEnv } from "@/lib/secrets/platform-secrets";

const FEATHERLESS_BASE_URL = "https://api.featherless.ai/v1";

export function isFeatherlessConfigured() {
  return Boolean(getPlatformEnv("FEATHERLESS_API_KEY"));
}

export function getFeatherlessClient(): OpenAI | null {
  const apiKey = getPlatformEnv("FEATHERLESS_API_KEY");
  if (!apiKey) return null;

  return new OpenAI({
    apiKey,
    baseURL: getPlatformEnv("FEATHERLESS_BASE_URL") || FEATHERLESS_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer": process.env.SENTRA_APP_URL?.trim() || "http://localhost:3001",
      "X-Title": "Sentra AI",
    },
  });
}

export function getFeatherlessChatModel() {
  return (
    process.env.FEATHERLESS_MODEL_CHAT?.trim() || "meta-llama/Llama-3.3-70B-Instruct"
  );
}

export function getFeatherlessFastModel() {
  return process.env.FEATHERLESS_MODEL_FAST?.trim() || "Qwen/Qwen2.5-7B-Instruct";
}

export function getFeatherlessVisionModel() {
  return process.env.FEATHERLESS_MODEL_VISION?.trim() || "google/gemma-3-27b-it";
}

/** Prefer AIML when both are configured; invalid Featherless keys should not block briefings. */
export function getAgentInferenceClient() {
  const prefer = process.env.SENTRA_AGENT_PROVIDER?.trim().toLowerCase();
  if (prefer === "featherless") {
    return getFeatherlessClient() ?? getLlmClient();
  }
  return getLlmClient() ?? getFeatherlessClient();
}

export function getAgentInferenceModel() {
  return getFeatherlessChatModel();
}

export async function createFeatherlessChatCompletion(
  params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
) {
  const client = getFeatherlessClient();
  if (!client) {
    throw new Error("FEATHERLESS_API_KEY is not configured.");
  }
  return createChatCompletion(client, params);
}
