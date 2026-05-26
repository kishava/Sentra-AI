"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BellRing, Bot, CheckCircle2, Pause, Play, Radar, Sparkles, Trash2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { signalStream } from "@/data/mock-intelligence";
import { cn } from "@/lib/utils";
import type { IntelligenceSignal, MonitorIntent, Severity } from "@/types/intelligence";

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
  signal: IntelligenceSignal;
};

const STORAGE_KEY = "sentra-monitors";
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

function getMatches(monitor: Monitor) {
  return signalStream.filter((signal) => matchesRequirement(monitor, signal));
}

function sendBrowserNotification(monitor: Monitor, signal: IntelligenceSignal, onOpenReport: () => void) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const notification = new Notification("Sentra monitor alert", {
    body: `${monitor.requirement}: ${signal.title}`,
    tag: `${monitor.id}-${signal.id}`,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
    onOpenReport();
  };
}

export function MonitorCenter() {
  const aiAbortRef = useRef<AbortController | null>(null);
  const intentAbortRef = useRef<AbortController | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>(loadMonitors);
  const [requirement, setRequirement] = useState("");
  const [category, setCategory] = useState<"any" | SignalCategory>("any");
  const [minimumSeverity, setMinimumSeverity] = useState<Severity>("medium");
  const [monitorIntent, setMonitorIntent] = useState<MonitorIntent | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentError, setIntentError] = useState("");
  const [selectedReport, setSelectedReport] = useState<SelectedReport | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(monitors));
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

  useEffect(() => {
    const checkMonitors = () => {
      setMonitors((current) =>
        current.map((monitor) => {
          if (!monitor.active) return monitor;

          const matches = getMatches(monitor);
          const newMatches = matches.filter((signal) => !monitor.alertedSignalIds.includes(signal.id));

          newMatches.forEach((signal) => {
            toast.success("Monitor alert triggered", {
              description: `${monitor.requirement}: ${signal.title}`,
              action: {
                label: "Open report",
                onClick: () => openReport(monitor, signal),
              },
            });
            sendBrowserNotification(monitor, signal, () => openReport(monitor, signal));
          });

          return {
            ...monitor,
            lastCheckedAt: new Date().toISOString(),
            alertedSignalIds: Array.from(
              new Set([...monitor.alertedSignalIds, ...newMatches.map((signal) => signal.id)]),
            ),
          };
        }),
      );
    };

    checkMonitors();
    const interval = window.setInterval(checkMonitors, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const monitorSummaries = useMemo(
    () =>
      monitors.map((monitor) => ({
        monitor,
        matches: getMatches(monitor),
      })),
    [monitors],
  );
  const activeMonitorCount = monitors.filter((monitor) => monitor.active).length;

  async function openReport(monitor: Monitor, signal: IntelligenceSignal) {
    aiAbortRef.current?.abort();
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

  function createMonitor() {
    const trimmed = requirement.trim();
    if (!trimmed) {
      toast.error("Describe the signal you want Sentra to monitor.");
      return;
    }
    const interpretedRequirement = monitorIntent?.normalizedRequirement?.trim() || trimmed;

    const monitor: Monitor = {
      id: crypto.randomUUID(),
      requirement: interpretedRequirement,
      category,
      minimumSeverity,
      active: true,
      createdAt: new Date().toISOString(),
      keywords: monitorIntent?.keywords,
      alertedSignalIds: [],
    };

    setMonitors((current) => [monitor, ...current]);
    setRequirement("");
    setMonitorIntent(null);
    toast.success("Monitor activated", {
      description:
        monitorIntent?.provider === "openai"
          ? "AI interpreted your requirement and configured the monitor."
          : "Sentra will alert you when matching signals appear.",
    });
  }

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
    setMonitors((current) =>
      current.map((monitor) =>
        monitor.id === id
          ? {
              ...monitor,
              active: !monitor.active,
            }
          : monitor,
      ),
    );
  }

  function removeMonitor(id: string) {
    setMonitors((current) => current.filter((monitor) => monitor.id !== id));
  }

  return (
    <section className="mb-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="p-5 md:p-6" glow>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <Badge variant="cyan">Automated monitoring</Badge>
            <h2 className="mt-3 text-2xl font-semibold text-white">Create signal monitor</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Define the requirement, category, and alert threshold. Sentra will keep checking
              incoming signals and alert you when a match appears.
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
                    </div>
                    <h4 className="mt-3 break-words font-medium text-white">{monitor.requirement}</h4>
                    {matches[0] ? (
                      <button
                        className="sentra-focus mt-2 block text-left text-sm leading-6 text-white/55 transition hover:text-white"
                        onClick={() => openReport(monitor, matches[0])}
                      >
                        Latest match: <span className="text-white/80">{matches[0].title}</span>
                      </button>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-white/45">
                        No matching signals in the current stream yet.
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {matches[0] && (
                      <Button variant="neon" onClick={() => openReport(monitor, matches[0])}>
                        <Bot className="h-4 w-4" />
                        Report
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
                  <Badge variant="risk">{selectedReport.signal.severity}</Badge>
                  <Badge variant="cyan">{selectedReport.signal.category}</Badge>
                  <Badge variant="default">{Math.round(selectedReport.signal.confidence * 100)}% confidence</Badge>
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
                  {selectedReport.signal.title}
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
                <p className="text-sm uppercase tracking-[0.24em] text-white/35">Signal details</p>
                <div className="mt-5 grid gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">Situation</p>
                    <p className="mt-2 text-sm leading-6 text-white/68">{selectedReport.signal.summary}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">Source</p>
                    <p className="mt-2 text-sm leading-6 text-white/68">{selectedReport.signal.source}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">Response posture</p>
                    <div className="mt-3 flex items-start gap-3 text-sm leading-6 text-white/65">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-200" />
                      Review the evidence, assign an owner, and keep the monitor active until the signal is resolved.
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-300/10 text-sentra-cyan">
                    <Bot className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-white">AI assistant analysis</p>
                    <p className="text-xs text-white/42">Situation summary and recommended next moves</p>
                  </div>
                </div>

                <div className="mt-5 min-h-80 rounded-3xl border border-white/10 bg-white/[0.045] p-5">
                  {aiLoading ? (
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
    </section>
  );
}
