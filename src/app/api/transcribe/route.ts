import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensurePlatformSecrets } from "@/lib/secrets/platform-secrets";
import { transcribeAudio } from "@/services/openai";
import { AimlSttError } from "@/services/aiml-stt";
import { isSpeechmaticsSttConfigured, transcribeSpeechmaticsAudio, SpeechmaticsSttError } from "@/services/speechmatics-stt";

export const runtime = "nodejs";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await ensurePlatformSecrets();
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    const limited = await checkRateLimit(auth.user.id, "transcribe");
    if (!limited.allowed) {
      return NextResponse.json({ error: limited.message }, { status: 429 });
    }

    const formData = await request.formData();
    const audio = formData.get("audio");
    const context = formData.get("context");

    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: "Audio recording is required" }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: "Audio recording must be smaller than 25 MB" }, { status: 413 });
    }

    const contextText = typeof context === "string" ? context.trim() : undefined;
    const languageRaw = formData.get("language");
    const language = typeof languageRaw === "string" && languageRaw.trim() ? languageRaw.trim() : "en";
    let provider: "speechmatics" | "aiml" = "aiml";
    let text: string | null = null;

    if (isSpeechmaticsSttConfigured()) {
      text = await transcribeSpeechmaticsAudio(audio, contextText, language);
      if (text) provider = "speechmatics";
    }

    if (!text) {
      text = await transcribeAudio(audio, contextText);
      provider = "aiml";
    }

    if (!text) {
      return NextResponse.json({ error: "No speech detected in the recording" }, { status: 422 });
    }

    return NextResponse.json({ text, provider });
  } catch (error) {
    console.error("Transcription route failed", error);
    if (error instanceof SpeechmaticsSttError || error instanceof AimlSttError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to transcribe microphone audio",
      },
      { status: 500 },
    );
  }
}
