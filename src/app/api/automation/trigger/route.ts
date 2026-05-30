import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { buildCrmExportPayload } from "@/lib/gtm/crm-payload";
import type { WorkspaceContext } from "@/lib/gtm/workspace-context";
import type { ExecutiveIntelligenceReport, IntelligenceAnalysis } from "@/types/intelligence";

export const runtime = "nodejs";

function isAllowedWebhook(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}

/** Forward GTM events to TriggerWare or any automation webhook. */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const body = (await request.json().catch(() => null)) as {
    webhookUrl?: string;
    event?: string;
    workspace?: WorkspaceContext;
    report?: ExecutiveIntelligenceReport;
    analysis?: IntelligenceAnalysis;
    requirement?: string;
    monitorId?: string;
  } | null;

  const webhookUrl =
    body?.webhookUrl?.trim() || process.env.TRIGGERWARE_WEBHOOK_URL?.trim() || "";

  if (!webhookUrl || !isAllowedWebhook(webhookUrl)) {
    return NextResponse.json(
      { error: "Provide a TriggerWare/automation webhook URL or set TRIGGERWARE_WEBHOOK_URL." },
      { status: 400 },
    );
  }

  const payload = {
    ...buildCrmExportPayload({
      workspace: body?.workspace,
      report: body?.report,
      analysis: body?.analysis,
      requirement: body?.requirement,
    }),
    event: body?.event ?? "monitor_alert",
    monitorId: body?.monitorId,
    triggerware: {
      source: "sentra-ai",
      action: "gtm_monitor_trigger",
      description: "Sentra GTM monitor matched — run downstream workflow",
    },
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TriggerWare-Source": "sentra-ai",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return NextResponse.json({ error: `Automation webhook returned ${response.status}.` }, { status: 502 });
  }

  return NextResponse.json({ ok: true, payload });
}
