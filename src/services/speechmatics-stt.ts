import { getPlatformEnv } from "@/lib/secrets/platform-secrets";

const DEFAULT_ASR_URL = "https://asr.api.speechmatics.com/v2";

export class SpeechmaticsSttError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "SpeechmaticsSttError";
  }
}

export function isSpeechmaticsSttConfigured() {
  return Boolean(getPlatformEnv("SPEECHMATICS_API_KEY")?.trim());
}

function getAsrBaseUrl() {
  return process.env.SPEECHMATICS_ASR_URL?.trim() || DEFAULT_ASR_URL;
}

async function waitForJob(apiKey: string, jobId: string, timeoutMs = 45_000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const response = await fetch(`${getAsrBaseUrl()}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => undefined);
      throw new SpeechmaticsSttError(`Speechmatics job status failed (${response.status})`, response.status, details);
    }

    const payload = (await response.json()) as { job?: { status?: string } };
    const status = payload.job?.status;

    if (status === "done") return;
    if (status === "rejected" || status === "deleted") {
      throw new SpeechmaticsSttError("Speechmatics rejected the transcription job.", 422);
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  throw new SpeechmaticsSttError("Speechmatics transcription timed out.", 504);
}

function extractTranscript(payload: unknown) {
  const results = (payload as { results?: Array<{ alternatives?: Array<{ content?: string }> }> })?.results ?? [];
  return results
    .map((item) => item.alternatives?.[0]?.content ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Batch speech-to-text via Speechmatics ASR API. */
export async function transcribeSpeechmaticsAudio(file: File, context?: string) {
  const apiKey = getPlatformEnv("SPEECHMATICS_API_KEY");
  if (!apiKey) return null;

  const config = {
    type: "transcription",
    transcription_config: {
      language: "en",
      operating_point: "enhanced",
      additional_vocab: [
        { content: "Sentra" },
        { content: "Bright Data" },
        { content: "GTM" },
        ...(context
          ? context
              .split(/\s+/)
              .slice(0, 12)
              .map((word) => ({ content: word.replace(/[^\w-]/g, "") }))
              .filter((item) => item.content.length > 2)
          : []),
      ],
    },
  };

  const formData = new FormData();
  formData.append("config", JSON.stringify(config));
  formData.append("data_file", file, file.name || "recording.webm");

  const createResponse = await fetch(`${getAsrBaseUrl()}/jobs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
    signal: AbortSignal.timeout(20_000),
  });

  if (!createResponse.ok) {
    const details = await createResponse.text().catch(() => undefined);
    throw new SpeechmaticsSttError(
      `Speechmatics transcription submit failed (${createResponse.status})`,
      createResponse.status,
      details,
    );
  }

  const created = (await createResponse.json()) as { id?: string };
  if (!created.id) {
    throw new SpeechmaticsSttError("Speechmatics did not return a job id.", 502);
  }

  await waitForJob(apiKey, created.id);

  const transcriptResponse = await fetch(`${getAsrBaseUrl()}/jobs/${created.id}/transcript?format=json-v2`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!transcriptResponse.ok) {
    const details = await transcriptResponse.text().catch(() => undefined);
    throw new SpeechmaticsSttError(
      `Speechmatics transcript fetch failed (${transcriptResponse.status})`,
      transcriptResponse.status,
      details,
    );
  }

  const transcriptPayload = await transcriptResponse.json();
  const text = extractTranscript(transcriptPayload);
  return text || null;
}
