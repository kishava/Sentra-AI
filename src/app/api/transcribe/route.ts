import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { transcribeAudio } from "@/services/openai";

export const runtime = "nodejs";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

export async function POST(request: Request) {
  try {
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

    const text = await transcribeAudio(audio, typeof context === "string" ? context.trim() : undefined);
    if (!text) {
      return NextResponse.json({ error: "No speech detected in the recording" }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Transcription route failed", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to transcribe microphone audio",
      },
      { status: 500 },
    );
  }
}
