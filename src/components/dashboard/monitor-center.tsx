"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, BellRing, Bot, CheckCircle2, Pause, Play, Radar, ShieldCheck, Sparkles, TimerReset, Trash2, X, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signalStream } from "@/data/mock-intelligence";
import { AutomationWebhookPanel } from "@/components/gtm/crm-export-button";
import { getWorkspaceContext } from "@/lib/gtm/workspace-context";
import { useWorkspaceSession } from "@/lib/hooks/use-workspace-session";
import { inferMonitorIntentHeuristically } from "@/lib/monitor-intent-heuristic";
import { signInFor } from "@/lib/landing/auth-links";
import {
  buildPersonalizedSuggestions,
  plainEnglishMonitorSummary,
  recordMonitorHistory,
} from "@/lib/monitor-history";
import { repairLocalStorageQuota, syncLocalSessionToCookie } from "@/lib/local-auth";
import { MonitorPromptField } from "@/components/dashboard/monitor-prompt-field";
import { getAlertWebhookUrl, getAutomationWebhookUrl, saveAlertWebhookUrl, saveAutomationWebhookUrl } from "@/lib/webhooks";
import { WorkspaceSection } from "@/components/workspace/workspace-page";
import { isBrowserSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ChangeDetectionPanel } from "@/components/dashboard/change-detection-panel";
import { MonitorTimeline } from "@/components/dashboard/monitor-timeline";
import { initializePresetDemoStorage, PRESET_DEMO_MONITOR_REQUIREMENT } from "@/lib/demo/preset-scenario";
import { appendTimelineEvents, recordWorkflowTriggered } from "@/lib/monitor-timeline";
import { loadDetectedChanges, saveDetectedChanges } from "@/services/change-detection";
import type { DetectedChange, ExecutiveIntelligenceReport, IntelligenceSignal, MonitorIntent, Severity } from "@/types/intelligence";
import { claimStatusLabel, normalizeClaimStatus } from "@/types/intelligence";

type SignalCategory = IntelligenceSignal["category"];

type Monitor = {
  id: string;
  requirement: string;
  category: "any" | SignalCategory;
  minimumSeverity: Severity;
  active: boolean;
  createdAt: string;
  lastCheckedAt?: string;
  lastMatchedCount?: number;
  lastMatchTitle?: string;
  lastProvider?: string;
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

function buildLocalMonitor(input: {
  requirement: string;
  category: Monitor["category"];
  minimumSeverity: Severity;
  keywords?: string[];
}): Monitor {
  return {
    id: crypto.randomUUID(),
    requirement: input.requirement,
    category: input.category,
    minimumSeverity: input.minimumSeverity,
    keywords: input.keywords ?? [],
    active: true,
    createdAt: new Date().toISOString(),
    alertedSignalIds: [],
  };
}

export function MonitorCenter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready: sessionReady, signedIn } = useWorkspaceSession();
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
  const [detectedChanges, setDetectedChanges] = useState<DetectedChange[]>(() =>
    typeof window !== "undefined" ? loadDetectedChanges() : [],
  );
  const [demoLoading, setDemoLoading] = useState(false);
  const [timelineKey, setTimelineKey] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );

  useEffect(() => {
    repairLocalStorageQuota();
    syncLocalSessionToCookie();
  }, []);

  const promptSuggestions = useMemo(
    () => buildPersonalizedSuggestions(monitors.map((m) => ({ requirement: m.requirement, category: m.category, createdAt: m.createdAt }))),
    [monitors],
  );

  const promptSuggestionsTitle = monitors.length > 0 ? "Based on your monitors" : "Quick examples";

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

        if (monitorsRes.status === 401 || monitorsRes.status === 403) {
          setMonitors(loadMonitors());
          return;
        }

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
          const mapped = monitorsData.monitors.map((monitor) => ({
            id: monitor.id,
            requirement: monitor.requirement,
            category: monitor.category as Monitor["category"],
            minimumSeverity: monitor.minimum_severity,
            keywords: monitor.keywords,
            active: monitor.active,
            createdAt: monitor.last_checked_at ?? new Date().toISOString(),
            lastCheckedAt: monitor.last_checked_at ?? undefined,
            alertedSignalIds: [] as string[],
          }));
          setMonitors(mapped);
          if (monitorsData.localMode) saveMonitors(mapped);
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
          return;
        }

        if (legacy.length) {
          setMonitors(legacy);
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
    if (!monitors.length) return;
    const timeout = window.setTimeout(() => saveMonitors(monitors), 400);
    return () => window.clearTimeout(timeout);
  }, [monitors]);

  function enrichIntent(intent: MonitorIntent, rawInput: string): MonitorIntent {
    return {
      ...intent,
      plainSummary:
        intent.plainSummary ??
        plainEnglishMonitorSummary({
          requirement: rawInput,
          normalizedRequirement: intent.normalizedRequirement,
          category: intent.category,
          minimumSeverity: intent.minimumSeverity,
        }),
    };
  }

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

        if (response.status === 401 || response.status === 403 || !response.ok) {
          const local = enrichIntent(inferMonitorIntentHeuristically(input), input);
          setMonitorIntent(local);
          setCategory(local.category);
          setMinimumSeverity(local.minimumSeverity);
          setIntentError("");
          return;
        }

        if (!data.intent) {
          throw new Error(data.error || "Sentra could not understand this monitor yet.");
        }

        const intent = enrichIntent(data.intent, input);
        setMonitorIntent(intent);
        setCategory(intent.category);
        setMinimumSeverity(intent.minimumSeverity);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const local = enrichIntent(inferMonitorIntentHeuristically(input), input);
        setMonitorIntent(local);
        setCategory(local.category);
        setMinimumSeverity(local.minimumSeverity);
        setIntentError("");
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

  const activeMonitorCount = monitors.filter((monitor) => monitor.active).length;

  function updateMonitorCheckState(
    monitorId: string,
    patch: Pick<Monitor, "lastCheckedAt" | "lastMatchedCount" | "lastMatchTitle" | "lastProvider">,
  ) {
    setMonitors((current) => {
      const next = current.map((item) => (item.id === monitorId ? { ...item, ...patch } : item));
      saveMonitors(next);
      return next;
    });
  }

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
      toast.error("Describe what you want Sentra to watch.");
      return;
    }

    if (sessionReady && !signedIn) {
      router.push(signInFor("/alerts"));
      return;
    }

    const interpretedRequirement = monitorIntent?.normalizedRequirement?.trim() || trimmed;
    const monitorPayload = {
      requirement: interpretedRequirement,
      category,
      minimumSeverity,
      keywords: monitorIntent?.keywords ?? [],
      active: true,
    };

    let monitor: Monitor | null = null;

    try {
      const response = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(monitorPayload),
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
        localMode?: boolean;
        error?: string;
      };

      if (response.ok && data.monitor) {
        monitor = {
          id: data.monitor.id,
          requirement: data.monitor.requirement,
          category: data.monitor.category as Monitor["category"],
          minimumSeverity: data.monitor.minimum_severity,
          keywords: data.monitor.keywords,
          active: data.monitor.active,
          createdAt: new Date().toISOString(),
          alertedSignalIds: [],
        };
      } else if (response.status === 401 || response.status === 403) {
        monitor = buildLocalMonitor(monitorPayload);
      } else {
        throw new Error(data.error || "Could not save monitor.");
      }
    } catch (error) {
      if (error instanceof Error && /401|sign in|unauthorized/i.test(error.message)) {
        monitor = buildLocalMonitor(monitorPayload);
      } else {
        toast.error(error instanceof Error ? error.message : "Could not create monitor.");
        return;
      }
    }

    if (!monitor) return;

    recordMonitorHistory({ requirement: monitor.requirement, category: monitor.category });

    setMonitors((current) => {
      const next = [monitor!, ...current.filter((item) => item.id !== monitor!.id)];
      saveMonitors(next);
      return next;
    });
    setRequirement("");
    setMonitorIntent(null);
    toast.success("Monitor started", { description: "Running a live check now…" });
    await checkMonitorNow(monitor.id);
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
      recordWorkflowTriggered({
        monitorId,
        monitorRequirement: report.monitorRequirement,
        workflowType: "Slack + HubSpot",
      });
      setTimelineKey((current) => current + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Webhook delivery failed.");
    } finally {
      setWebhookSending(false);
    }
  }

  async function loadPresetDemo() {
    setDemoLoading(true);
    try {
      const response = await fetch("/api/demo/preset", { method: "POST" });
      const data = (await response.json()) as {
        monitor?: Monitor;
        signals?: IntelligenceSignal[];
        report?: ExecutiveIntelligenceReport;
        detectedChanges?: DetectedChange[];
        timeline?: Parameters<typeof appendTimelineEvents>[0];
        error?: string;
      };

      if (!response.ok) throw new Error(data.error || "Demo could not be loaded.");

      const bundle = initializePresetDemoStorage();
      const monitor = data.monitor ?? bundle.monitor;
      const report = data.report ?? bundle.report;
      const changes = data.detectedChanges ?? [bundle.detectedChange];
      const timeline = data.timeline ?? bundle.timeline;

      appendTimelineEvents(timeline);
      saveDetectedChanges([...changes, ...loadDetectedChanges()]);

      setMonitors((current) => {
        const withoutDemo = current.filter((item) => item.id !== monitor.id);
        const next = [{ ...monitor, lastCheckedAt: new Date().toISOString() }, ...withoutDemo];
        if (!isBrowserSupabaseConfigured()) saveMonitors(next);
        return next;
      });
      setSignals((current) => {
        const incoming = data.signals ?? bundle.signals;
        const merged = [...incoming, ...current];
        const seen = new Set<string>();
        return merged.filter((signal) => {
          if (seen.has(signal.id)) return false;
          seen.add(signal.id);
          return true;
        });
      });
      setReportsByMonitor((current) => ({ ...current, [monitor.id]: report }));
      saveLocalReport(report);
      setDetectedChanges(changes);
      setTimelineKey((current) => current + 1);
      setRequirement(PRESET_DEMO_MONITOR_REQUIREMENT);
      setCategory("pricing");
      setMinimumSeverity("high");

      toast.success("Competitive pricing demo loaded", {
        description: "ApexAnalytics Pro changed from $99 to $129 with evidence, report, and timeline.",
        action: { label: "Open report", onClick: () => openReport(monitor, bundle.signals[0], report) },
      });
      openReport(monitor, bundle.signals[0], report);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Demo load failed.");
    } finally {
      setDemoLoading(false);
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
      syncLocalSessionToCookie();

      const runCheck = () =>
        fetch(`/api/monitors/${monitorId}/check`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requirement: monitor.requirement,
            category: monitor.category,
            minimumSeverity: monitor.minimumSeverity,
            keywords: monitor.keywords ?? [],
            workspace: getWorkspaceContext(),
          }),
        });

      let response = await runCheck();
      if (response.status === 401 || response.status === 403) {
        syncLocalSessionToCookie();
        response = await runCheck();
      }

      const data = (await response.json()) as {
        signals?: IntelligenceSignal[];
        provider?: string;
        matchedCount?: number;
        report?: ExecutiveIntelligenceReport;
        detectedChanges?: DetectedChange[];
        error?: string;
      };

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast.error("Session expired — sign in again to run live checks.", {
            action: { label: "Sign in", onClick: () => router.push(signInFor("/alerts")) },
          });
          return;
        }
        if (response.status === 404) {
          toast.error(data.error || "Monitor not found — refresh and try again.");
          return;
        }
        throw new Error(data.error || "Check failed.");
      }

      const matched = data.signals ?? [];
      const topMatch = matched[0];

      updateMonitorCheckState(monitorId, {
        lastCheckedAt: new Date().toISOString(),
        lastMatchedCount: data.matchedCount ?? matched.length,
        lastMatchTitle: topMatch?.title,
        lastProvider: data.provider,
      });

      if (matched.length) {
        setSignals((current) => {
          const merged = [...matched, ...current];
          const seen = new Set<string>();
          return merged.filter((signal) => {
            if (seen.has(signal.id)) return false;
            seen.add(signal.id);
            return true;
          });
        });
      }

      if (data.detectedChanges?.length) {
        setDetectedChanges((current) => {
          const merged = [...data.detectedChanges!, ...current];
          const seen = new Set<string>();
          const next = merged.filter((change) => {
            if (seen.has(change.id)) return false;
            seen.add(change.id);
            return true;
          });
          saveDetectedChanges(next);
          return next;
        });
        setTimelineKey((current) => current + 1);
      }

      if (data.report) {
        setReportsByMonitor((current) => ({ ...current, [monitorId]: data.report! }));
        saveLocalReport(data.report);
        toast.success("Evidence-backed report ready", {
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

    } catch (error) {
      const message = error instanceof Error ? error.message : "Check failed.";
      if (/401|403|signed in|unauthorized/i.test(message)) {
        toast.error("Session expired — sign in again to run live checks.", {
          action: { label: "Sign in", onClick: () => router.push(signInFor("/alerts")) },
        });
        return;
      }
      toast.error(message);
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
      <WorkspaceSection id="create-signal-monitor">
        {sessionReady && !signedIn && (
          <div className="mb-4 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            Sign in to save monitors and run live checks.{" "}
            <button
              type="button"
              className="sentra-focus font-medium underline underline-offset-2"
              onClick={() => router.push(signInFor("/alerts"))}
            >
              Sign in
            </button>
          </div>
        )}
        <Card className="p-5 md:p-6" glow>
          <Badge variant="cyan">New monitor</Badge>
          <h2 className="mt-3 text-2xl font-semibold text-white">What should we watch?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
            One sentence is enough. Sentra interprets it, then checks the live web every 30 minutes (or when you tap
            Check now).
          </p>

          <div className="mt-6 space-y-5">
            <MonitorPromptField
              value={requirement}
              onChange={setRequirement}
              suggestions={promptSuggestions}
              suggestionsTitle={promptSuggestionsTitle}
              onPickSuggestion={(selection) => {
                setRequirement(selection.requirement);
                if (selection.category) {
                  setCategory(selection.category);
                }
              }}
            />

            {(intentLoading || monitorIntent) && (
              <div className="rounded-xl border border-cyan-200/15 bg-cyan-300/5 px-4 py-3 text-sm">
                <div className="flex items-start gap-2">
                  <Sparkles className={cn("mt-0.5 h-4 w-4 shrink-0 text-sentra-cyan", intentLoading && "animate-pulse")} />
                  <div className="min-w-0 space-y-2">
                    {intentLoading ? (
                      <p className="text-white/50">Sentra is understanding what you want to watch…</p>
                    ) : monitorIntent ? (
                      <>
                        <p className="leading-6 text-white/75">
                          {monitorIntent.plainSummary ??
                            plainEnglishMonitorSummary({
                              requirement,
                              normalizedRequirement: monitorIntent.normalizedRequirement,
                              category: monitorIntent.category,
                              minimumSeverity: monitorIntent.minimumSeverity,
                            })}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="cyan">{monitorIntent.category}</Badge>
                          <Badge variant="risk">{monitorIntent.minimumSeverity}+ priority</Badge>
                          {monitorIntent.provider !== "heuristic" && (
                            <Badge variant="success">AI understood</Badge>
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {intentError && !intentLoading && (
              <p className="text-sm text-amber-100/90">{intentError}</p>
            )}
          </div>

          <details className="group mt-6 rounded-2xl border border-white/10 bg-white/[0.03] open:bg-white/[0.02]">
            <summary className="sentra-focus cursor-pointer list-none px-4 py-3 text-sm text-white/55 marker:content-none hover:text-white/75 [&::-webkit-details-marker]:hidden">
              <span className="font-medium text-white/70">Options</span>
              <span className="text-white/40"> — category, severity, webhooks</span>
            </summary>
            <div className="space-y-4 border-t border-white/10 px-4 pb-4 pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-xs text-white/45">
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as "any" | SignalCategory)}
                  className="sentra-focus h-11 rounded-2xl border border-white/10 bg-sentra-panel px-4 text-sm text-white"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item === "any" ? "Any category" : item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs text-white/45">
                Minimum severity
                <select
                  value={minimumSeverity}
                  onChange={(event) => setMinimumSeverity(event.target.value as Severity)}
                  className="sentra-focus h-11 rounded-2xl border border-white/10 bg-sentra-panel px-4 text-sm text-white"
                >
                  {severities.map((severity) => (
                    <option key={severity} value={severity}>
                      {severity}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
            <Button
              type="button"
              variant="ghost"
              className="h-auto px-0 text-sm text-white/45 hover:text-white/70"
              onClick={() => setShowAdvanced((value) => !value)}
            >
              {showAdvanced ? "Hide" : "Show"} webhooks &amp; demo
            </Button>
            {showAdvanced && (
              <div className="mt-3 grid gap-3">
                <Button
                  variant="ghost"
                  className="w-fit"
                  onClick={enableBrowserNotifications}
                  disabled={notificationPermission === "granted" || notificationPermission === "unsupported"}
                >
                  <BellRing className="h-4 w-4" />
                  {notificationPermission === "granted" ? "Browser alerts on" : "Enable browser alerts"}
                </Button>
                <Button variant="neon" className="w-fit" onClick={loadPresetDemo} disabled={demoLoading}>
                  <Zap className="h-4 w-4" />
                  {demoLoading ? "Loading…" : "Load pricing demo"}
                </Button>
                <Input
                  value={webhookUrl}
                  onChange={(event) => setWebhookUrl(event.target.value)}
                  placeholder="Alert webhook (Slack, Discord…)"
                  className="h-10"
                  aria-label="Alert webhook URL"
                />
                <Input
                  value={automationWebhookUrl}
                  onChange={(event) => setAutomationWebhookUrl(event.target.value)}
                  placeholder="CRM / automation webhook (optional)"
                  className="h-10"
                  aria-label="Automation webhook URL"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={demoAutopilot ? "neon" : "ghost"}
                    onClick={() => setDemoAutopilot((current) => !current)}
                    disabled={!activeMonitorCount}
                  >
                    <TimerReset className="h-4 w-4" />
                    {demoAutopilot ? "Autopilot on" : "Autopilot"}
                  </Button>
                  {webhookUrl.trim() && (
                    <Badge variant={webhookSending ? "cyan" : "success"}>
                      {webhookSending ? "Sending" : "Webhook saved"}
                    </Badge>
                  )}
                </div>
              </div>
            )}
            </div>
            </div>
          </details>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/45">
              {activeMonitorCount === 0
                ? "No active monitors yet"
                : `${activeMonitorCount} active monitor${activeMonitorCount === 1 ? "" : "s"}`}
            </p>
            <Button variant="neon" onClick={createMonitor} className="sm:min-w-[200px]">
              <Radar className="h-4 w-4" />
              Start monitoring
            </Button>
          </div>
        </Card>

        {monitors.length > 0 && (
          <div className="mt-6 grid gap-3">
            <h3 className="text-lg font-semibold text-white">Your monitors</h3>
            {monitors.map((monitor) => {
              const report = reportsByMonitor[monitor.id];
              const matchCount = monitor.lastMatchedCount ?? 0;
              const lastChecked = monitor.lastCheckedAt
                ? new Date(monitor.lastCheckedAt).toLocaleString()
                : null;

              return (
              <Card key={monitor.id} className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={monitor.active ? "success" : "default"}>
                        {monitor.active ? "Active" : "Paused"}
                      </Badge>
                      <span className="text-xs text-white/40">
                        {matchCount} match{matchCount === 1 ? "" : "es"} from last check · {monitor.category}
                      </span>
                      {monitor.lastProvider && (
                        <span className="text-xs text-white/30">
                          {monitor.lastProvider === "bright-data" ? "Live web" : "Sample"}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium leading-6 text-white">{monitor.requirement}</p>
                    {lastChecked && (
                      <p className="mt-1 text-xs text-white/35">Last checked {lastChecked}</p>
                    )}
                    {monitor.lastMatchTitle ? (
                      <button
                        type="button"
                        className="sentra-focus mt-1 text-left text-xs text-cyan-100/80 hover:text-cyan-100"
                        onClick={() => openReport(monitor, undefined, report)}
                      >
                        Latest finding: {monitor.lastMatchTitle}
                      </button>
                    ) : lastChecked ? (
                      <p className="mt-1 text-xs text-white/40">No matching signals on the last check.</p>
                    ) : (
                      <p className="mt-1 text-xs text-white/40">Tap Check now to run the first live scan.</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      variant="neon"
                      size="sm"
                      disabled={checkingId === monitor.id}
                      onClick={() => checkMonitorNow(monitor.id)}
                    >
                      {checkingId === monitor.id ? "Checking…" : "Check now"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleMonitor(monitor.id)} aria-label="Pause or resume">
                      {monitor.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeMonitor(monitor.id)} aria-label="Delete monitor">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
            })}

            <Button
              type="button"
              variant="ghost"
              className="w-fit text-sm text-white/45"
              onClick={() => setShowActivity((value) => !value)}
            >
              {showActivity ? "Hide activity log" : "Show activity log"}
            </Button>
            {showActivity && (
              <>
                {detectedChanges.length > 0 && (
                  <ChangeDetectionPanel changes={detectedChanges.slice(0, 6)} />
                )}
                <MonitorTimeline key={timelineKey} />
              </>
            )}
          </div>
        )}
      </WorkspaceSection>

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
                  {selectedReport.report ? "Evidence-backed sources" : "Signal details"}
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
                            {source.excerpt && (
                              <p className="mt-2 rounded-xl border border-white/10 bg-black/15 p-2 text-xs leading-5 text-white/50">
                                &ldquo;{source.excerpt.slice(0, 180)}{source.excerpt.length > 180 ? "…" : ""}&rdquo;
                              </p>
                            )}
                            {source.collectedAt && (
                              <p className="mt-2 text-xs text-white/35">
                                Collected {new Date(source.collectedAt).toLocaleString()}
                                {source.brightDataMode ? ` · ${source.brightDataMode}` : ""}
                              </p>
                            )}
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
                      {selectedReport.report.detectedChanges && selectedReport.report.detectedChanges.length > 0 && (
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-white/35">Snapshot changes</p>
                          <div className="mt-3 grid gap-2">
                            {selectedReport.report.detectedChanges.map((change) => (
                              <div key={change.id} className="rounded-2xl border border-white/10 bg-black/10 p-3">
                                <p className="text-sm font-medium text-white">
                                  {change.field}: {change.oldValue} → {change.newValue}
                                </p>
                                <p className="mt-1 text-xs text-white/45">{new Date(change.detectedAt).toLocaleString()}</p>
                                <a href={change.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs text-cyan-100/70">
                                  {change.sourceUrl}
                                </a>
                                <p className="mt-2 text-xs leading-5 text-white/50">{change.impact}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/35">Claim verification</p>
                        <div className="mt-3 grid gap-2">
                          {selectedReport.report.verifiedClaims.map((claim) => {
                            const status = normalizeClaimStatus(claim.status);
                            return (
                            <div key={claim.id} className="rounded-2xl border border-white/10 bg-black/10 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <Badge variant={status === "evidence-backed" ? "success" : status === "partial" ? "default" : "risk"}>
                                  {claimStatusLabel(status)}
                                </Badge>
                                <span className="text-xs text-cyan-100/58">{claim.confidence}%</span>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-white/64">{claim.claim}</p>
                              {claim.sourceRecords?.map((record) => (
                                <div key={`${claim.id}-${record.sourceId}`} className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                  {record.url && (
                                    <a href={record.url} target="_blank" rel="noreferrer" className="block truncate text-xs text-cyan-100/75">
                                      {record.url}
                                    </a>
                                  )}
                                  <p className="mt-2 text-xs leading-5 text-white/48">&ldquo;{record.excerpt.slice(0, 200)}{record.excerpt.length > 200 ? "…" : ""}&rdquo;</p>
                                  <p className="mt-2 text-xs text-white/35">
                                    Collected {new Date(record.collectedAt).toLocaleString()}
                                    {record.brightDataMode ? ` · Bright Data ${record.brightDataMode}` : ""}
                                  </p>
                                </div>
                              ))}
                            </div>
                          );
                          })}
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
    </>
  );
}
