import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { AimlTtsError, synthesizeSpeech } from "@/services/voice-synthesis";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    const limited = await checkRateLimit(auth.user.id, "voice");
    if (!limited.allowed) {
      return NextResponse.json({ error: limited.message }, { status: 429 });
    }

    const body = (await request.json()) as { text?: string; speed?: number };
    const text = body.text?.trim();
    const speed = typeof body.speed === "number" ? body.speed : 1;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const audio = await synthesizeSpeech(text, speed);

    if (!audio) {
      return NextResponse.json({
        demo: true,
        message: "Add AIML_API_KEY to .env.local for live voice (openai/tts-1 via aimlapi.com).",
      });
    }

    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Voice route failed", error);
    if (error instanceof AimlTtsError) {
      return NextResponse.json(
        {
          error: error.message,
          providerStatus: error.status,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ error: "Unable to synthesize voice" }, { status: 500 });
  }
}
