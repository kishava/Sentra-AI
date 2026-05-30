import { buildCrmExportPayload } from "@/lib/gtm/crm-payload";
import type { WorkspaceContext } from "@/lib/gtm/workspace-context";
import { isAllowedWebhook } from "@/lib/webhooks";
import type { ExecutiveIntelligenceReport, IntelligenceAnalysis } from "@/types/intelligence";

export type AutomationWebhookEvent = "crm_export" | "monitor_alert";

export function resolveAutomationWebhookUrl(requested?: string) {
  return (
    requested?.trim() ||
    process.env.SENTRA_AUTOMATION_WEBHOOK_URL?.trim() ||
    process.env.TRIGGERWARE_WEBHOOK_URL?.trim() ||
    ""
  );
}

export async function deliverAlertWebhook(webhookUrl: string, report: ExecutiveIntelligenceReport) {
  if (!isAllowedWebhook(webhookUrl)) {
    throw new Error("A valid HTTPS webhook URL is required.");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `Sentra alert: ${report.verdict}`,
      sentra: {
        requirement: report.monitorRequirement,
        riskScore: report.riskScore,
        confidence: report.confidence,
        verdict: report.verdict,
        situation: report.situation,
        actionPlan: report.actionPlan,
        evidenceSources: report.evidenceSources,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}.`);
  }
}

export async function deliverAutomationWebhook(options: {
  webhookUrl: string;
  event?: AutomationWebhookEvent;
  workspace?: WorkspaceContext;
  report?: ExecutiveIntelligenceReport;
  analysis?: IntelligenceAnalysis;
  requirement?: string;
  monitorId?: string;
}) {
  const webhookUrl = options.webhookUrl.trim();
  if (!webhookUrl || !isAllowedWebhook(webhookUrl)) {
    throw new Error("A valid HTTPS CRM or automation webhook URL is required.");
  }

  const event = options.event ?? "monitor_alert";
  const payload = {
    ...buildCrmExportPayload({
      workspace: options.workspace,
      report: options.report,
      analysis: options.analysis,
      requirement: options.requirement,
    }),
    event,
    monitorId: options.monitorId,
    automation: {
      source: "sentra-ai",
      action: event === "crm_export" ? "crm_export" : "gtm_monitor_trigger",
      description:
        event === "crm_export"
          ? "Structured GTM intel exported from Sentra"
          : "Sentra GTM monitor matched — run downstream workflow",
    },
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sentra-Event": event,
      "X-TriggerWare-Source": "sentra-ai",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Automation webhook returned ${response.status}.`);
  }

  return payload;
}
