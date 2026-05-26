import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { getLatestSignals } from "@/lib/db/intelligence";
import { signalStream } from "@/data/mock-intelligence";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    if (auth.localMode || !auth.supabase) {
      return NextResponse.json({ signals: signalStream, source: "sample" });
    }

    const signals = await getLatestSignals(auth.supabase, auth.user.id, 30);

    return NextResponse.json({
      signals: signals.length ? signals : signalStream,
      source: signals.length ? "live" : "sample",
    });
  } catch (error) {
    console.error("Signals route failed", error);
    return NextResponse.json({ signals: signalStream, source: "sample" });
  }
}
