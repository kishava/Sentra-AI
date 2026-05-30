"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, BellRing, Bot, CheckCircle2, FileCheck2, Pause, Play, Radar, Send, ShieldCheck, Sparkles, TimerReset, Trash2, Workflow, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { gtmMonitorTemplates } from "@/data/gtm-monitor-templates";
import { signalStream } from "@/data/mock-intelligence";
import { AccountContextPanel } from "@/components/gtm/account-context-panel";
import { BattlecardAnalyzer } from "@/components/gtm/battlecard-analyzer";
import { AutomationWebhookPanel } from "@/components/gtm/crm-export-button";
import { GtmResearchAgentPanel } from "@/components/gtm/gtm-research-agent-panel";
import { getWorkspaceContext } from "@/lib/gtm/workspace-context";
import { getAlertWebhookUrl, getAutomationWebhookUrl, saveAlertWebhookUrl, saveAutomationWebhookUrl } from "@/lib/webhooks";
import { WorkspaceSection } from "@/components/workspace/workspace-page";
import { isBrowserSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ExecutiveIntelligenceReport, IntelligenceSignal, MonitorIntent, Severity } from "@/types/intelligence";

type SignalCategory = IntelligenceSignal["category"];

type Monitor = {
  id: string;
  requirement: string;
  category: "any" | SignalCategory;
  minimumSeverity: Severity;
  active: boolean;
  createdAt: string;
  lastCheckedAt?: string;
  keywords?: string[];
  alertedSignalIds: string[];
};

type SelectedReport = {
  monitor: Monitor;
  signal?: IntelligenceSignal;
  report?: ExecutiveIntelligenceReport;
};

const STORAGE_KEY = "sentra-monitors";
const REPORTS_STORAGE_KEY = "sentra-intelligence-reports";
const severityRank: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};
const categories: Array<"any" | SignalCategory> = [
  "any",
  "competitor",
  "market",
  "risk",
  "pricing",
  "hiring",
  "sentiment",
];
const severities: Severity[] = ["low", "medium", "high", "critical"];

function loadMonitors() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as Monitor[];
    return parsed.filter((monitor) => monitor.requirement?.trim());
  } catch {
    return [];
  }
}

function saveMonitors(monitors: Monitor[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(monitors));
}

function saveLocalReport(report: ExecutiveIntelligenceReport) {
  if (typeof window === "undefined") return;
  try {
    const current = JSON.parse(window.localStorage.getItem(REPORTS_STORAGE_KEY) || "[]") as ExecutiveIntelligenceReport[];
    const next = [report, ...current.filter((item) => item.id !== report.id)].slice(0, 50);
    window.localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    window.localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify([report]));
  }
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function matchesRequirement(monitor: Monitor, signal: IntelligenceSignal) {
  if (monitor.category !== "any" && signal.category !== monitor.category) return false;
  if (severityRank[signal.severity] < severityRank[monitor.minimumSeverity]) return false;

  const requirementTokens = monitor.keywords?.length ? monitor.keywords : tokenize(monitor.requirement);
  if (!requirementTokens.length) return false;

  const haystack = `${signal.title} ${signal.summary} ${signal.source} ${signal.category}`.toLowerCase();
  return requirementTokens.some((token) => haystack.includes(token));
}

function getMatches(monitor: Monitor, signals: IntelligenceSignal[]) {
  return signals.filter((signal) => matchesRequirement(monitor, signal));
}

export function MonitorCenter() {
  const searchParams = useSearchParams();
  const aiAbortRef = useRef<AbortController | null>(null);
  const intentAbortRef = useRef<AbortController | null>(null);
  const checkMonitorNowRef = useRef<((monitorId: string, options?: { automated?: boolean }) => Promise<void>) | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [signals, setSignals] = useState<IntelligenceSignal[]>(signalStream);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [requirement, setRequirement] = useState("");
  const [category, setCategory] = useState<"any" | SignalCategory>("any");
  const [minimumSeverity, setMinimumSeverity] = useState<Severity>("medium");
  const [monitorIntent, setMonitorIntent] = useState<MonitorIntent | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentError, setIntentError] = useState("");
  const [selectedReport, setSelectedReport] = useState<SelectedReport | null>(null);
  const [reportsByMonitor, setReportsByMonitor] = useState<Record<string, ExecutiveIntelligenceReport>>({});
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [demoAutopilot, setDemoAutopilot] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [automationWebhookUrl, setAutomationWebhookUrl] = useState("");
  const [webhookSending, setWebhookSending] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );

  useEffect(() => {
    async function loadData() {
      const localOnly = !isBrowserSupabaseConfigured();

      try {
        const [signalsRes, monitorsRes] = await Promise.all([
          fetch("/api/signals"),
          localOnly ? Promise.resolve(null) : fetch("/api/monitors"),
        ]);
        const signalsData = (await signalsRes.json()) as { signals?: IntelligenceSignal[] };
        if (signalsData.signals?.length) setSignals(signalsData.signals);

        if (localOnly) {
          setMonitors(loadMonitors());
          return;
        }

        if (!monitorsRes) return;
        const monitorsData = (await monitorsRes.json()) as {
          monitors?: Array<{
            id: string;
            requirement: string;
            category: string;
            minimum_severity: Severity;
            keywords: string[];
            active: boolean;
            last_checked_at: string | null;
          }>;
          localMode?: boolean;
        };

        if (monitorsData.monitors?.length) {
          setMonitors(
            monitorsData.monitors.map((monitor) => ({
              id: monitor.id,
              requirement: monitor.requirement,
              category: monitor.category as Monitor["category"],
              minimumSeverity: monitor.minimum_severity,
              keywords: monitor.keywords,
              active: monitor.active,
              createdAt: monitor.last_checked_at ?? new Date().toISOString(),
              lastCheckedAt: monitor.last_checked_at ?? undefined,
              alertedSignalIds: [],
            })),
          );
          return;
        }

        const legacy = loadMonitors();
        if (legacy.length && !monitorsData.localMode) {
          for (const monitor of legacy) {
            await fetch("/api/monitors", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                requirement: monitor.requirement,
                category: monitor.category,
                minimumSeverity: monitor.minimumSeverity,
                keywords: monitor.keywords,
                active: monitor.active,
              }),
            });
          }
          window.localStorage.removeItem(STORAGE_KEY);
          const refreshed = await fetch("/api/monitors");
          const refreshedData = (await refreshed.json()) as typeof monitorsData;
          if (refreshedData.monitors?.length) {
            setMonitors(
              refreshedData.monitors.map((monitor) => ({
                id: monitor.id,
                requirement: monitor.requirement,
                category: monitor.category as Monitor["category"],
                minimumSeverity: monitor.minimum_severity,
                keywords: monitor.keywords,
                active: monitor.active,
                createdAt: monitor.last_checked_at ?? new Date().toISOString(),
                lastCheckedAt: monitor.last_checked_at ?? undefined,
                alertedSignalIds: [],
              })),
            );
          }
        }
      } catch {
        setMonitors(loadMonitors());
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setWebhookUrl(getAlertWebhookUrl());
      setAutomationWebhookUrl(getAutomationWebhookUrl());
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    saveAlertWebhookUrl(webhookUrl);
  }, [webhookUrl]);

  useEffect(() => {
    saveAutomationWebhookUrl(automationWebhookUrl);
  }, [automationWebhookUrl]);

  useEffect(() => {
    const guidePrompt = searchParams.get("guidePrompt");
    if (!guidePrompt) return;

    const timeout = window.setTimeout(() => setRequirement(guidePrompt), 0);
    return () => window.clearTimeout(timeout);
  }, [searchParams]);

  useEffect(() => {
    if (!isBrowserSupabaseConfigured() && monitors.length) {
      const timeout = window.setTimeout(() => saveMonitors(monitors), 400);
      return () => window.clearTimeout(timeout);
    }
  }, [monitors]);

  useEffect(() => {
    const input = requirement.trim();
    intentAbortRef.current?.abort();

    if (input.length < 8) {
      const timeout = window.setTimeout(() => {
        setMonitorIntent(null);
        setIntentLoading(false);
        setIntentError("");
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const abortController = new AbortController();
    intentAbortRef.current = abortController;
    const timeout = window.setTimeout(async () => {
      setIntentLoading(true);
      setIntentError("");

      try {
        const response = await fetch("/api/monitor-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({ input }),
        });
        const data = (await response.json()) as { intent?: MonitorIntent; error?: string };

        if (!response.ok || !data.intent) {
          throw new Error(data.error || "Sentra could not understand this monitor yet.");
        }

        setMonitorIntent(data.intent);
        setCategory(data.intent.category);
        setMinimumSeverity(data.intent.minimumSeverity);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMonitorIntent(null);
        setIntentError(error instanceof Error ? error.message : "Intent analysis failed.");
      } finally {
        if (!abortController.signal.aborted) {
          setIntentLoading(false);
        }
      }
    }, 700);

    return () => {
      window.clearTimeout(timeout);
      abortController.abort();
    };
  }, [requirement]);

  const monitorSummaries = useMemo(
    () =>
      monitors.map((monitor) => ({
        monitor,
        matches: getMatches(monitor, signals),
      })),
    [monitors, signals],
  );
  const activeMonitorCount = monitors.filter((monitor) => monitor.active).length;

  async function openReport(monitor: Monitor, signal?: IntelligenceSignal, report?: ExecutiveIntelligenceReport) {
    aiAbortRef.current?.abort();
    if (report) {
      setSelectedReport({ monitor, signal, report });
      setAiSummary("");
      setAiError("");
      setAiLoading(false);
      return;
    }

    if (!signal) {
      const cachedReport = reportsByMonitor[monitor.id];
      if (cachedReport) {
        setSelectedReport({ monitor, report: cachedReport });
      }
      return;
    }

    const abortController = new AbortController();
    aiAbortRef.current = abortController;
    setSelectedReport({ monitor, signal });
    setAiSummary("");
    setAiError("");
    setAiLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          message: [
            "Create a detailed situation report for this automated monitor alert.",
            `Monitor requirement: ${monitor.requirement}`,
            `Matched signal: ${signal.title}`,
            `Signal summary: ${signal.summary}`,
            `Category: ${signal.category}`,
            `Severity: ${signal.severity}`,
            `Confidence: ${Math.round(signal.confidence * 100)}%`,
            `Source: ${signal.source}`,
            "Return concise markdown with: situation summary, why it matters, immediate actions, and watch items.",
          ].join("\n"),
          history: [],
        }),
      });
      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok || !data.message?.trim()) {
        throw new Error(data.error || "AI report could not be generated.");
      }

      setAiSummary(data.message);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setAiError(error instanceof Error ? error.message : "AI analysis failed.");
      setAiSummary(
        [
          "### Situation summary",
          `${signal.title}. ${signal.summary}`,
          "",
          "### Immediate actions",
          `- Validate the signal against the monitored requirement: ${monitor.requirement}.`,
          "- Assign an owner to review the source and decide whether escalation is needed.",
          "- Keep this monitor active until the signal stabilizes or is resolved.",
        ].join("\n"),
      );
    } finally {
      if (!abortController.signal.aborted) {
        setAiLoading(false);
      }
    }
  }

  function closeReport() {
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    setSelectedReport(null);
    setAiSummary("");
    setAiError("");
    setAiLoading(false);
  }

  async function createMonitor() {
    const trimmed = requirement.trim();
    if (!trimmed) {
      toast.error("Describe the signal you want Sentra to monitor.");
      return;
    }
    const interpretedRequirement = monitorIntent?.normalizedRequirement?.trim() || trimmed;

    try {
      const response = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirement: interpretedRequirement,
          category,
          minimumSeverity,
          keywords: monitorIntent?.keywords ?? [],
          active: true,
        }),
      });
      const data = (await response.json()) as {
        monitor?: {
          id: string;
          requirement: string;
          category: string;
          minimum_severity: Severity;
          keywords: string[];
          active: boolean;
        };
        error?: string;
      };

      if (!response.ok || !data.monitor) {
        throw new Error(data.error || "Could not save monitor.");
      }

      const monitor: Monitor = {
        id: data.monitor.id,
        requirement: data.monitor.requirement,
        category: data.monitor.category as Monitor["category"],
        minimumSeverity: data.monitor.minimum_severity,
        keywords: data.monitor.keywords,
        active: data.monitor.active,
        createdAt: new Date().toISOString(),
        alertedSignalIds: [],
      };

      setMonitors((current) => {
        const next = [monitor, ...current];
        if (!isBrowserSupabaseConfigured()) saveMonitors(next);
        return next;
      });
      setRequirement("");
      setMonitorIntent(null);
      toast.success("Monitor saved", {
        description: "Run Check now to collect live Bright Data evidence.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create monitor.");
    }
  }

  async function sendAutomationTrigger(report: ExecutiveIntelligenceReport, monitorId?: string) {
    const automationUrl = getAutomationWebhookUrl();
    if (!automationUrl) return;

    try {
      await fetch("/api/automation/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: automationUrl,
          event: "monitor_alert",
          workspace: getWorkspaceContext(),
          report,
          requirement: report.monitorRequirement,
          monitorId,
        }),
      });
    } catch {
      // Optional automation path — alert webhook remains primary.
    }
  }

  async function sendWebhookAlert(report: ExecutiveIntelligenceReport, monitorId?: string) {
    const trimmed = webhookUrl.trim();
    if (!trimmed) return;

    setWebhookSending(true);
    try {
      const response = await fetch("/api/alerts/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: trimmed, report }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Webhook delivery failed.");
      toast.success("Webhook alert delivered.");
      void sendAutomationTrigger(report, monitorId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Webhook delivery failed.");
    } finally {
      setWebhookSending(false);
    }
  }

  async function checkMonitorNow(monitorId: string, options?: { automated?: boolean }) {
    const monitor = monitors.find((item) => item.id === monitorId);
    if (!monitor) {
      toast.error("Monitor not found.");
      return;
    }

    setCheckingId(monitorId);
    try {
      const response = await fetch(`/api/monitors/${monitorId}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isBrowserSupabaseConfigured()
            ? {}
            : {
                requirement: monitor.requirement,
                category: monitor.category,
                minimumSeverity: monitor.minimumSeverity,
                keywords: monitor.keywords,
                workspace: getWorkspaceContext(),
              },
        ),
      });
      const data = (await response.json()) as {
        signals?: IntelligenceSignal[];
        provider?: string;
        matchedCount?: number;
        report?: ExecutiveIntelligenceReport;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Check failed.");
      }

      if (data.signals?.length) {
        setSignals((current) => {
          const merged = [...data.signals!, ...current];
          const seen = new Set<string>();
          return merged.filter((signal) => {
            if (seen.has(signal.id)) return false;
            seen.add(signal.id);
            return true;
          });
        });
      }

      const matched = data.signals ?? [];
      if (data.report) {
        setReportsByMonitor((current) => ({ ...current, [monitorId]: data.report! }));
        saveLocalReport(data.report);
        toast.success("Verified report ready", {
          description: data.report.verdict,
          action: { label: "Open", onClick: () => openReport(monitor, matched[0], data.report) },
        });
      }
      matched.forEach((signal) => {
        toast.success("Monitor match", {
          description: signal.title,
          action: { label: "Report", onClick: () => openReport(monitor, signal, data.report) },
        });
      });

      if (data.report && matched.length) {
        if (notificationPermission === "granted") {
          new Notification("Sentra monitor match", {
            body: `${data.report.verdict} - risk ${data.report.riskScore}%`,
          });
        }
        void sendWebhookAlert(data.report, monitorId);
      }

      toast.message("Check complete", {
        description:
          data.provider === "bright-data"
            ? `${data.matchedCount ?? 0} matches from live Bright Data evidence.`
            : `${data.matchedCount ?? 0} matches (illustrative evidence - configure Bright Data zones).`,
      });

      if (options?.automated && data.report && monitor) {
        toast.message("Autopilot run complete", {
          description: data.report.verdict,
          action: { label: "Open report", onClick: () => openReport(monitor, matched[0], data.report) },
        });
      }

      setMonitors((current) =>
        current.map((item) =>
          item.id === monitorId ? { ...item, lastCheckedAt: new Date().toISOString() } : item,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check failed.");
    } finally {
      setCheckingId(null);
    }
  }
  useEffect(() => {
    checkMonitorNowRef.current = checkMonitorNow;
  });

  useEffect(() => {
    if (!demoAutopilot || checkingId) return;
    const active = monitors.find((monitor) => monitor.active);
    if (!active) return;

    const interval = window.setInterval(() => {
      if (!document.hidden) void checkMonitorNowRef.current?.(active.id, { automated: true });
    }, 30000);

    return () => window.clearInterval(interval);
  }, [demoAutopilot, monitors, checkingId]);

  async function enableBrowserNotifications() {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      toast.error("Browser notifications are not supported here.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      toast.success("Browser alerts enabled.");
    }
  }

  function toggleMonitor(id: string) {
    setMonitors((current) => {
      const next = current.map((monitor) =>
        monitor.id === id ? { ...monitor, active: !monitor.active } : monitor,
      );
      if (!isBrowserSupabaseConfigured()) saveMonitors(next);
      return next;
    });
  }

  async function removeMonitor(id: string) {
    try {
      await fetch(`/api/monitors/${id}`, { method: "DELETE" });
    } catch {
      // Still remove locally if API fails in demo mode.
    }
    setMonitors((current) => {
      const next = current.filter((monitor) => monitor.id !== id);
      if (!isBrowserSupabaseConfigured()) saveMonitors(next);
      return next;
    });
  }

  return (
    <>
      <WorkspaceSection
        id="gtm-workspace"
        title="GTM workspace"
        description="Account context, battlecard analysis, and the Bright Data MCP research agent."
      >
        <div className="grid gap-5 xl:grid-cols-2">
          <AccountContextPanel compact />
          <BattlecardAnalyzer compact />
        </div>
        <GtmResearchAgentPanel
          compact
          initialQuery={requirement}
          onApplyRequirement={(value) => setRequirement(value)}
        />
      </WorkspaceSection>

      <WorkspaceSection
        id="create-signal-monitor"
        title="Signal monitors"
        description="Define requirements, run live checks, and deliver executive reports to your team."
      >
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="p-5 md:p-6" glow>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <Badge variant="cyan">Automated monitoring</Badge>
            <h2 className="mt-3 text-2xl font-semibold text-white">Create signal monitor</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Define the requirement, category, and alert threshold. In production, active monitors
              are checked every 30 minutes via server cron; use Autopilot for in-browser checks while
              you work.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={enableBrowserNotifications}
            disabled={notificationPermission === "granted" || notificationPermission === "unsupported"}
          >
            <BellRing className="h-4 w-4" />
            {notificationPermission === "granted" ? "Alerts enabled" : "Enable browser alerts"}
          </Button>
        </div>

        <div className="mt-5 grid gap-4 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Send className="h-4 w-4 text-sentra-cyan" />
                Alert webhook
              </div>
              <Input
                value={webhookUrl}
                onChange={(event) => setWebhookUrl(event.target.value)}
                placeholder="Slack, Discord, or alert webhook URL"
                className="mt-3 h-10"
                aria-label="Alert webhook URL"
              />
            </div>
            <Button
              variant={demoAutopilot ? "neon" : "ghost"}
              onClick={() => setDemoAutopilot((current) => !current)}
              disabled={!activeMonitorCount}
            >
              <TimerReset className="h-4 w-4" />
              {demoAutopilot ? "Autopilot on" : "Autopilot"}
            </Button>
            <Badge variant={webhookSending ? "cyan" : webhookUrl.trim() ? "success" : "default"}>
              {webhookSending ? "Sending" : webhookUrl.trim() ? "Alert armed" : "Alert optional"}
            </Badge>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Workflow className="h-4 w-4 text-sentra-cyan" />
              CRM & automation webhook
            </div>
            <Input
              value={automationWebhookUrl}
              onChange={(event) => setAutomationWebhookUrl(event.target.value)}
              placeholder="HubSpot, Zapier, Make, TriggerWare, or automation URL"
              className="mt-3 h-10"
              aria-label="CRM and automation webhook URL"
            />
            <p className="mt-2 text-xs leading-5 text-white/42">
              Used for CRM export, workflow triggers, and automatic delivery when a monitor matches.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-white/40">GTM monitor templates</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {gtmMonitorTemplates.map((template) => (
              <Button
                key={template.id}
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto max-w-full whitespace-normal px-3 py-2 text-left text-xs"
                onClick={() => {
                  setRequirement(template.requirement);
                  setCategory(template.category);
                }}
              >
                {template.title}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <Textarea
            value={requirement}
            onChange={(event) => setRequirement(event.target.value)}
            placeholder="Example: alert me when Tesla pricing incentives change or competitors launch procurement agents"
            className="min-h-24 lg:min-h-12"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as "any" | SignalCategory)}
            className="sentra-focus h-12 rounded-2xl border border-white/10 bg-sentra-panel px-4 text-sm text-white"
            aria-label="Monitor category"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "any" ? "Any category" : item}
              </option>
            ))}
          </select>
          <select
            value={minimumSeverity}
            onChange={(event) => setMinimumSeverity(event.target.value as Severity)}
            className="sentra-focus h-12 rounded-2xl border border-white/10 bg-sentra-panel px-4 text-sm text-white"
            aria-label="Minimum severity"
          >
            {severities.map((severity) => (
              <option key={severity} value={severity}>
                {severity}+ severity
              </option>
            ))}
          </select>
        </div>

        {(intentLoading || monitorIntent || intentError) && (
          <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.045] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Sparkles className={cn("h-4 w-4 text-sentra-cyan", intentLoading && "animate-pulse")} />
                  AI monitor understanding
                </div>
                {intentLoading && <p className="mt-2 text-sm text-white/50">Interpreting the requirement...</p>}
                {intentError && !intentLoading && <p className="mt-2 text-sm text-amber-100">{intentError}</p>}
                {monitorIntent && !intentLoading && (
                  <div className="mt-3 grid gap-3">
                    <p className="text-sm leading-6 text-white/68">{monitorIntent.normalizedRequirement}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="cyan">{monitorIntent.category}</Badge>
                      <Badge variant="risk">{monitorIntent.minimumSeverity}+ severity</Badge>
                      <Badge variant="default">{Math.round(monitorIntent.confidence * 100)}% confidence</Badge>
                      <Badge variant={monitorIntent.provider === "openai" ? "success" : "default"}>
                        {monitorIntent.provider === "openai" ? "AI interpreted" : "Local fallback"}
                      </Badge>
                    </div>
                    {monitorIntent.keywords.length > 0 && (
                      <p className="text-xs leading-5 text-white/42">
                        Keywords: {monitorIntent.keywords.join(", ")}
                      </p>
                    )}
                    <p className="text-xs leading-5 text-white/42">{monitorIntent.rationale}</p>
                  </div>
                )}
              </div>
              {monitorIntent && !intentLoading && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setRequirement(monitorIntent.normalizedRequirement);
                    setCategory(monitorIntent.category);
                    setMinimumSeverity(monitorIntent.minimumSeverity);
                  }}
                >
                  Apply interpretation
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            value={`${activeMonitorCount} active monitor${activeMonitorCount === 1 ? "" : "s"}`}
            readOnly
            aria-label="Active monitor count"
            className="pointer-events-none h-10 max-w-xs text-white/60"
          />
          <Button variant="neon" onClick={createMonitor}>
            <Radar className="h-4 w-4" />
            Start monitoring
          </Button>
        </div>
      </Card>

      <Card className="p-5 md:p-6" glow>
        <p className="text-sm uppercase tracking-[0.24em] text-white/35">Monitor status</p>
        <div className="mt-5 grid gap-3">
          {monitorSummaries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-white/45">
              No monitors yet. Add a requirement to start watching for matching signals.
            </div>
          ) : (
            monitorSummaries.slice(0, 3).map(({ monitor, matches }) => (
              <div key={monitor.id} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-2xl",
                      monitor.active ? "bg-cyan-300/10 text-sentra-cyan" : "bg-white/10 text-white/45",
                    )}
                  >
                    {monitor.active ? <CheckCircle2 className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-white">{monitor.requirement}</p>
                    <p className="mt-2 text-xs text-white/42">
                      {matches.length} match{matches.length === 1 ? "" : "es"} - {monitor.minimumSeverity}+ -{" "}
                      {monitor.category}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {monitorSummaries.length > 0 && (
        <Card className="xl:col-span-2 p-5 md:p-6" glow>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm uppercase tracking-[0.24em] text-white/35">Active watchlist</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Requirement alerts</h3>
            </div>
          </div>
          <div className="grid gap-3">
            {monitorSummaries.map(({ monitor, matches }) => (
              <div key={monitor.id} className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={monitor.active ? "success" : "default"}>
                        {monitor.active ? "Monitoring" : "Paused"}
                      </Badge>
                      <Badge variant="default">{matches.length} matches</Badge>
                      {reportsByMonitor[monitor.id] && (
                        <Badge variant={reportsByMonitor[monitor.id].hallucinationRisk === "low" ? "success" : "risk"}>
                          {reportsByMonitor[monitor.id].hallucinationRisk} AI risk
                        </Badge>
                      )}
                    </div>
                    <h4 className="mt-3 break-words font-medium text-white">{monitor.requirement}</h4>
                    {matches[0] ? (
                      <button
                        className="sentra-focus mt-2 block text-left text-sm leading-6 text-white/55 transition"
                        onClick={() => openReport(monitor, matches[0], reportsByMonitor[monitor.id])}
                      >
                        Latest match: <span className="text-white/80">{matches[0].title}</span>
                      </button>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-white/45">
                        No matching signals in the current stream yet.
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      disabled={checkingId === monitor.id}
                      onClick={() => checkMonitorNow(monitor.id)}
                    >
                      <Radar className="h-4 w-4" />
                      {checkingId === monitor.id ? "Checking…" : "Check now"}
                    </Button>
                    {(matches[0] || reportsByMonitor[monitor.id]) && (
                      <Button variant="neon" onClick={() => openReport(monitor, matches[0], reportsByMonitor[monitor.id])}>
                        <FileCheck2 className="h-4 w-4" />
                        Verified report
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => toggleMonitor(monitor.id)}>
                      {monitor.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeMonitor(monitor.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {selectedReport && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-sentra-ink/80 px-4 py-8 backdrop-blur-xl"
          onClick={closeReport}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-sentra-panel shadow-2xl shadow-black/40"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="risk">
                    {selectedReport.report ? `${selectedReport.report.riskScore}% risk` : selectedReport.signal?.severity}
                  </Badge>
                  <Badge variant="cyan">
                    {selectedReport.report ? selectedReport.report.provider : selectedReport.signal?.category}
                  </Badge>
                  <Badge variant="default">
                    {selectedReport.report ? `${selectedReport.report.confidence}% confidence` : `${Math.round((selectedReport.signal?.confidence ?? 0) * 100)}% confidence`}
                  </Badge>
                  {selectedReport.report && (
                    <Badge variant={selectedReport.report.hallucinationRisk === "low" ? "success" : "risk"}>
                      {selectedReport.report.hallucinationRisk} hallucination risk
                    </Badge>
                  )}
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
                  {selectedReport.report?.verdict ?? selectedReport.signal?.title}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
                  Monitor requirement: {selectedReport.monitor.requirement}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeReport} aria-label="Close report">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="border-b border-white/10 p-5 md:p-6 lg:border-b-0 lg:border-r">
                <p className="text-sm uppercase tracking-[0.24em] text-white/35">
                  {selectedReport.report ? "Verified evidence" : "Signal details"}
                </p>
                {selectedReport.report ? (
                  <div className="mt-5 grid gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/35">Risk score</p>
                        <p className="mt-2 text-3xl font-semibold text-rose-100">{selectedReport.report.riskScore}%</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/35">Confidence</p>
                        <p className="mt-2 text-3xl font-semibold text-cyan-100">{selectedReport.report.confidence}%</p>
                      </div>
                    </div>
                    {selectedReport.report.evidenceSources.map((source) => (
                      <div key={source.id} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/35">{source.publisher}</p>
                            {source.url ? (
                              <a href={source.url} target="_blank" rel="noreferrer" className="mt-2 block break-words text-sm font-medium text-cyan-100">
                                {source.title}
                              </a>
                            ) : (
                              <p className="mt-2 break-words text-sm font-medium text-white/72">{source.title}</p>
                            )}
                            <p className="mt-2 text-xs leading-5 text-white/45">{source.claimSupported}</p>
                          </div>
                          <Badge variant={source.reliability >= 80 ? "success" : "default"}>{source.reliability}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">Situation</p>
                      <p className="mt-2 text-sm leading-6 text-white/68">{selectedReport.signal?.summary}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">Source</p>
                      <p className="mt-2 text-sm leading-6 text-white/68">{selectedReport.signal?.source}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">Response posture</p>
                      <div className="mt-3 flex items-start gap-3 text-sm leading-6 text-white/65">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-200" />
                        Review the evidence, assign an owner, and keep the monitor active until the signal is resolved.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-300/10 text-sentra-cyan">
                    {selectedReport.report ? <ShieldCheck className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                  </span>
                  <div>
                    <p className="font-semibold text-white">
                      {selectedReport.report ? "Executive intelligence report" : "AI assistant analysis"}
                    </p>
                    <p className="text-xs text-white/42">
                      {selectedReport.report ? "Facts, forecasts, actions, and verification status" : "Situation summary and recommended next moves"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 min-h-80 rounded-3xl border border-white/10 bg-white/[0.045] p-5">
                  {selectedReport.report ? (
                    <div className="grid gap-5">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/35">Situation</p>
                        <p className="mt-2 text-sm leading-7 text-white/68">{selectedReport.report.situation}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/35">Business impact</p>
                        <p className="mt-2 text-sm leading-7 text-white/68">{selectedReport.report.impact}</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-white/35">Action plan</p>
                          <ul className="mt-3 grid gap-2">
                            {selectedReport.report.actionPlan.map((item) => (
                              <li key={item} className="flex gap-2 text-sm leading-6 text-white/68">
                                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-200" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-white/35">Watch items</p>
                          <ul className="mt-3 grid gap-2">
                            {selectedReport.report.watchItems.map((item) => (
                              <li key={item} className="flex gap-2 text-sm leading-6 text-white/68">
                                <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-200" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/35">Claim verification</p>
                        <div className="mt-3 grid gap-2">
                          {selectedReport.report.verifiedClaims.map((claim) => (
                            <div key={claim.id} className="rounded-2xl border border-white/10 bg-black/10 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <Badge variant={claim.status === "verified" ? "success" : claim.status === "partial" ? "default" : "risk"}>
                                  {claim.status}
                                </Badge>
                                <span className="text-xs text-cyan-100/58">{claim.confidence}%</span>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-white/64">{claim.claim}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border-t border-white/10 pt-5">
                        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-white/35">CRM & automation</p>
                        <AutomationWebhookPanel
                          report={selectedReport.report}
                          requirement={selectedReport.monitor.requirement}
                          monitorId={selectedReport.monitor.id}
                        />
                      </div>
                    </div>
                  ) : aiLoading ? (
                    <div className="flex h-64 items-center justify-center gap-3 text-sm text-white/60">
                      <Sparkles className="h-4 w-4 animate-pulse text-sentra-cyan" />
                      Sentra is analysing the alert...
                    </div>
                  ) : (
                    <>
                      {aiError && (
                        <div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                          {aiError}
                        </div>
                      )}
                      <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-sm prose-p:leading-7 prose-p:text-white/68 prose-li:text-sm prose-li:text-white/68 prose-strong:text-white">
                        <ReactMarkdown>{aiSummary}</ReactMarkdown>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
      </WorkspaceSection>
    </>
  );
}
