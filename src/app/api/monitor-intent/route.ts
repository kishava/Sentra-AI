import { NextResponse } from "next/server";
import { analyzeMonitorIntent } from "@/services/openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { input?: string };
    const input = body.input?.trim();

    if (!input) {
      return NextResponse.json({ error: "Monitor input is required" }, { status: 400 });
    }

    const intent = await analyzeMonitorIntent(input);
    return NextResponse.json({ intent });
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
