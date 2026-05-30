"use client";

import { useEffect, useState } from "react";
import { Send, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildCrmExportPayload } from "@/lib/gtm/crm-payload";
import { getWorkspaceContext } from "@/lib/gtm/workspace-context";
import type { ExecutiveIntelligenceReport, IntelligenceAnalysis } from "@/types/intelligence";

const CRM_WEBHOOK_KEY = "sentra-crm-webhook";
const TRIGGERWARE_WEBHOOK_KEY = "sentra-triggerware-webhook";

type CrmExportButtonProps = {
  report?: ExecutiveIntelligenceReport;
  analysis?: IntelligenceAnalysis;
  requirement?: string;
  label?: string;
  variant?: "neon" | "ghost";
};

export function CrmExportButton({
  report,
  analysis,
  requirement,
  label = "Export to CRM",
  variant = "ghost",
}: CrmExportButtonProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setWebhookUrl(window.localStorage.getItem(CRM_WEBHOOK_KEY) ?? ""),
      0,
    );
    return () => window.clearTimeout(timeout);
  }, []);

  async function exportToCrm() {
    const trimmed = webhookUrl.trim();
    if (!trimmed) {
      toast.error("Add a CRM webhook URL first.", {
        description: "HubSpot, Salesforce middleware, Zapier, or Make HTTPS webhook.",
      });
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/crm/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: trimmed,
          workspace: getWorkspaceContext(),
          report,
          analysis,
          requirement,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "CRM export failed.");

      window.localStorage.setItem(CRM_WEBHOOK_KEY, trimmed);
      toast.success("Exported to CRM webhook", {
        description: "Structured account intel payload delivered.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CRM export failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Input
        value={webhookUrl}
        onChange={(event) => setWebhookUrl(event.target.value)}
        placeholder="CRM webhook URL (HubSpot, Zapier, Make…)"
        className="h-10"
        aria-label="CRM webhook URL"
      />
      <Button variant={variant} size="sm" disabled={sending} onClick={() => void exportToCrm()}>
        <Send className="h-4 w-4" />
        {sending ? "Exporting…" : label}
      </Button>
    </div>
  );
}

export function TriggerWareAutomationButton({
  report,
  analysis,
  requirement,
  monitorId,
}: {
  report?: ExecutiveIntelligenceReport;
  analysis?: IntelligenceAnalysis;
  requirement?: string;
  monitorId?: string;
}) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setWebhookUrl(window.localStorage.getItem(TRIGGERWARE_WEBHOOK_KEY) ?? ""),
      0,
    );
    return () => window.clearTimeout(timeout);
  }, []);

  async function triggerWorkflow() {
    const trimmed = webhookUrl.trim();
    if (!trimmed) {
      toast.error("Add a TriggerWare or automation webhook URL.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/automation/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: trimmed,
          event: "monitor_alert",
          workspace: getWorkspaceContext(),
          report,
          analysis,
          requirement,
          monitorId,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Automation trigger failed.");

      window.localStorage.setItem(TRIGGERWARE_WEBHOOK_KEY, trimmed);
      toast.success("Workflow triggered", {
        description: "Sentra forwarded this GTM event to your automation webhook.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Automation trigger failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Input
        value={webhookUrl}
        onChange={(event) => setWebhookUrl(event.target.value)}
        placeholder="TriggerWare / automation webhook URL"
        className="h-10"
        aria-label="TriggerWare webhook URL"
      />
      <Button variant="ghost" size="sm" disabled={sending} onClick={() => void triggerWorkflow()}>
        <Workflow className="h-4 w-4" />
        {sending ? "Triggering…" : "Trigger workflow"}
      </Button>
    </div>
  );
}

export function previewCrmPayload(options: Parameters<typeof buildCrmExportPayload>[0]) {
  return buildCrmExportPayload(options);
}
