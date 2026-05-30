import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { appendTimelineEventDb, listTimelineEvents } from "@/lib/db/monitor-workspace";
import { getTimelineForApi } from "@/lib/monitor-timeline";
import type { MonitorTimelineEvent } from "@/types/intelligence";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireApiUser();
    if ("error" in auth) {
      return NextResponse.json({ events: [] });
    }

    if (auth.supabase && !auth.localMode) {
      const events = await listTimelineEvents(auth.supabase, auth.user.id);
      return NextResponse.json({ events });
    }

    const timeline = getTimelineForApi(auth.user.id);
    return NextResponse.json({ events: timeline });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Timeline unavailable.", events: [] },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    const body = (await request.json().catch(() => ({}))) as Omit<
      MonitorTimelineEvent,
      "id" | "timestamp"
    > & { timestamp?: string };

    if (!body.type || !body.summary) {
      return NextResponse.json({ error: "Timeline event type and summary are required." }, { status: 400 });
    }

    if (auth.localMode || !auth.supabase) {
      return NextResponse.json({ ok: true, localMode: true });
    }

    const event = await appendTimelineEventDb(auth.supabase, auth.user.id, body);
    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save timeline event." },
      { status: 500 },
    );
  }
}
