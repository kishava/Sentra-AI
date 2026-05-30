import { NextResponse } from "next/server";
import { inferMonitorIntentHeuristically } from "@/lib/monitor-intent-heuristic";
import { ensurePlatformSecrets } from "@/lib/secrets/platform-secrets";
import { analyzeMonitorIntent } from "@/services/openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await ensurePlatformSecrets();

  try {
    const body = (await request.json()) as { input?: string };
    const input = body.input?.trim();

    if (!input) {
      return NextResponse.json({ error: "Monitor input is required" }, { status: 400 });
    }

    try {
      const intent = await analyzeMonitorIntent(input);
      return NextResponse.json({ intent });
    } catch {
      return NextResponse.json({ intent: inferMonitorIntentHeuristically(input) });
    }
  } catch (error) {
    console.error("Monitor intent route failed", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to analyze monitor intent",
      },
      { status: 500 },
    );
  }
}
