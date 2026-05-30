"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  AudioLines,
  BrainCircuit,
  ChevronDown,
  Download,
  Expand,
  Eye,
  FileText,
  Filter,
  Globe2,
  Mic,
  Mic2,
  MicOff,
  Play,
  RadioTower,
  ScrollText,
  Send,
  Sparkles,
  TerminalSquare,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AIActivityConsole } from "@/features/activity-console/ai-activity-console";
import { StudioModal } from "@/features/world-engine/studio-modal";
import { downloadWorldReport } from "@/lib/world-engine/export-report";
import { AiOrb } from "@/components/shared/ai-orb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechInput } from "@/hooks/use-speech-input";
import { cn } from "@/lib/utils";
import { speakWithBrowser } from "@/lib/voice/browser-tts";
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

function SuggestedPromptsMenu({
  prompts: items,
  onSelect,
  disabled,
}: {
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Sparkles className="h-4 w-4 text-sentra-cyan" />
        Suggested questions
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute left-0 top-[calc(100%+8px)] z-30 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-white/10 bg-sentra-ink/95 shadow-2xl backdrop-blur-xl"
            role="listbox"
            aria-label="Suggested intelligence questions"
          >
            <div className="border-b border-white/8 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/38">Quick prompts</p>
              <p className="mt-1 text-xs text-white/48">Pick one to run the World Engine.</p>
            </div>
            <ul className="max-h-64 overflow-y-auto py-1">
              {items.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    role="option"
                    className="sentra-focus w-full px-4 py-3 text-left text-sm leading-6 text-white/72 transition hover:bg-cyan-300/10 hover:text-cyan-50"
                    onClick={() => {
                      setOpen(false);
                      onSelect(suggestion);
                    }}
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
const domains: Array<WorldDomain | "all"> = ["all", "geopolitics", "ai", "finance", "cybersecurity", "climate", "markets"];
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
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [insightModalOpen, setInsightModalOpen] = useState(false);
  const [viewPanel, setViewPanel] = useState<
    null | "insight" | "globe" | "signals" | "analytics" | "sources" | "narrator"
  >(null);
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
    language: settings.voice.language,
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
    appendClientLog("VOICE", `Requesting ${mode} intelligence narration.`, "Voice synthesis", "info", "Speechmatics TTS");
    updateSource({ id: "speechmatics-voice", name: "Speechmatics Voice", channel: "api", status: "active", detail: "Synthesis request in flight" });
    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: report.briefings[mode],
          voiceMode: settings.voice.mode,
          language: settings.voice.language,
        }),
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
        updateSource({ id: "speechmatics-voice", name: "Speechmatics Voice", channel: "api", status: "success", detail: "Audio stream received" });
        appendClientLog("VOICE", "Spoken intelligence briefing generated and ready for playback.", "Voice synthesis", "success", "Speechmatics TTS");
      } else {
        setSynthesizing(false);
        setSpeaking(true);
        await speakWithBrowser(
          report.briefings[mode],
          {
            language: settings.voice.language,
            volume: settings.voice.volume,
            speed: settings.voice.speed,
          },
          controller.signal,
        );
        stopNarration();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      updateSource({ id: "speechmatics-voice", name: "Speechmatics Voice", channel: "api", status: "error", detail: "Synthesis request failed" });
      appendClientLog("VOICE", "Voice synthesis request failed.", "Voice synthesis", "error", "Speechmatics TTS");
      toast.error(error instanceof Error ? error.message : "Voice narration failed.");
    } finally {
      if (!controller.signal.aborted) {
        setSynthesizing(false);
        narrationAbortRef.current = null;
      }
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
                disabled={!listening && (transcribing || loading)}
                aria-label={listening ? "Stop voice input" : transcribing ? "Transcribing voice prompt" : "Record voice prompt"}
              >
                {listening ? <MicOff className="h-4 w-4 text-rose-200" /> : <Mic className="h-4 w-4" />}
                {listening ? "Stop voice" : transcribing ? "Transcribing" : "Voice input"}
              </Button>
            )}
          </div>
          <div className="relative mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <SuggestedPromptsMenu
                prompts={prompts}
                disabled={loading || !settings.analyst.worldIntelligence}
                onSelect={(suggestion) => void runWorldEngine(suggestion)}
              />
              {(loading || logs.length > 0) && settings.analyst.liveLogs && (
                <Button variant="ghost" size="sm" onClick={() => setLogModalOpen(true)}>
                  <TerminalSquare className="h-4 w-4" />
                  {loading ? "Live log" : "Activity log"}
                </Button>
              )}
              {report && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setInsightModalOpen(true)}>
                    <Eye className="h-4 w-4" /> View insight
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => downloadWorldReport(report, "markdown")}>
                    <Download className="h-4 w-4" /> Download
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="neon"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => void runWorldEngine()}
              disabled={loading || !prompt.trim() || !settings.analyst.worldIntelligence}
            >
              <Send className="h-4 w-4" /> {loading ? "Running…" : "Launch World Engine"}
            </Button>
          </div>
        </Card>
        <Card className="flex flex-col items-center justify-center p-6 text-center" glow>
          <AiOrb speaking={loading || speaking || synthesizing || listening || transcribing} size="md" />
          <h2 className="mt-5 text-xl font-semibold text-white">AI Intelligence Narrator</h2>
          <p className="mt-2 text-sm leading-6 text-white/52">Visual reasoning with optional Speechmatics executive briefings.</p>
          <Button variant="ghost" className="mt-5" onClick={() => setMuted((value) => !value)} disabled={!settings.experience.soundEffects}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            Command sounds {muted ? "off" : "on"}
          </Button>
        </Card>
      </section>

      {loading && settings.analyst.liveLogs && (
        <Card className="mb-5 flex flex-wrap items-center justify-between gap-4 p-4 md:p-5" glow>
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sentra-cyan shadow-[0_0_12px_rgba(83,244,255,.85)]" />
            <div>
              <p className="text-sm font-medium text-white">World Engine is synthesizing intelligence</p>
              <p className="mt-1 font-mono text-[11px] text-white/42">
                STAGE: {health?.stage ?? "Collecting evidence"} · {health ? `${(health.elapsedMs / 1000).toFixed(1)}s` : "—"}
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => setLogModalOpen(true)}>
            <TerminalSquare className="h-4 w-4" /> Open activity log
          </Button>
        </Card>
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
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} aria-label="AI World Engine report">
          <Card className="p-6 md:p-8" glow>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">Intelligence ready</Badge>
              <Badge variant={report.provider === "demo" ? "violet" : "cyan"}>
                {report.provider === "demo" ? "Demo model" : "Live synthesis"}
              </Badge>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">{report.headline}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/58">{report.executiveSummary}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Risk", `${report.riskIndex}%`, "text-rose-200"],
                ["Confidence", `${report.confidence}%`, "text-cyan-100"],
                ["Signals", String(report.signals.length), "text-white"],
                ["Sources", String(report.sources.length), "text-white"],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">{label}</p>
                  <p className={cn("mt-1 text-xl font-semibold", String(color))}>{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-white/40">
              Everything is generated — open a view below. The main page stays clean.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Button variant="neon" className="justify-start" onClick={() => setInsightModalOpen(true)}>
                <Eye className="h-4 w-4" /> View full insight
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => setViewPanel("globe")}>
                <Globe2 className="h-4 w-4" /> Globe map ({report.signals.length})
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => setViewPanel("signals")}>
                <Sparkles className="h-4 w-4" /> Radar & reasoning
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => setViewPanel("analytics")}>
                <BrainCircuit className="h-4 w-4" /> Forecasts & graph
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => setViewPanel("sources")}>
                <AlertTriangle className="h-4 w-4" /> Sources ({report.sources.length})
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => setViewPanel("narrator")}>
                <AudioLines className="h-4 w-4" /> Brief me (voice)
              </Button>
              {settings.analyst.liveLogs && (
                <Button variant="ghost" className="justify-start" onClick={() => setLogModalOpen(true)}>
                  <TerminalSquare className="h-4 w-4" /> Activity log
                </Button>
              )}
              <Button variant="ghost" className="justify-start" onClick={() => downloadWorldReport(report, "markdown")}>
                <FileText className="h-4 w-4" /> Download brief
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => setPulseMode(true)} disabled={!report.signals.length}>
                <Expand className="h-4 w-4" /> World Pulse mode
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      <StudioModal
        open={logModalOpen && settings.analyst.liveLogs}
        title="Activity log"
        description="Live pipeline events, source collection, and model synthesis steps."
        onClose={() => setLogModalOpen(false)}
        className="max-w-6xl"
      >
        <AIActivityConsole logs={logs} sources={sources} thoughts={thoughts} health={health} running={loading} />
      </StudioModal>

      <StudioModal
        open={viewPanel === "globe" && Boolean(report)}
        title="Global activity map"
        description="Regional signals on the intelligence globe."
        onClose={() => setViewPanel(null)}
        className="max-w-6xl"
      >
        {report ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-white/40" />
              {domains.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDomain(item)}
                  className={cn(
                    "sentra-focus rounded-full border px-3 py-1.5 text-xs capitalize transition",
                    domain === item ? "border-cyan-200/30 bg-cyan-300/10 text-cyan-50" : "border-white/10 text-white/52",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
            <WorldMapPanel
              signals={displaySignals}
              selected={activeSignal}
              onSelect={(signal) => {
                setSelectedSignal(signal);
                soundPing();
              }}
              onFullscreen={() => {
                setViewPanel(null);
                setPulseMode(true);
              }}
            />
          </>
        ) : null}
      </StudioModal>

      <StudioModal
        open={viewPanel === "signals" && Boolean(report)}
        title="Signals & reasoning"
        description="Pulse radar and AI reasoning timeline."
        onClose={() => setViewPanel(null)}
        className="max-w-6xl"
      >
        {report ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <SignalRadar report={report} />
            <ReasoningTimeline report={report} />
          </div>
        ) : null}
      </StudioModal>

      <StudioModal
        open={viewPanel === "analytics" && Boolean(report)}
        title="Forecasts & intelligence graph"
        description="Relationship map, forecasts, sentiment, and scenario modeling."
        onClose={() => setViewPanel(null)}
        className="max-w-6xl"
      >
        {report ? (
          <div className="grid gap-5">
            {report.visualizations.includes("network") && <IntelligenceGraph report={report} />}
            {report.visualizations.includes("forecast") && <ForecastEngine report={report} />}
            {report.visualizations.includes("sentiment") && <SentimentSystem report={report} />}
            {report.scenarioMode && report.scenario.length > 0 && <ScenarioEngine report={report} />}
          </div>
        ) : null}
      </StudioModal>

      <StudioModal
        open={viewPanel === "sources" && Boolean(report)}
        title="Verification & sources"
        description="Corroborating links and model limitations."
        onClose={() => setViewPanel(null)}
      >
        {report ? (
          <Card className="p-5" glow>
            {report.sources.length ? (
              <div className="flex flex-wrap gap-2">
                {report.sources.map((source, index) => (
                  <a
                    key={`${source.url}-${index}`}
                    className="sentra-focus rounded-full border border-white/10 px-3 py-2 text-xs text-cyan-100 transition"
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.title}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/50">No verified source URLs were attached to this run.</p>
            )}
            <div className="mt-4 grid gap-2">
              {report.limitations.map((limitation, index) => (
                <p key={`${limitation}-${index}`} className="flex gap-2 text-xs leading-5 text-amber-100/60">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {limitation}
                </p>
              ))}
            </div>
          </Card>
        ) : null}
      </StudioModal>

      <StudioModal
        open={viewPanel === "narrator" && Boolean(report)}
        title="Brief me"
        description="Listen to executive intelligence briefings."
        onClose={() => setViewPanel(null)}
      >
        {report ? (
          <Card className="p-5 md:p-6" glow>
            <p className="text-sm leading-7 text-white/57">{report.outlook}</p>
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
                  {activeNarrationMode === mode && synthesizing
                    ? "Stop preparing"
                    : activeNarrationMode === mode && speaking
                      ? "Stop audio"
                      : label}
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
        ) : null}
      </StudioModal>

      <StudioModal
        open={insightModalOpen && Boolean(report)}
        title="World intelligence insight"
        description={report?.headline}
        onClose={() => setInsightModalOpen(false)}
      >
        {report ? (
          <div className="grid gap-5">
            <VerdictStrip report={report} />
            <Card className="p-5" glow>
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.23em] text-white/38">
                <ScrollText className="h-4 w-4 text-sentra-cyan" /> Executive briefing
              </p>
              <p className="mt-4 text-sm leading-7 text-white/68">{report.executiveSummary}</p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-[10px] uppercase tracking-[0.19em] text-white/38">Quick briefing</p>
                  <p className="mt-2 text-sm leading-6 text-white/62">{report.briefings.quick}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-[10px] uppercase tracking-[0.19em] text-white/38">Deep briefing</p>
                  <p className="mt-2 text-sm leading-6 text-white/62">{report.briefings.deep}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => downloadWorldReport(report, "markdown")}>
                  <FileText className="h-4 w-4" /> Download markdown
                </Button>
                <Button variant="ghost" size="sm" onClick={() => downloadWorldReport(report, "json")}>
                  <Download className="h-4 w-4" /> Download JSON
                </Button>
              </div>
            </Card>
          </div>
        ) : null}
      </StudioModal>

      <AnimatePresence>
        {pulseMode && report && (
          <WorldPulseMode report={report} muted={muted} onClose={() => setPulseMode(false)} onNarrate={narrate} />
        )}
      </AnimatePresence>
    </>
  );
}
