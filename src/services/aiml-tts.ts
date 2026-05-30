import { getPlatformEnv } from "@/lib/secrets/platform-secrets";
import { isAimlConfigured } from "@/lib/llm/client";

const AIML_TTS_URL = "https://api.aimlapi.com/v1/tts";

export class AimlTtsError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AimlTtsError";
  }
}

export function getAimlTtsModel() {
  return process.env.AIML_TTS_MODEL?.trim() || "openai/tts-1";
}

export function getAimlTtsVoice() {
  return process.env.AIML_TTS_VOICE?.trim() || "nova";
}

export function getAimlTtsSpeed(playbackSpeed = 1) {
  const envSpeed = Number(process.env.AIML_TTS_SPEED ?? 1.08);
  const base = Number.isFinite(envSpeed) ? envSpeed : 1.08;
  return Math.min(4, Math.max(0.25, base * playbackSpeed));
}

type AimlTtsJson = {
  audio?: string | { url?: string };
};

function extractAudioUrl(payload: AimlTtsJson) {
  if (!payload.audio) return null;
  if (typeof payload.audio === "string") return payload.audio;
  return payload.audio.url ?? null;
}

/** AIML text-to-speech fallback when Speechmatics is unavailable. */
export async function synthesizeAimlSpeech(text: string, playbackSpeed = 1) {
  if (!isAimlConfigured()) return null;

  const apiKey = getPlatformEnv("AIML_API_KEY");
  if (!apiKey) return null;
  const trimmed = text.trim().slice(0, 4096);
  if (!trimmed) return null;

  const response = await fetch(AIML_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "audio/mpeg, audio/wav, application/json",
    },
    body: JSON.stringify({
      model: getAimlTtsModel(),
      text: trimmed,
      voice: getAimlTtsVoice(),
      response_format: "mp3",
      speed: getAimlTtsSpeed(playbackSpeed),
    }),
    signal: AbortSignal.timeout(14_000),
  });

  if (!response.ok) {
    const details = await response.json().catch(() => response.text().catch(() => undefined));
    throw new AimlTtsError(
      typeof details === "object" && details && "message" in details
        ? String((details as { message?: string }).message)
        : `AIML TTS failed (${response.status})`,
      response.status,
      details,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("audio")) {
    return response.arrayBuffer();
  }

  const payload = (await response.json()) as AimlTtsJson;
  const audioUrl = extractAudioUrl(payload);
  if (!audioUrl) {
    throw new AimlTtsError("AIML TTS returned no audio URL.", 502, payload);
  }

  const audioResponse = await fetch(audioUrl, { signal: AbortSignal.timeout(10_000) });
  if (!audioResponse.ok) {
    throw new AimlTtsError(`Failed to download AIML audio (${audioResponse.status}).`, 502);
  }

  return audioResponse.arrayBuffer();
}
