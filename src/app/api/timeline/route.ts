import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { getTimelineForApi } from "@/lib/monitor-timeline";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireApiUser();
    if ("error" in auth) {
      return NextResponse.json({ events: [] });
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
