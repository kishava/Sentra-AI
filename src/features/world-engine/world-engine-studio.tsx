"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  AudioLines,
  BrainCircuit,
  Download,
  Expand,
  Filter,
  Globe2,
  Mic,
  Mic2,
  MicOff,
  Play,
  RadioTower,
  Send,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AIActivityConsole } from "@/features/activity-console/ai-activity-console";
import { AiOrb } from "@/components/shared/ai-orb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechInput } from "@/hooks/use-speech-input";
import { cn } from "@/lib/utils";
import { streamWorldActivity } from "@/services/activity-stream-client";
import { useSettings } from "@/settings/settings-context";
import type { ActivityCategory, ActivityLevel, ActivityLog, CollectionSource, PipelineHealth } from "@/types/activity-console";
import type { WorldDomain, WorldEngineReport, WorldMapSignal } from "@/types/world-engine";
import {
  ForecastEngine,
  IntelligenceGraph,
  ScenarioEngine,
  SentimentSystem,
  SignalRadar,
} from "@/features/world-engine/visualization-panels";

const DynamicGlobe = dynamic(() => import("@/features/world-engine/world-globe"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-3xl bg-cyan-300/[0.04]" />,
});

const prompts = [
  "What is happening in the world today?",
  "What are the biggest global risks today?",
  "Which industries are growing rapidly right now?",
  "What major events happened today?",
  "Map current AI, cybersecurity, and market risks",
  "What happens if AI replaces 40% of jobs?",
];
const domains: Array<WorldDomain | "all"> = ["all", "geopolitics", "ai", "finance", "cybersecurity", "climate", "markets"];
const analystSections = [
  ["analyst-overview", "Overview"],
  ["analyst-map", "Globe"],
  ["analyst-radar", "Signal radar"],
  ["analyst-reasoning", "Reasoning"],
  ["analyst-graph", "Graph"],
  ["analyst-forecast", "Forecasts"],
  ["analyst-regional", "Regional pulse"],
  ["analyst-narrator", "Narrator"],
  ["analyst-scenario", "Scenario"],
  ["analyst-verification", "Verification"],
  ["analyst-activity", "Activity logs"],
] as const;

function getAnalystTakeaways(summary: string) {
  return summary
    .trim()
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function VerdictStrip({ report }: { report: WorldEngineReport }) {
  const takeaways = getAnalystTakeaways(report.executiveSummary);

  return (
    <Card className="overflow-hidden p-5 md:p-6" glow>
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="max-w-4xl">
          <div className="flex flex-wrap gap-2">
            <Badge variant="cyan">{report.scenarioMode ? "Simulation active" : "World intelligence active"}</Badge>
            <Badge variant={report.provider === "demo" ? "violet" : "success"}>
              {report.provider === "demo"
                ? "Illustrative demo signals"
                : report.provider === "bright-data-openai" || report.provider === "aiml-bright-data"
                  ? "Bright Data + AIML"
                  : report.provider === "aiml-live"
                    ? "AIML live search"
                    : "Live AI search"}
            </Badge>
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">{report.headline}</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-[1.4fr_.9fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-[10px] uppercase tracking-[0.19em] text-white/38">Analyst takeaways</p>
              <ul className="mt-3 grid gap-2">
                {takeaways.map((takeaway, index) => (
                  <li key={`${takeaway}-${index}`} className="flex gap-2 text-sm leading-6 text-white/64">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sentra-cyan" />
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.035] p-4">
              <p className="text-[10px] uppercase tracking-[0.19em] text-cyan-100/52">Outlook</p>
              <p className="mt-3 text-sm leading-6 text-white/62">{report.outlook}</p>
            </div>
          </div>
        </div>
        <div className="grid min-w-[300px] grid-cols-2 gap-3">
          {[
            ["Risk index", report.riskIndex, "text-rose-200"],
            ["Confidence", report.confidence, "text-cyan-100"],
          ].map(([label, value, color]) => (
            <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <p className="text-[10px] uppercase tracking-[0.19em] text-white/38">{label}</p>
              <p className={cn("mt-2 text-3xl font-semibold", String(color))}>{value}<span className="text-base">%</span></p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 border-t border-white/10 pt-5">
        <p className="text-sm leading-6 text-white/64"><strong className="text-white">Strategic action:</strong> {report.recommendation}</p>
      </div>
    </Card>
  );
}

function AnalystQuickAccess({ report }: { report: WorldEngineReport }) {
  const visibleSections = analystSections.filter(([id]) => {
    if (id === "analyst-radar") return report.visualizations.includes("radar");
    if (id === "analyst-graph") return report.visualizations.includes("network");
    if (id === "analyst-forecast") return report.visualizations.includes("forecast");
    if (id === "analyst-regional") return report.visualizations.includes("sentiment");
    if (id === "analyst-scenario") return report.scenarioMode && report.scenario.length;
    return true;
  });

  return (
    <Card className="sticky top-3 z-20 p-3" glow>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <p className="shrink-0 text-[10px] uppercase tracking-[0.22em] text-cyan-100/48">Quick access</p>
        <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0" aria-label="AI analyst sections">
          {visibleSections.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="sentra-focus shrink-0 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs text-white/58 transition"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </Card>
  );
}

function WorldMapPanel({
  signals,
  selected,
  onSelect,
  onFullscreen,
}: {
  signals: WorldMapSignal[];
  selected?: WorldMapSignal;
  onSelect: (signal: WorldMapSignal) => void;
  onFullscreen: () => void;
}) {
  return (
    <Card className="relative self-start overflow-hidden p-4 md:p-5" glow>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_45%,rgba(83,244,255,.08),transparent_46%)]" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.23em] text-white/38">Dynamic globe intelligence map</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Global activity field</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onFullscreen} disabled={!signals.length} aria-label="Launch World Pulse Mode">
          <Expand className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="relative h-[340px] overflow-hidden rounded-2xl border border-white/8 bg-black/15 md:h-[390px]">
          <DynamicGlobe signals={signals} activeSignal={selected?.id} onSelect={onSelect} />
          <div className="absolute bottom-2 left-2 right-2 rounded-2xl border border-white/10 bg-sentra-ink/72 p-3 backdrop-blur-xl">
            {selected ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant={selected.severity === "critical" ? "risk" : "cyan"}>{selected.severity}</Badge>
                  <p className="min-w-0 break-words text-sm font-medium text-white">{selected.title}</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-white/56">{selected.region}: {selected.summary}</p>
              </>
            ) : (
              <p className="text-xs leading-5 text-white/52">
                {signals.length ? "Select a pulsing location to inspect its regional intelligence signal." : "No validated regional markers were returned for this prompt."}
              </p>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/38">Regional markers</p>
          <div className="mt-3 grid max-h-[330px] gap-2 overflow-y-auto pr-1">
            {signals.length ? signals.map((signal) => (
              <button
                key={signal.id}
                type="button"
                onClick={() => onSelect(signal)}
                className={cn(
                  "sentra-focus rounded-xl border p-3 text-left transition",
                  selected?.id === signal.id ? "border-cyan-200/30 bg-cyan-300/10" : "border-white/8 bg-black/10",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 break-words text-xs font-medium text-white/76">{signal.region}</p>
                  <Badge variant={signal.severity === "critical" ? "risk" : "cyan"}>{signal.severity}</Badge>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-white/48">{signal.title}</p>
              </button>
            )) : (
              <p className="rounded-xl border border-amber-200/15 bg-amber-300/[0.04] p-3 text-xs leading-5 text-amber-100/70">
                Ask for city, country, or regional signals to populate the globe.
              </p>
            )}
          </div>
        </div>
      </div>
      <p className="relative mt-3 text-xs text-white/36">
        Geographic markers are region-level visualization anchors for the analysis, not precise event coordinates.
      </p>
    </Card>
  );
}

function ReasoningTimeline({ report }: { report: WorldEngineReport }) {
  return (
    <Card className="p-5" glow>
      <p className="text-xs uppercase tracking-[0.23em] text-white/38">AI reasoning timeline</p>
      <div className="mt-5 grid gap-3">
        {report.reasoning.map((stage, index) => (
          <motion.div
            key={`${stage.stage}-${index}`}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className="relative rounded-2xl border border-white/8 bg-white/[0.035] p-4 pl-5"
          >
            <span className="absolute bottom-4 left-0 top-4 w-px bg-gradient-to-b from-sentra-cyan to-transparent" />
            <div className="flex justify-between gap-2">
              <p className="text-sm font-medium text-white">{stage.stage}</p>
              <span className="text-xs text-sentra-cyan">{stage.confidence}%</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/52">{stage.finding}</p>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

function WorldPulseMode({
  report,
  muted,
  onClose,
  onNarrate,
}: {
  report: WorldEngineReport;
  muted: boolean;
  onClose: () => void;
  onNarrate: (briefing: "quick" | "executive" | "deep") => void;
}) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setActive((value) => (value + 1) % report.signals.length), 2700);
    return () => window.clearInterval(interval);
  }, [report.signals.length]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 overflow-hidden bg-[#03050d]" role="dialog" aria-modal="true" aria-label="World Pulse Mode">
      <div className="absolute inset-0 bg-aurora opacity-75" />
      <div className="absolute inset-0 bg-radial-grid bg-[length:60px_60px] opacity-25" />
      <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <RadioTower className="h-5 w-5 animate-pulse text-sentra-cyan" />
          <div>
            <p className="text-sm font-semibold text-white">WORLD PULSE MODE</p>
            <p className="text-[10px] uppercase tracking-[0.26em] text-cyan-100/48">Autonomous cinematic briefing</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onNarrate("quick")}><Mic2 className="h-4 w-4" /> Narrate</Button>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close World Pulse Mode"><X className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="relative grid h-[calc(100vh-74px)] gap-4 p-4 lg:grid-cols-[1fr_390px] lg:p-6">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-200/10">
          <DynamicGlobe signals={report.signals} activeSignal={report.signals[active]?.id} cinematic />
          <div className="absolute left-5 top-5">
            <Badge variant="risk">LIVE SIGNAL FEED</Badge>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold text-white md:text-5xl">{report.headline}</h2>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={report.signals[active]?.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-sentra-ink/65 p-4 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.2em] text-sentra-cyan">{report.signals[active]?.region}</p>
              <p className="mt-2 text-xl font-medium text-white">{report.signals[active]?.title}</p>
              <p className="mt-2 text-sm text-white/56">{report.signals[active]?.summary}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <aside className="grid content-start gap-3 overflow-y-auto">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.23em] text-white/42">Narrator channel</p>
            <p className="mt-3 text-sm leading-6 text-white/65">{report.briefings.quick}</p>
            <p className="mt-4 flex items-center gap-2 text-xs text-cyan-100/52">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {muted ? "Command sounds muted" : "Command sounds armed"}
            </p>
          </Card>
          {report.forecasts.slice(0, 3).map((forecast, index) => (
            <motion.div key={`${forecast.horizon}-${forecast.title}-${index}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + index * 0.15 }} className="glass-panel rounded-2xl p-4">
              <div className="flex justify-between text-xs text-cyan-100/60"><span>{forecast.horizon} FORECAST</span><span>{forecast.probability}%</span></div>
              <p className="mt-3 text-sm text-white/74">{forecast.title}</p>
            </motion.div>
          ))}
        </aside>
      </div>
    </motion.div>
  );
}

export function WorldEngineStudio() {
  const { settings } = useSettings();
  const [prompt, setPrompt] = useState(prompts[0]);
  const [report, setReport] = useState<WorldEngineReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [domain, setDomain] = useState<WorldDomain | "all">("all");
  const [selectedSignal, setSelectedSignal] = useState<WorldMapSignal>();
  const [pulseMode, setPulseMode] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [narrationUrl, setNarrationUrl] = useState<string>();
  const [narrationLabel, setNarrationLabel] = useState<string>();
  const [activeNarrationMode, setActiveNarrationMode] = useState<"quick" | "executive" | "deep" | null>(null);
  const [muted, setMuted] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [sources, setSources] = useState<CollectionSource[]>([]);
  const [health, setHealth] = useState<PipelineHealth>();
  const [thoughts, setThoughts] = useState<WorldEngineReport["reasoning"]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activityRequestRef = useRef<AbortController | null>(null);
  const narrationAbortRef = useRef<AbortController | null>(null);
  const {
    listening,
    transcribing,
    liveTranscript,
    toggleSpeechInput,
    stopSpeechInput,
  } = useSpeechInput({
    value: prompt,
    onChange: setPrompt,
    getContext: () => prompt,
  });

  const signals = useMemo(
    () => report?.signals.filter((signal) => domain === "all" || signal.domain === domain) ?? [],
    [domain, report],
  );
  const displaySignals = signals.length ? signals : report?.signals ?? [];
  const activeSignal = selectedSignal && displaySignals.some((signal) => signal.id === selectedSignal.id)
    ? selectedSignal
    : displaySignals[0];

  function stopNarration() {
    narrationAbortRef.current?.abort();
    narrationAbortRef.current = null;
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setSpeaking(false);
    setSynthesizing(false);
    setActiveNarrationMode(null);
  }

  useEffect(() => () => {
    activityRequestRef.current?.abort();
    stopNarration();
  }, []);

  useEffect(() => () => {
    if (narrationUrl) URL.revokeObjectURL(narrationUrl);
  }, [narrationUrl]);

  useEffect(() => {
    if (!narrationUrl || !audioRef.current) return;
    audioRef.current.volume = settings.voice.volume;
    audioRef.current.playbackRate = settings.voice.speed;
    void audioRef.current.play().catch(() => {
      setSpeaking(false);
      toast.message("Narration ready", { description: "Press play in the narrator player to begin audio." });
    });
  }, [narrationUrl, settings.voice.speed, settings.voice.volume]);

  useEffect(() => {
    if (!settings.voice.microphone) stopSpeechInput();
  }, [settings.voice.microphone, stopSpeechInput]);

  useEffect(() => {
    if (!settings.voice.enabled) queueMicrotask(stopNarration);
  }, [settings.voice.enabled]);

  function appendClientLog(
    category: ActivityCategory,
    message: string,
    stage: string,
    level: ActivityLevel = "info",
    source?: string,
    latencyMs?: number,
  ) {
    setLogs((current) => [...current, {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      category,
      message,
      stage,
      level,
      source,
      latencyMs,
    }].slice(-1200));
  }

  function updateSource(source: CollectionSource) {
    setSources((current) => [...current.filter((item) => item.id !== source.id), source]);
  }

  function soundPing() {
    if (muted || !settings.experience.soundEffects) return;
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(420, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(720, context.currentTime + 0.13);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
    oscillator.onended = () => void context.close();
  }

  async function runWorldEngine(nextPrompt = prompt) {
    const query = nextPrompt.trim();
    if (!query || loading) return;
    if (!settings.analyst.worldIntelligence) {
      toast.message("AI World Engine is disabled in Settings.");
      return;
    }
    stopSpeechInput();
    setPrompt(query);
    setLoading(true);
    setReport(null);
    setSelectedSignal(undefined);
    setLogs([]);
    setSources([]);
    setThoughts([]);
    setHealth(undefined);
    activityRequestRef.current?.abort();
    const controller = new AbortController();
    activityRequestRef.current = controller;
    try {
      let streamError: string | undefined;
      await streamWorldActivity(query, (event) => {
        if (event.type === "log") setLogs((current) => [...current, event.log].slice(-1200));
        if (event.type === "source") updateSource(event.source);
        if (event.type === "health") setHealth(event.health);
        if (event.type === "thought") setThoughts((current) => [...current, event.thought]);
        if (event.type === "report") {
          setReport(event.report);
          setSelectedSignal(event.report.signals[0]);
          setDomain("all");
        }
        if (event.type === "error") streamError = event.message;
      }, controller.signal, { brightData: settings.brightData });
      if (streamError) throw new Error(streamError);
      soundPing();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("World Engine could not complete the brief.", {
        description: error instanceof Error ? error.message : "Please retry.",
      });
    } finally {
      setLoading(false);
      activityRequestRef.current = null;
    }
  }

  async function narrate(mode: "quick" | "executive" | "deep") {
    if (!report) return;
    if (!settings.voice.enabled) {
      toast.message("AI voice response is disabled in Settings.");
      return;
    }
    if ((speaking || synthesizing) && activeNarrationMode === mode) {
      stopNarration();
      return;
    }

    stopNarration();
    const controller = new AbortController();
    narrationAbortRef.current = controller;
    setSynthesizing(true);
    setSpeaking(false);
    setActiveNarrationMode(mode);
    appendClientLog("VOICE", `Requesting ${mode} intelligence narration.`, "Voice synthesis", "info", "ElevenLabs");
    updateSource({ id: "elevenlabs", name: "ElevenLabs Voice", channel: "api", status: "active", detail: "Synthesis request in flight" });
    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: report.briefings[mode] }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Narrator request failed.");
      }
      if (response.headers.get("content-type")?.includes("audio")) {
        const nextUrl = URL.createObjectURL(await response.blob());
        setNarrationUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return nextUrl;
        });
        setNarrationLabel(`${mode === "quick" ? "30-second" : mode === "executive" ? "Executive" : "Deep analyst"} briefing`);
        updateSource({ id: "elevenlabs", name: "ElevenLabs Voice", channel: "api", status: "success", detail: "Audio stream received" });
        appendClientLog("VOICE", "Spoken intelligence briefing generated and ready for playback.", "Voice synthesis", "success", "ElevenLabs");
      } else {
        updateSource({ id: "elevenlabs", name: "ElevenLabs Voice", channel: "api", status: "unavailable", detail: "Demo mode: credentials not configured" });
        appendClientLog("VOICE", "Voice provider unavailable; narration script remains available.", "Voice synthesis", "warning", "ElevenLabs");
        toast.message("Narrator script ready", { description: "Configure ElevenLabs credentials for spoken playback." });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      updateSource({ id: "elevenlabs", name: "ElevenLabs Voice", channel: "api", status: "error", detail: "Synthesis request failed" });
      appendClientLog("VOICE", "Voice synthesis request failed.", "Voice synthesis", "error", "ElevenLabs");
      toast.error(error instanceof Error ? error.message : "Voice narration failed.");
    } finally {
      if (!controller.signal.aborted) {
        setSynthesizing(false);
        narrationAbortRef.current = null;
      }
    }
  }

  async function shareSnapshot() {
    if (!report) return;
    const snapshot = `${report.headline}\nRisk index: ${report.riskIndex}% | Confidence: ${report.confidence}%\n${report.executiveSummary}`;
    if (navigator.share) {
      await navigator.share({ title: "Sentra AI World Engine Snapshot", text: snapshot }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(snapshot);
      toast.success("Intelligence snapshot copied.");
    }
  }

  return (
    <>
      <section className="mb-7 grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="relative overflow-hidden p-6 md:p-8" glow>
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl" />
          <Badge variant="cyan">AI World Engine / autonomous visualization</Badge>
          <h1 className="type-display-lg relative mt-4 premium-gradient-text">
            Understand the world as a living system.
          </h1>
          <p className="relative mt-4 max-w-3xl text-sm leading-7 text-white/57 md:text-base">
            Ask a global question. Sentra resolves live evidence, maps relationships, generates visual intelligence, and narrates strategic implications.
          </p>
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void runWorldEngine();
              }
            }}
            className="relative mt-6 min-h-20"
            aria-label="Global intelligence question"
          />
          <div className="relative mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-white/40">
              {listening
                ? liveTranscript
                  ? `Listening: ${liveTranscript}`
                  : "Listening — transcript appears as you speak."
                : transcribing
                  ? "Refining transcript..."
                  : "Type a global question or use voice input."}
            </p>
            {settings.voice.microphone && (
              <Button
                type="button"
                variant={listening ? "neon" : "ghost"}
                size="sm"
                onClick={() => void toggleSpeechInput()}
                disabled={transcribing || loading}
                aria-label={listening ? "Stop voice input" : transcribing ? "Transcribing voice prompt" : "Record voice prompt"}
              >
                {listening ? <MicOff className="h-4 w-4 text-rose-200" /> : <Mic className="h-4 w-4" />}
                {listening ? "Stop voice" : transcribing ? "Transcribing" : "Voice input"}
              </Button>
            )}
          </div>
          <div className="relative mt-4 flex flex-wrap gap-2">
            {prompts.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => void runWorldEngine(suggestion)} className="sentra-focus rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs text-white/58 transition">
                {suggestion}
              </button>
            ))}
          </div>
          <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-white/38">Observed evidence and modeled forecasts are explicitly separated in each brief.</p>
            <Button variant="neon" onClick={() => void runWorldEngine()} disabled={loading || !prompt.trim() || !settings.analyst.worldIntelligence}>
              <Send className="h-4 w-4" /> Launch World Engine
            </Button>
          </div>
        </Card>
        <Card className="flex flex-col items-center justify-center p-6 text-center" glow>
          <AiOrb speaking={loading || speaking || synthesizing || listening || transcribing} size="md" />
          <h2 className="mt-5 text-xl font-semibold text-white">AI Intelligence Narrator</h2>
          <p className="mt-2 text-sm leading-6 text-white/52">Visual reasoning with optional ElevenLabs executive briefings.</p>
          <Button variant="ghost" className="mt-5" onClick={() => setMuted((value) => !value)} disabled={!settings.experience.soundEffects}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            Command sounds {muted ? "off" : "on"}
          </Button>
        </Card>
      </section>

      {settings.analyst.liveLogs && (loading || (logs.length > 0 && !report)) && (
        <section className="mb-5">
          <AIActivityConsole logs={logs} sources={sources} thoughts={thoughts} health={health} running={loading} />
        </section>
      )}

      {!settings.analyst.worldIntelligence && (
        <Card className="grid min-h-56 place-items-center p-8 text-center" glow>
          <div>
            <Globe2 className="mx-auto h-10 w-10 text-sentra-cyan" />
            <h2 className="mt-4 text-xl font-semibold text-white">World intelligence mode is disabled</h2>
            <p className="mt-2 text-sm text-white/48">Enable AI Analyst Settings to launch the AI World Engine.</p>
          </div>
        </Card>
      )}

      {settings.analyst.worldIntelligence && !loading && !report && (
        <Card className="grid min-h-56 place-items-center p-8 text-center" glow>
          <div>
            <Globe2 className="mx-auto h-10 w-10 text-sentra-cyan" />
            <h2 className="mt-4 text-xl font-semibold text-white">World Engine awaiting a directive</h2>
            <p className="mt-2 text-sm text-white/48">Select a suggested brief or submit a scenario to generate the intelligence field.</p>
          </div>
        </Card>
      )}

      {!loading && report && (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5" aria-label="AI World Engine report">
          <section id="analyst-overview" className="scroll-mt-24">
            <VerdictStrip report={report} />
          </section>
          <AnalystQuickAccess report={report} />
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-2" aria-label="Signal filters">
              <Filter className="mr-1 h-4 w-4 text-white/40" />
              {domains.map((item) => (
                <button key={item} type="button" onClick={() => setDomain(item)} className={cn("sentra-focus rounded-full border px-3 py-1.5 text-xs capitalize transition", domain === item ? "border-cyan-200/30 bg-cyan-300/10 text-cyan-50" : "border-white/10 text-white/52")}>
                  {item}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPulseMode(true)} disabled={!report.signals.length}><Expand className="h-4 w-4" /> World Pulse</Button>
              <Button variant="ghost" size="sm" onClick={() => void shareSnapshot()}><Share2 className="h-4 w-4" /> Snapshot</Button>
              <Button variant="ghost" size="sm" onClick={() => window.print()}><Download className="h-4 w-4" /> Report PDF</Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/42">
            <Sparkles className="h-4 w-4 text-sentra-cyan" />
            AI-selected visualization stack:
            {report.visualizations.map((visualization) => <Badge key={visualization} variant="violet">{visualization}</Badge>)}
          </div>
          <div className="grid items-start gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <section id="analyst-map" className="scroll-mt-24">
              <WorldMapPanel signals={displaySignals} selected={activeSignal} onSelect={(signal) => { setSelectedSignal(signal); soundPing(); }} onFullscreen={() => setPulseMode(true)} />
            </section>
            <div className="grid gap-5">
              {settings.analyst.automaticVisualizations && report.visualizations.includes("radar") && (
                <section id="analyst-radar" className="scroll-mt-24">
                  <SignalRadar report={report} />
                </section>
              )}
              {settings.analyst.reasoningSummaries && <section id="analyst-reasoning" className="scroll-mt-24">
                <ReasoningTimeline report={report} />
              </section>}
            </div>
          </div>
          <div className="grid items-start gap-5 xl:grid-cols-2">
            {settings.analyst.automaticVisualizations && report.visualizations.includes("network") && (
              <section id="analyst-graph" className="scroll-mt-24">
                <IntelligenceGraph report={report} />
              </section>
            )}
            {settings.analyst.automaticVisualizations && report.visualizations.includes("forecast") && (
              <section id="analyst-forecast" className="scroll-mt-24">
                <ForecastEngine report={report} />
              </section>
            )}
          </div>
          <div className="grid items-start gap-5 xl:grid-cols-[.7fr_1.3fr]">
            {settings.analyst.automaticVisualizations && report.visualizations.includes("sentiment") && (
              <section id="analyst-regional" className="scroll-mt-24">
                <SentimentSystem report={report} />
              </section>
            )}
            <section id="analyst-narrator" className="scroll-mt-24">
              <Card className="p-5 md:p-6" glow>
                <p className="flex items-center gap-2 text-xs uppercase tracking-[0.23em] text-white/38"><AudioLines className="h-4 w-4 text-sentra-cyan" /> Brief Me</p>
                <h3 className="mt-3 text-xl font-semibold text-white">AI Intelligence Narrator</h3>
                <p className="mt-3 text-sm leading-7 text-white/57">{report.outlook}</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    ["quick", "30-second briefing"],
                    ["executive", "2-minute executive"],
                    ["deep", "Deep analyst mode"],
                  ].map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                    disabled={!settings.voice.enabled || (synthesizing && activeNarrationMode !== mode)}
                      onClick={() => void narrate(mode as "quick" | "executive" | "deep")}
                      className={cn(
                        "sentra-focus rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-left text-sm text-white/68 transition disabled:cursor-wait disabled:opacity-50",
                        activeNarrationMode === mode && (speaking || synthesizing) && "border-cyan-200/30 bg-cyan-300/[0.08] text-cyan-50",
                      )}
                    >
                      {activeNarrationMode === mode && (speaking || synthesizing) ? (
                        <VolumeX className="mb-3 h-4 w-4 text-rose-200" />
                      ) : (
                        <Play className="mb-3 h-4 w-4 text-sentra-cyan" />
                      )}
                      {activeNarrationMode === mode && synthesizing ? "Stop preparing" : activeNarrationMode === mode && speaking ? "Stop audio" : label}
                    </button>
                  ))}
                </div>
                {narrationUrl && (
                  <div className="mt-5 rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.045] p-4">
                    <p className="mb-3 text-xs uppercase tracking-[0.2em] text-cyan-100/58">{narrationLabel} ready</p>
                    <audio
                      ref={audioRef}
                      src={narrationUrl}
                      controls
                      className="w-full accent-cyan-300"
                      onPlay={() => setSpeaking(true)}
                      onPause={() => setSpeaking(false)}
                      onEnded={() => {
                        setSpeaking(false);
                        setActiveNarrationMode(null);
                      }}
                    />
                  </div>
                )}
              </Card>
            </section>
          </div>
          {report.visualizations.includes("scenario") && (
            <section id="analyst-scenario" className="scroll-mt-24">
              <ScenarioEngine report={report} />
            </section>
          )}
          <section id="analyst-verification" className="scroll-mt-24">
            <Card className="p-5" glow>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.23em] text-white/42">
                <BrainCircuit className="h-4 w-4 text-sentra-cyan" /> Verification layer
              </div>
              {report.sources.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {report.sources.map((source, index) => (
                    <a key={`${source.url}-${index}`} className="sentra-focus rounded-full border border-white/10 px-3 py-2 text-xs text-cyan-100 transition" href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-white/50">No live sources are attached in demo mode. Configure data integrations before treating signals as current facts.</p>
              )}
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {report.limitations.map((limitation, index) => (
                  <p key={`${limitation}-${index}`} className="flex gap-2 text-xs leading-5 text-amber-100/60"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{limitation}</p>
                ))}
              </div>
            </Card>
          </section>
          {settings.analyst.liveLogs && <section id="analyst-activity" className="scroll-mt-24">
            <AIActivityConsole logs={logs} sources={sources} thoughts={thoughts} health={health} running={false} />
          </section>}
        </motion.div>
      )}

      <AnimatePresence>
        {pulseMode && report && (
          <WorldPulseMode report={report} muted={muted} onClose={() => setPulseMode(false)} onNarrate={narrate} />
        )}
      </AnimatePresence>
    </>
  );
}
