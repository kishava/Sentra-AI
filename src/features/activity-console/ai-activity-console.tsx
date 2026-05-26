"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowDownToLine,
  CirclePause,
  CirclePlay,
  Cpu,
  Expand,
  Filter,
  RadioTower,
  TerminalSquare,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  ActivityCategory,
  ActivityLog,
  CollectionSource,
  PipelineHealth,
} from "@/types/activity-console";
import type { ReasoningStage } from "@/types/world-engine";

type ActivityConsoleProps = {
  logs: ActivityLog[];
  sources: CollectionSource[];
  thoughts: ReasoningStage[];
  health?: PipelineHealth;
  running: boolean;
};

const categoryColors: Record<ActivityCategory, string> = {
  INTAKE: "text-cyan-200",
  ROUTER: "text-violet-200",
  SERP: "text-blue-200",
  SOURCE: "text-emerald-200",
  AI: "text-cyan-100",
  SIGNAL: "text-amber-200",
  MAP: "text-fuchsia-200",
  CHART: "text-violet-200",
  VOICE: "text-blue-200",
  RISK: "text-rose-200",
  COMPLETE: "text-emerald-200",
  SYSTEM: "text-rose-200",
};

const streamRegistry: CollectionSource[] = [
  { id: "bright-data-serp", name: "Google SERP via Bright Data", channel: "api", status: "idle", detail: "Awaiting route selection" },
  { id: "openai-live-search", name: "OpenAI Web Search", channel: "api", status: "idle", detail: "Awaiting route selection" },
  { id: "reuters", name: "Reuters", channel: "source", status: "idle", detail: "Not referenced in current run" },
  { id: "linkedin", name: "LinkedIn", channel: "source", status: "idle", detail: "Not referenced in current run" },
  { id: "techcrunch", name: "TechCrunch", channel: "source", status: "idle", detail: "Not referenced in current run" },
  { id: "reddit", name: "Reddit", channel: "source", status: "idle", detail: "Not referenced in current run" },
  { id: "github", name: "GitHub", channel: "source", status: "idle", detail: "Not referenced in current run" },
  { id: "sec", name: "SEC filings", channel: "source", status: "idle", detail: "Not referenced in current run" },
  { id: "x", name: "X / Twitter", channel: "source", status: "idle", detail: "Not referenced in current run" },
  { id: "company", name: "Company websites", channel: "source", status: "idle", detail: "Not referenced in current run" },
];

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function statusTone(status: CollectionSource["status"]) {
  if (status === "active" || status === "connecting") return "bg-cyan-300 shadow-[0_0_12px_rgba(83,244,255,.85)]";
  if (status === "success") return "bg-emerald-300";
  if (status === "error") return "bg-rose-300";
  if (status === "unavailable") return "bg-amber-300";
  return "bg-white/20";
}

export function LiveAgentLogs({ logs, running }: { logs: ActivityLog[]; running: boolean }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  // The terminal is intentionally windowed so long-lived live sessions keep a bounded DOM.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => 52,
    overscan: 8,
  });

  useEffect(() => {
    if (logs.length) virtualizer.scrollToIndex(logs.length - 1, { align: "end" });
  }, [logs.length, virtualizer]);

  return (
    <div ref={viewportRef} className="h-[368px] overflow-auto font-mono text-[12px]" role="log" aria-live="polite" aria-label="Live AI processing events">
      {!logs.length && (
        <div className="grid h-full place-items-center text-white/34">
          <p>&gt; Waiting for an intelligence directive<span className="terminal-cursor">_</span></p>
        </div>
      )}
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((row) => {
          const log = logs[row.index];
          const latest = row.index === logs.length - 1;
          return (
            <div
              key={log.id}
              ref={virtualizer.measureElement}
              data-index={row.index}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${row.start}px)` }}
            >
              <motion.div
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-3 border-b border-white/[0.045] px-3 py-2.5 leading-5"
              >
                <span className="shrink-0 text-white/34">[{formatTime(log.timestamp)}]</span>
                <span className={cn("w-16 shrink-0 font-semibold", categoryColors[log.category])}>{log.category}</span>
                <span className="text-white/34">-&gt;</span>
                <div className="min-w-0 flex-1">
                  <p className={cn("break-words text-white/70", log.level === "error" && "text-rose-100", log.level === "warning" && "text-amber-100")}>
                    {log.message}{latest && running && <span className="terminal-cursor">_</span>}
                  </p>
                  {(log.source || log.latencyMs !== undefined || log.confidence !== undefined) && (
                    <p className="text-[10px] text-white/36">
                      {log.source && `SOURCE=${log.source}  `}
                      {log.latencyMs !== undefined && `LATENCY=${log.latencyMs}ms  `}
                      {log.confidence !== undefined && `CONFIDENCE=${log.confidence}%`}
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SourceTracker({ sources }: { sources: CollectionSource[] }) {
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const discovered = sources.filter((source) => !streamRegistry.some((registered) => registered.id === source.id));
  const statusPriority: Record<CollectionSource["status"], number> = {
    active: 0,
    connecting: 1,
    success: 2,
    error: 3,
    unavailable: 4,
    idle: 5,
  };
  const visible = [...streamRegistry.map((source) => sourceMap.get(source.id) ?? source), ...discovered]
    .sort((left, right) => statusPriority[left.status] - statusPriority[right.status]);

  return (
    <div className="grid gap-2" aria-label="Live collection streams">
      {visible.map((source) => (
        <div key={source.id} className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", statusTone(source.status), (source.status === "active" || source.status === "connecting") && "animate-pulse")} />
            <p className="truncate text-xs text-white/68">{source.name}</p>
            <span className="ml-auto text-[10px] uppercase text-white/34">{source.status}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-white/35">
            <span className="truncate">{source.detail}</span>
            {source.latencyMs !== undefined && <span>{source.latencyMs}ms</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function IntelligencePipelineMonitor({ health, running }: { health?: PipelineHealth; running: boolean }) {
  const cards = [
    ["SYSTEM", health?.status ?? (running ? "running" : "idle")],
    ["EVENTS", String(health?.events ?? 0)],
    ["SOURCES", `${health?.completedSources ?? 0}/${(health?.activeSources ?? 0) + (health?.completedSources ?? 0)}`],
    ["LATENCY", health?.apiLatencyMs !== undefined ? `${health.apiLatencyMs}ms` : "--"],
    ["ELAPSED", health ? `${(health.elapsedMs / 1000).toFixed(1)}s` : "--"],
  ];

  return (
    <div>
      <p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-cyan-100/48">
        <Cpu className="h-3.5 w-3.5" /> System health monitor
      </p>
      <div className="grid grid-cols-2 gap-2">
        {cards.map(([label, value]) => (
          <div key={label} className={cn("rounded-xl border border-white/[0.06] bg-white/[0.03] p-3", label === "ELAPSED" && "col-span-2")}>
            <p className="text-[9px] tracking-[0.18em] text-white/34">{label}</p>
            <p className="mt-2 font-mono text-sm text-cyan-100">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 truncate font-mono text-[10px] text-white/38">STAGE: {health?.stage ?? "Awaiting task"}</p>
    </div>
  );
}

export function StreamingStatusEngine({ health, running }: { health?: PipelineHealth; running: boolean }) {
  const status = health?.status ?? (running ? "running" : "idle");
  const variant = status === "failed" ? "risk" : status === "degraded" ? "violet" : "cyan";

  return (
    <Badge variant={variant}>
      <span className={cn("mr-2 h-1.5 w-1.5 rounded-full", running ? "animate-pulse bg-sentra-cyan" : status === "failed" ? "bg-rose-300" : "bg-emerald-300")} />
      {running ? "SSE live" : status}
    </Badge>
  );
}

function ThoughtStream({ thoughts, running }: { thoughts: ReasoningStage[]; running: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-300/15 bg-violet-300/[0.035] p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-violet-100/60">
          <Activity className="h-3.5 w-3.5" /> AI Thought Stream
        </p>
        <Badge variant="violet">Safe summaries only</Badge>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-white/38">Operational findings and final reasoning summaries; raw chain-of-thought is not exposed.</p>
      <div className="mt-4 grid max-h-56 gap-2 overflow-auto">
        {thoughts.length ? thoughts.map((thought, index) => (
          <motion.div key={`${thought.stage}-${thought.finding}-${index}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
            <div className="flex justify-between text-[10px] uppercase text-violet-100/62">
              <span>{thought.stage}</span><span>{thought.confidence}%</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/62">{thought.finding}</p>
          </motion.div>
        )) : (
          <p className="py-4 font-mono text-xs text-white/36">
            {running ? "Waiting for completed reasoning summaries..." : "No summarized reasoning available."}
          </p>
        )}
      </div>
    </div>
  );
}

export function AIActivityConsole({ logs, sources, thoughts, health, running }: ActivityConsoleProps) {
  const [paused, setPaused] = useState(false);
  const [pauseCount, setPauseCount] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [category, setCategory] = useState<ActivityCategory | "ALL">("ALL");
  const snapshot = paused ? logs.slice(0, pauseCount) : logs;
  const filtered = category === "ALL" ? snapshot : snapshot.filter((log) => log.category === category);
  const categories = useMemo(
    () => ["ALL", ...Array.from(new Set(logs.map((log) => log.category)))] as Array<ActivityCategory | "ALL">,
    [logs],
  );

  function togglePause() {
    if (!paused) setPauseCount(logs.length);
    setPaused((value) => !value);
  }

  function exportLogs() {
    const lines = logs.map((log) => `[${formatTime(log.timestamp)}] ${log.category} -> ${log.message}`).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([lines], { type: "text/plain" }));
    link.download = `sentra-activity-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const consoleBody = (
    <Card className={cn("terminal-panel relative overflow-hidden p-4 md:p-5", fullscreen && "h-full rounded-none border-0")} glow>
      <div className="terminal-scanline pointer-events-none absolute inset-0" />
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
          <div className="flex items-center gap-3">
            <span className={cn("h-2.5 w-2.5 rounded-full", running ? "animate-pulse bg-sentra-cyan shadow-[0_0_14px_rgba(83,244,255,.9)]" : "bg-emerald-300")} />
            <TerminalSquare className="h-4 w-4 text-sentra-cyan" />
            <div>
              <p className="text-sm font-semibold text-white">AI Activity Console</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/40">
                {running ? "Realtime SSE uplink active" : "Stream complete"}
              </p>
            </div>
            <StreamingStatusEngine health={health} running={running} />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={togglePause} aria-label={paused ? "Resume logs" : "Pause logs"}>
              {paused ? <CirclePlay className="h-4 w-4" /> : <CirclePause className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={exportLogs} aria-label="Export activity logs">
              <ArrowDownToLine className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setFullscreen((value) => !value)} aria-label="Toggle fullscreen terminal">
              {fullscreen ? <X className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-white/35" />
          {categories.map((filter) => (
            <button key={filter} type="button" onClick={() => setCategory(filter)} className={cn("rounded-full border px-3 py-1 font-mono text-[10px] transition", category === filter ? "border-cyan-200/25 bg-cyan-300/10 text-cyan-100" : "border-white/[0.08] text-white/42")}>
              {filter}
            </button>
          ))}
        </div>
        <div className={cn("grid gap-4", fullscreen ? "min-h-0 flex-1 xl:grid-cols-[1fr_370px]" : "xl:grid-cols-[1fr_330px]")}>
          <div className="overflow-hidden rounded-2xl border border-cyan-300/10 bg-[#030912]/80">
            <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-2 font-mono text-[10px] text-white/35">
              <span>LIVE_AGENT_LOGS</span>
              <span>{paused ? "DISPLAY PAUSED" : `${filtered.length} EVENTS`}</span>
            </div>
            <LiveAgentLogs logs={filtered} running={running && !paused} />
          </div>
          <div className="grid content-start gap-4">
            <IntelligencePipelineMonitor health={health} running={running} />
            <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-3">
              <p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-cyan-100/48">
                <RadioTower className="h-3.5 w-3.5" /> Live collection streams
              </p>
              <div className="max-h-64 overflow-auto">
                <SourceTracker sources={sources} />
              </div>
            </div>
            <ThoughtStream thoughts={thoughts} running={running} />
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <AnimatePresence>
      {fullscreen ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-sentra-ink p-3 md:p-5">
          {consoleBody}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>{consoleBody}</motion.div>
      )}
    </AnimatePresence>
  );
}
