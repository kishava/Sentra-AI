const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1/text-to-speech";

export class ElevenLabsError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ElevenLabsError";
  }
}

export async function synthesizeSpeech(text: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || apiKey.includes("your_elevenlabs_api_key_here") || !voiceId) {
    return null;
  }

  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.42,
          similarity_boost: 0.78,
          style: 0.28,
          use_speaker_boost: true,
        },
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      const details = await response
        .json()
        .catch(() => response.text())
        .catch(() => undefined);

      throw new ElevenLabsError(
        getElevenLabsErrorMessage(details) ?? `ElevenLabs request failed: ${response.status}`,
        response.status,
        details,
      );
    }

    return response.arrayBuffer();
  } catch (error) {
    if (error instanceof ElevenLabsError) throw error;
    console.warn("ElevenLabs unavailable, using demo voice fallback", error);
    return null;
  }
}

function getElevenLabsErrorMessage(details: unknown) {
  if (!details || typeof details !== "object") return null;

  const detail = "detail" in details ? details.detail : undefined;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    return typeof detail.message === "string" ? detail.message : null;
  }

  return null;
}
