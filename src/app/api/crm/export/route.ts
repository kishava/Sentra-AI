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

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const body = (await request.json().catch(() => null)) as {
    webhookUrl?: string;
    workspace?: WorkspaceContext;
    report?: ExecutiveIntelligenceReport;
    analysis?: IntelligenceAnalysis;
    requirement?: string;
  } | null;

  if (!body?.webhookUrl || !isAllowedWebhook(body.webhookUrl)) {
    return NextResponse.json({ error: "A valid HTTPS CRM or automation webhook URL is required." }, { status: 400 });
  }

  const payload = buildCrmExportPayload({
    workspace: body.workspace,
    report: body.report,
    analysis: body.analysis,
    requirement: body.requirement,
  });

  const response = await fetch(body.webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sentra-Event": "crm_export",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return NextResponse.json({ error: `CRM webhook returned ${response.status}.` }, { status: 502 });
  }

  return NextResponse.json({ ok: true, payload });
}
