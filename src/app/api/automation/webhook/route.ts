import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import {
  deliverAutomationWebhook,
  resolveAutomationWebhookUrl,
  type AutomationWebhookEvent,
} from "@/lib/webhooks/delivery";
import type { WorkspaceContext } from "@/lib/gtm/workspace-context";
import type { ExecutiveIntelligenceReport, IntelligenceAnalysis } from "@/types/intelligence";

export const runtime = "nodejs";

/** CRM export and TriggerWare / workflow automation through one webhook endpoint. */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const body = (await request.json().catch(() => null)) as {
    webhookUrl?: string;
    event?: AutomationWebhookEvent;
    workspace?: WorkspaceContext;
    report?: ExecutiveIntelligenceReport;
    analysis?: IntelligenceAnalysis;
    requirement?: string;
    monitorId?: string;
  } | null;

  const webhookUrl = resolveAutomationWebhookUrl(body?.webhookUrl);
  if (!webhookUrl) {
    return NextResponse.json(
      {
        error:
          "Provide an automation webhook URL or set SENTRA_AUTOMATION_WEBHOOK_URL (or TRIGGERWARE_WEBHOOK_URL).",
      },
      { status: 400 },
    );
  }

  try {
    const payload = await deliverAutomationWebhook({
      webhookUrl,
      event: body?.event,
      workspace: body?.workspace,
      report: body?.report,
      analysis: body?.analysis,
      requirement: body?.requirement,
      monitorId: body?.monitorId,
    });
    return NextResponse.json({ ok: true, payload });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Automation webhook delivery failed." },
      { status: error instanceof Error && error.message.includes("valid HTTPS") ? 400 : 502 },
    );
  }
}
