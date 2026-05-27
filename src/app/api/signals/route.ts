import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { getLatestBriefing, getSignalsForRun } from "@/lib/db/intelligence";
import { signalStream } from "@/data/mock-intelligence";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    if (auth.localMode || !auth.supabase) {
      return NextResponse.json(
        { signals: signalStream, source: "sample" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const briefing = await getLatestBriefing(auth.supabase, auth.user.id);
    if (!briefing) {
      return NextResponse.json(
        { signals: signalStream, source: "sample" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const signals = await getSignalsForRun(auth.supabase, auth.user.id, briefing.id);
    const source = briefing.provider === "bright-data" ? "live" : "sample";

    return NextResponse.json(
      {
        signals: signals.length ? signals : signalStream,
        source,
        generatedAt: briefing.created_at,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Signals route failed", error);
    return NextResponse.json(
      { signals: signalStream, source: "sample" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
