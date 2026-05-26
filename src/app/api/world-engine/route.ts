import { NextResponse } from "next/server";
import { collectWebIntelligence } from "@/services/bright-data";
import { generateWorldEngineReport } from "@/services/world-engine";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: string };
    const query = body.query?.trim().slice(0, 1500);
    if (!query) {
      return NextResponse.json({ error: "An intelligence question is required." }, { status: 400 });
    }

    const evidence = await collectWebIntelligence({ query, mode: "serp" });
    const report = await generateWorldEngineReport({
      query,
      evidence: evidence.evidence,
      brightDataAvailable: evidence.provider === "bright-data",
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("World engine route failed", error);
    return NextResponse.json({ error: "Unable to generate world intelligence." }, { status: 500 });
  }
}
