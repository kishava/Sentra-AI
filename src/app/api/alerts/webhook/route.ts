import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { deliverAlertWebhook } from "@/lib/webhooks/delivery";
import type { ExecutiveIntelligenceReport } from "@/types/intelligence";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const body = (await request.json().catch(() => null)) as {
    webhookUrl?: string;
    report?: ExecutiveIntelligenceReport;
  } | null;

  if (!body?.webhookUrl) {
    return NextResponse.json({ error: "A valid HTTPS webhook URL is required." }, { status: 400 });
  }

  if (!body.report) {
    return NextResponse.json({ error: "Report payload is required." }, { status: 400 });
  }

  try {
    await deliverAlertWebhook(body.webhookUrl, body.report);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook delivery failed." },
      { status: error instanceof Error && error.message.includes("valid HTTPS") ? 400 : 502 },
    );
  }
}
