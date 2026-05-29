import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import type { ExecutiveIntelligenceReport } from "@/types/intelligence";

export const runtime = "nodejs";

function isAllowedWebhook(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const body = (await request.json().catch(() => null)) as {
    webhookUrl?: string;
    report?: ExecutiveIntelligenceReport;
  } | null;

  if (!body?.webhookUrl || !isAllowedWebhook(body.webhookUrl)) {
    return NextResponse.json({ error: "A valid HTTPS webhook URL is required." }, { status: 400 });
  }

  if (!body.report) {
    return NextResponse.json({ error: "Report payload is required." }, { status: 400 });
  }

  const response = await fetch(body.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `Sentra alert: ${body.report.verdict}`,
      sentra: {
        requirement: body.report.monitorRequirement,
        riskScore: body.report.riskScore,
        confidence: body.report.confidence,
        verdict: body.report.verdict,
        situation: body.report.situation,
        actionPlan: body.report.actionPlan,
        evidenceSources: body.report.evidenceSources,
      },
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: `Webhook returned ${response.status}.` }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
