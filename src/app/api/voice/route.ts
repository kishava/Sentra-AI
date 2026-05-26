import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { ElevenLabsError, synthesizeSpeech } from "@/services/elevenlabs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    const limited = await checkRateLimit(auth.user.id, "voice");
    if (!limited.allowed) {
      return NextResponse.json({ error: limited.message }, { status: 429 });
    }

    const body = (await request.json()) as { text?: string };
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const audio = await synthesizeSpeech(text.slice(0, 2500));

    if (!audio) {
      return NextResponse.json({
        demo: true,
        message: "ElevenLabs keys are not configured. Demo voice orb is active.",
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
    if (error instanceof ElevenLabsError) {
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
