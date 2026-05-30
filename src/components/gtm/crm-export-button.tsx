"use client";

import { useEffect, useState } from "react";
import { Send, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getWorkspaceContext } from "@/lib/gtm/workspace-context";
import { getAutomationWebhookUrl, saveAutomationWebhookUrl } from "@/lib/webhooks";
import type { ExecutiveIntelligenceReport, IntelligenceAnalysis } from "@/types/intelligence";

type AutomationWebhookPanelProps = {
  report?: ExecutiveIntelligenceReport;
  analysis?: IntelligenceAnalysis;
  requirement?: string;
  monitorId?: string;
};

export function AutomationWebhookPanel({
  report,
  analysis,
  requirement,
  monitorId,
}: AutomationWebhookPanelProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [exporting, setExporting] = useState(false);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setWebhookUrl(getAutomationWebhookUrl()), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function persistUrl() {
    saveAutomationWebhookUrl(webhookUrl);
  }

  async function postAutomation(event: "crm_export" | "monitor_alert") {
    const trimmed = webhookUrl.trim();
    if (!trimmed) {
      toast.error("Add a CRM or automation webhook URL first.", {
        description: "HubSpot middleware, Zapier, Make, TriggerWare, or any HTTPS webhook.",
      });
      return;
    }

    const response = await fetch("/api/automation/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl: trimmed,
        event,
        workspace: getWorkspaceContext(),
        report,
        analysis,
        requirement,
        monitorId,
      }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(data.error || "Automation webhook delivery failed.");

    persistUrl();
  }

  async function exportToCrm() {
    setExporting(true);
    try {
      await postAutomation("crm_export");
      toast.success("Exported to CRM webhook", {
        description: "Structured account intel payload delivered.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CRM export failed.");
    } finally {
      setExporting(false);
    }
  }

  async function triggerWorkflow() {
    setTriggering(true);
    try {
      await postAutomation("monitor_alert");
      toast.success("Workflow triggered", {
        description: "Sentra forwarded this GTM event to your automation webhook.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Automation trigger failed.");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Input
        value={webhookUrl}
        onChange={(event) => setWebhookUrl(event.target.value)}
        onBlur={persistUrl}
        placeholder="CRM / automation webhook (HubSpot, Zapier, TriggerWare…)"
        className="h-10"
        aria-label="CRM and automation webhook URL"
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" disabled={exporting} onClick={() => void exportToCrm()}>
          <Send className="h-4 w-4" />
          {exporting ? "Exporting…" : "Export to CRM"}
        </Button>
        <Button variant="ghost" size="sm" disabled={triggering} onClick={() => void triggerWorkflow()}>
          <Workflow className="h-4 w-4" />
          {triggering ? "Triggering…" : "Trigger workflow"}
        </Button>
      </div>
    </div>
  );
}

/** @deprecated Use AutomationWebhookPanel */
export const CrmExportButton = AutomationWebhookPanel;

/** @deprecated Use AutomationWebhookPanel */
export const TriggerWareAutomationButton = AutomationWebhookPanel;
