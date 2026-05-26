import { NextResponse } from "next/server";
import { collectWebIntelligence } from "@/services/bright-data";
import { generateEnterpriseAnalysis } from "@/services/openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: string; targetUrl?: string };
    const query = body.query?.trim() || "Summarize enterprise market intelligence";
    const webEvidence = await collectWebIntelligence({
      query,
      targetUrl: body.targetUrl,
      mode: body.targetUrl ? "unlocker" : "serp",
    });
    const analysis = await generateEnterpriseAnalysis(query, webEvidence.evidence);

    return NextResponse.json({
      provider: webEvidence.provider,
      analysis,
    });
  } catch (error) {
    console.error("Intelligence route failed", error);
    return NextResponse.json({ error: "Unable to generate intelligence" }, { status: 500 });
  }
}

export async function GET() {
  const webEvidence = await collectWebIntelligence({
    query: "Daily enterprise intelligence briefing",
    mode: "serp",
  });
  const analysis = await generateEnterpriseAnalysis("Daily enterprise intelligence briefing", webEvidence.evidence);

  return NextResponse.json({
    provider: webEvidence.provider,
    analysis,
  });
}
