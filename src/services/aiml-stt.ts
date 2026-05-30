import { getPlatformEnv } from "@/lib/secrets/platform-secrets";

const DEFAULT_AIML_BASE = "https://api.aimlapi.com/v1";

export class AimlSttError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AimlSttError";
  }
}

export function getAimlSttModel() {
  return process.env.AIML_MODEL_TRANSCRIBE?.trim() || "#g1_whisper-medium";
}

function getAimlBaseUrl() {
  const base = getPlatformEnv("AIML_BASE_URL") || process.env.AIML_BASE_URL?.trim() || DEFAULT_AIML_BASE;
  return base.replace(/\/$/, "");
}

function extractAimlTranscript(payload: unknown): string | null {
  const root = payload as Record<string, unknown>;
  const output = root.output as Record<string, unknown> | undefined;
  const result = (root.result ?? output) as Record<string, unknown> | undefined;

  if (typeof output?.text === "string" && output.text.trim()) {
    return output.text.trim();
  }

  const results = result?.results as Record<string, unknown> | undefined;
  const channels = results?.channels;

  const readAlternative = (value: unknown) => {
    if (!value || typeof value !== "object") return null;
    const alternatives = (value as { alternatives?: Array<{ transcript?: string }> }).alternatives;
    const transcript = alternatives?.[0]?.transcript?.trim();
    return transcript || null;
  };

  if (Array.isArray(channels)) {
    for (const channel of channels) {
      const transcript = readAlternative(channel);
      if (transcript) return transcript;
    }
  }

  const nested = readAlternative(channels);
  if (nested) return nested;

  return null;
}

async function pollAimlStt(apiKey: string, generationId: string, timeoutMs = 45_000) {
  const started = Date.now();
  const baseUrl = getAimlBaseUrl();
  let delayMs = 350;

  while (Date.now() - started < timeoutMs) {
    const response = await fetch(`${baseUrl}/stt/${generationId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => undefined);
      throw new AimlSttError(`AIML STT status failed (${response.status})`, response.status, details);
    }

    const payload = await response.json();
    const status = String((payload as { status?: string }).status ?? "").toLowerCase();

    if (status === "completed" || status === "done") {
      return extractAimlTranscript(payload);
    }
    if (status === "error" || status === "failed") {
      throw new AimlSttError("AIML STT rejected the audio.", 422, payload);
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    delayMs = Math.min(delayMs * 1.35, 1500);
  }

  throw new AimlSttError("AIML STT timed out.", 504);
}

/** Speech-to-text via AIML STT API (POST /v1/stt/create + poll). */
export async function transcribeAimlAudio(file: File, context?: string) {
  const apiKey = getPlatformEnv("AIML_API_KEY");
  if (!apiKey) return null;

  const baseUrl = getAimlBaseUrl();
  const formData = new FormData();
  formData.append("model", getAimlSttModel());
  formData.append("audio", file, file.name || "recording.webm");

  if (context?.trim()) {
    formData.append("keywords", context.split(/\s+/).slice(0, 20).join(", "));
  }

  const createResponse = await fetch(`${baseUrl}/stt/create`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
    signal: AbortSignal.timeout(20_000),
  });

  if (!createResponse.ok) {
    const details = await createResponse.text().catch(() => undefined);
    throw new AimlSttError(`AIML STT submit failed (${createResponse.status})`, createResponse.status, details);
  }

  const created = (await createResponse.json()) as { generation_id?: string };
  if (!created.generation_id) {
    throw new AimlSttError("AIML STT did not return a generation id.", 502);
  }

  const text = await pollAimlStt(apiKey, created.generation_id);
  return text || null;
}
