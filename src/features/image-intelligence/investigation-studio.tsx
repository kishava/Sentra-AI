"use client";

import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import Image from "next/image";
import {
  ArrowRight,
  Clock3,
  Download,
  Expand,
  Eye,
  FileText,
  History,
  ImagePlus,
  Layers2,
  Mic,
  MicOff,
  RotateCcw,
  ScanSearch,
  Send,
  Sparkles,
  TerminalSquare,
  UploadCloud,
  Volume2,
  VolumeX,
  Waypoints,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSpeechInput } from "@/hooks/use-speech-input";
import { AiOrb } from "@/components/shared/ai-orb";
import { SuggestedPromptsMenu } from "@/components/shared/suggested-prompts-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LiveAgentLogs } from "@/features/activity-console/ai-activity-console";
import { investigationPrompts, investigationTimeline } from "@/features/image-intelligence/constants";
import { InvestigationResults } from "@/features/image-intelligence/investigation-results";
import { StudioModal } from "@/features/world-engine/studio-modal";
import { usePipelineLogs } from "@/hooks/use-pipeline-logs";
import { downloadInvestigationReport } from "@/lib/image-intelligence/export-report";
import { visionPipelineScript } from "@/lib/pipeline-log-scripts";
import { speakWithBrowser } from "@/lib/voice/browser-tts";
import { cn } from "@/lib/utils";
import { useSettings } from "@/settings/settings-context";
import type { ImageInvestigationReport } from "@/types/image-intelligence";

type EvidenceImage = { file: File; url: string };
type VisionPanel = "evidence" | "verdict" | "timeline" | "history" | null;

const historyKey = "sentra-image-investigations";
const accept = ["image/png", "image/jpeg", "image/webp"];

function EvidencePreview({
  evidence,
  title,
  scanning,
  onInspect,
  onRemove,
  compact,
}: {
  evidence: EvidenceImage;
  title: string;
  scanning: boolean;
  onInspect: () => void;
  onRemove: () => void;
  compact?: boolean;
}) {
  const scannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scanning || !scannerRef.current) return;
    const tween = gsap.fromTo(scannerRef.current, { yPercent: -100 }, { yPercent: 1150, duration: 1.7, repeat: -1, ease: "none" });
    return () => {
      tween.kill();
    };
  }, [scanning]);

  return (
    <motion.figure
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-2xl border border-cyan-200/15 bg-black/35"
    >
      <div className={cn("relative w-full", compact ? "h-36" : "h-72")}>
        <Image src={evidence.url} alt={`${title} investigation preview`} fill unoptimized className="object-contain" />
      </div>
      {scanning && (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(83,244,255,.05),transparent)]" />
          <div ref={scannerRef} className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-transparent via-cyan-300/45 to-transparent blur-sm" />
        </>
      )}
      <figcaption className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-2xl border border-white/10 bg-sentra-ink/70 p-2.5 backdrop-blur-xl">
        <div className="min-w-0 pl-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/55">{title}</p>
          <p className="truncate text-xs text-white/65">{evidence.file.name}</p>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={onInspect} className="sentra-focus rounded-xl p-2 text-white/55 transition" aria-label={`Inspect ${title}`}>
            <Expand className="h-4 w-4" />
          </button>
          <button type="button" onClick={onRemove} className="sentra-focus rounded-xl p-2 text-white/55 transition" aria-label={`Remove ${title}`}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </figcaption>
    </motion.figure>
  );
}

function ScanTimeline({ activeStep, loading }: { activeStep: number; loading: boolean }) {
  return (
    <div aria-label="Investigation timeline" className="grid gap-2">
      {investigationTimeline.map((step, index) => {
        const complete = index < activeStep || (!loading && activeStep === investigationTimeline.length);
        const active = loading && index === activeStep;
        return (
          <motion.div
            key={step.label}
            animate={{ opacity: index <= activeStep ? 1 : 0.38 }}
            className={cn("flex items-center gap-3 rounded-2xl border px-3 py-3 transition", active ? "border-cyan-200/25 bg-cyan-300/[0.08]" : "border-transparent")}
          >
            <span className={cn("grid h-9 w-9 place-items-center rounded-xl bg-white/[0.05] text-white/42", (complete || active) && "bg-cyan-300/10 text-sentra-cyan")}>
              <step.icon className={cn("h-4 w-4", active && "animate-pulse")} />
            </span>
            <div>
              <p className="text-sm text-white">{step.label}</p>
              <p className="text-[11px] text-white/42">{step.detail}</p>
            </div>
            {complete && <span className="ml-auto h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.8)]" />}
            {active && <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-sentra-cyan" />}
          </motion.div>
        );
      })}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="grid gap-5" aria-label="Analysis loading">
      {[160, 300].map((height) => (
        <div key={height} style={{ height }} className="glass-panel animate-pulse rounded-3xl bg-gradient-to-r from-white/[0.045] via-white/[0.09] to-white/[0.045] bg-[length:220%_100%]" />
      ))}
    </div>
  );
}

export function InvestigationStudio() {
  const { settings } = useSettings();
  const [primary, setPrimary] = useState<EvidenceImage | null>(null);
  const [comparison, setComparison] = useState<EvidenceImage | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [report, setReport] = useState<ImageInvestigationReport | null>(null);
  const [history, setHistory] = useState<ImageInvestigationReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "loading" | "playing">("idle");
  const [activeStep, setActiveStep] = useState(-1);
  const [inspecting, setInspecting] = useState<EvidenceImage | null>(null);
  const [zoom, setZoom] = useState(1);
  const [viewPanel, setViewPanel] = useState<VisionPanel>(null);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [insightModalOpen, setInsightModalOpen] = useState(false);
  const primaryInput = useRef<HTMLInputElement>(null);
  const comparisonInput = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const voiceAbortRef = useRef<AbortController | null>(null);
  const voiceRunIdRef = useRef(0);
  const speakingTimeoutRef = useRef<number | null>(null);
  const pipeline = usePipelineLogs(visionPipelineScript);
  const speaking = voiceStatus !== "idle";
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

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(historyKey);
      if (saved) {
        const persisted = JSON.parse(saved) as ImageInvestigationReport[];
        queueMicrotask(() => setHistory(persisted));
      }
    } catch {
      window.localStorage.removeItem(historyKey);
    }
  }, []);

  useEffect(() => () => {
    if (primary) URL.revokeObjectURL(primary.url);
    if (comparison) URL.revokeObjectURL(comparison.url);
  }, [primary, comparison]);

  useEffect(() => () => {
    resetVoicePlayback();
    stopSpeechInput();
  }, [stopSpeechInput]);

  useEffect(() => {
    if (!settings.voice.microphone) stopSpeechInput();
  }, [settings.voice.microphone, stopSpeechInput]);

  useEffect(() => {
    if (!settings.voice.enabled) resetVoicePlayback();
  }, [settings.voice.enabled]);

  function evidenceFor(file: File) {
    if (!accept.includes(file.type)) {
      toast.error("Unsupported evidence file.", { description: "Use PNG, JPEG, or WEBP." });
      return null;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Evidence file is too large.", { description: "Keep each file under 20 MB." });
      return null;
    }
    return { file, url: URL.createObjectURL(file) };
  }

  function stageFile(file: File, target: "primary" | "comparison") {
    const next = evidenceFor(file);
    if (!next) return;
    if (target === "primary") {
      setPrimary(next);
      setPrompt("");
      setReport(null);
      setActiveStep(0);
      toast.success("Evidence staged", { description: "Choose an investigation question to begin." });
    } else {
      setComparison(next);
      toast.success("Comparison evidence staged");
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
    if (files[0]) stageFile(files[0], "primary");
    if (files[1]) {
      setComparisonMode(true);
      stageFile(files[1], "comparison");
    }
  }

  async function investigate() {
    if (!primary || !prompt.trim() || loading) return;
    if (!settings.forensics.authenticityDetection) {
      toast.message("Image authenticity detection is disabled in Settings.");
      return;
    }
    stopSpeechInput();
    setLoading(true);
    setReport(null);
    setActiveStep(1);
    pipeline.start();
    const timer = window.setInterval(() => {
      setActiveStep((current) => Math.min(current + 1, investigationTimeline.length - 2));
    }, 700);

    try {
      const body = new FormData();
      body.append("prompt", prompt.trim());
      body.append("image", primary.file);
      if (comparisonMode && comparison) body.append("comparison", comparison.file);
      const response = await fetch("/api/image-analysis", { method: "POST", body });
      const data = (await response.json()) as { report?: ImageInvestigationReport; error?: string };
      if (!response.ok || !data.report) throw new Error(data.error || "No investigation report returned.");
      setReport(data.report);
      resetVoicePlayback();
      setActiveStep(investigationTimeline.length);
      setHistory((current) => {
        const next = [data.report!, ...current.filter((entry) => entry.id !== data.report!.id)].slice(0, 8);
        window.localStorage.setItem(historyKey, JSON.stringify(next));
        return next;
      });
      if (settings.privacy.clearUploadsAfterAnalysis) {
        if (primary) URL.revokeObjectURL(primary.url);
        if (comparison) URL.revokeObjectURL(comparison.url);
        setPrimary(null);
        setComparison(null);
        if (primaryInput.current) primaryInput.current.value = "";
        if (comparisonInput.current) comparisonInput.current.value = "";
      }
    } catch (error) {
      setActiveStep(0);
      toast.error("Investigation could not be completed.", {
        description: error instanceof Error ? error.message : "Please retry.",
      });
    } finally {
      pipeline.complete();
      window.clearInterval(timer);
      setLoading(false);
    }
  }

  async function shareReport() {
    if (!report) return;
    const text = `Sentra Visual Intelligence Verdict: ${report.status} (${report.scores.confidence}% confidence)\n${report.summary}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Sentra Investigation Report", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Report summary copied for sharing.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Sharing is unavailable in this browser.");
    }
  }

  function exportPdf() {
    toast.message("Print dialog opened", { description: "Choose Save as PDF to export the investigation report." });
    window.print();
  }

  function resetInvestigation() {
    resetVoicePlayback();
    stopSpeechInput();
    setPrimary(null);
    setComparison(null);
    setComparisonMode(false);
    setPrompt("");
    setReport(null);
    setActiveStep(-1);
    setViewPanel(null);
    if (primaryInput.current) primaryInput.current.value = "";
    if (comparisonInput.current) comparisonInput.current.value = "";
  }

  function resetVoicePlayback() {
    voiceRunIdRef.current += 1;
    voiceAbortRef.current?.abort();
    voiceAbortRef.current = null;
    if (speakingTimeoutRef.current) {
      window.clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setVoiceStatus("idle");
  }

  function reportNarrationText(nextReport: ImageInvestigationReport) {
    return [
      `AI Analyst verdict: ${nextReport.status}.`,
      `Confidence is ${nextReport.scores.confidence} percent.`,
      `Threat level is ${nextReport.threatLevel}.`,
      nextReport.summary,
      `Recommended action: ${nextReport.recommendedAction}`,
    ].join(" ");
  }

  async function playReportVoice() {
    if (!report) return;
    if (!settings.voice.enabled) {
      toast.message("AI voice response is disabled in Settings.");
      return;
    }

    if (speaking) {
      resetVoicePlayback();
      return;
    }

    resetVoicePlayback();
    const runId = voiceRunIdRef.current + 1;
    const abortController = new AbortController();
    voiceRunIdRef.current = runId;
    voiceAbortRef.current = abortController;
    setVoiceStatus("loading");

    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: reportNarrationText(report),
          voiceMode: settings.voice.mode,
          language: settings.voice.language,
        }),
        signal: abortController.signal,
      });
      if (abortController.signal.aborted || voiceRunIdRef.current !== runId) return;

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Voice provider rejected the request.");
      }

      if (response.headers.get("content-type")?.includes("audio")) {
        const blob = await response.blob();
        if (abortController.signal.aborted || voiceRunIdRef.current !== runId) return;

        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.volume = settings.voice.volume;
        audio.playbackRate = settings.voice.speed;
        audioRef.current = audio;
        audioUrlRef.current = audioUrl;
        audio.onended = resetVoicePlayback;
        audio.onerror = resetVoicePlayback;
        audio.onpause = () => {
          if (audio.ended) resetVoicePlayback();
        };
        setVoiceStatus("playing");
        await audio.play();
      } else {
        setVoiceStatus("playing");
        await speakWithBrowser(
          reportNarrationText(report),
          {
            language: settings.voice.language,
            volume: settings.voice.volume,
            speed: settings.voice.speed,
          },
          abortController.signal,
        );
        resetVoicePlayback();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      resetVoicePlayback();
      toast.error("Voice playback failed.", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  const verdictVariant =
    report?.status === "Real" ? "success" : report?.status === "AI Generated" ? "risk" : "violet";

  return (
    <>
      <section className="mb-7 grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="relative overflow-visible p-6 md:p-8" glow>
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/[0.08] blur-3xl" />
          <Badge variant="cyan">Visual Forensics / multimodal analyst</Badge>
          <h1 className="type-display-lg relative mt-4 premium-gradient-text">
            Investigate visual evidence with AI forensics.
          </h1>
          <p className="relative mt-4 max-w-3xl text-sm leading-7 text-white/57 md:text-base">
            Stage images, direct the investigation, and receive a defensible authenticity assessment with scores, scene analysis, and comparison review.
          </p>

          {!primary ? (
            <motion.button
              type="button"
              onClick={() => primaryInput.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "sentra-focus relative mt-6 flex min-h-48 w-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.025] px-6 text-center transition",
                dragging && "border-cyan-200/55 bg-cyan-300/[0.06]",
              )}
            >
              <UploadCloud className="h-10 w-10 text-sentra-cyan" />
              <p className="mt-4 text-lg font-semibold text-white">Drop evidence to open a case</p>
              <p className="mt-2 max-w-md text-sm text-white/48">PNG, JPEG, or WEBP up to 20 MB. Add a comparison image after staging.</p>
            </motion.button>
          ) : (
            <div className="relative mt-6 grid gap-5">
              <div className={cn("grid gap-4", comparisonMode && "md:grid-cols-2")}>
                <EvidencePreview
                  evidence={primary}
                  title="Primary evidence"
                  scanning={loading}
                  compact
                  onInspect={() => setInspecting(primary)}
                  onRemove={() => setPrimary(null)}
                />
                {comparisonMode &&
                  (comparison ? (
                    <EvidencePreview
                      evidence={comparison}
                      title="Comparison evidence"
                      scanning={loading}
                      compact
                      onInspect={() => setInspecting(comparison)}
                      onRemove={() => setComparison(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => comparisonInput.current?.click()}
                      className="sentra-focus flex h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-white/14 bg-white/[0.03] text-white/50 transition"
                    >
                      <ImagePlus className="h-6 w-6 text-sentra-cyan" />
                      <span className="mt-2 text-sm">Add comparison evidence</span>
                    </button>
                  ))}
              </div>
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe the evidence question, suspected alteration, location hypothesis, or threat concern..."
                className="min-h-20"
                aria-label="Investigation question"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-white/40">
                  {listening
                    ? liveTranscript
                      ? `Listening: ${liveTranscript}`
                      : "Listening — transcript appears as you speak."
                    : transcribing
                      ? "Refining transcript..."
                      : "Speak the investigation question or type it manually."}
                </p>
                {settings.voice.microphone && (
                  <Button
                    variant={listening ? "neon" : "ghost"}
                    size="sm"
                    onClick={() => void toggleSpeechInput()}
                    disabled={!listening && (transcribing || loading)}
                  >
                    {listening ? <MicOff className="h-4 w-4 text-rose-200" /> : <Mic className="h-4 w-4" />}
                    {listening ? "Stop voice" : transcribing ? "Transcribing" : "Voice input"}
                  </Button>
                )}
              </div>
              <div className="relative z-20 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SuggestedPromptsMenu
                    prompts={investigationPrompts}
                    disabled={loading || !settings.forensics.authenticityDetection}
                    menuId="vision-suggested-menu"
                    menuSubtitle="Pick one to prefill your investigation question."
                    onSelect={setPrompt}
                  />
                  <Button variant="ghost" size="sm" onClick={() => setComparisonMode((current) => !current)}>
                    <Layers2 className="h-4 w-4" /> {comparisonMode ? "Hide compare" : "Compare images"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={resetInvestigation}>
                    <RotateCcw className="h-4 w-4" /> New case
                  </Button>
                  {(loading || pipeline.logs.length > 0) && settings.analyst.liveLogs && (
                    <Button variant="ghost" size="sm" onClick={() => setLogModalOpen(true)}>
                      <TerminalSquare className="h-4 w-4" />
                      {loading ? "Live log" : "Activity log"}
                    </Button>
                  )}
                  {report && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setInsightModalOpen(true)}>
                        <Eye className="h-4 w-4" /> View verdict
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => downloadInvestigationReport(report, "markdown")}>
                        <Download className="h-4 w-4" /> Download
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="neon"
                  className="w-full sm:w-fit sm:self-end"
                  disabled={!prompt.trim() || loading || !settings.forensics.authenticityDetection}
                  onClick={investigate}
                >
                  {loading ? <ScanSearch className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
                  {loading ? "Investigating…" : "Run investigation"}
                </Button>
              </div>
            </div>
          )}

          <input
            ref={primaryInput}
            className="hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => event.target.files?.[0] && stageFile(event.target.files[0], "primary")}
          />
          <input
            ref={comparisonInput}
            className="hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => event.target.files?.[0] && stageFile(event.target.files[0], "comparison")}
          />
        </Card>

        <Card className="flex flex-col items-center justify-center p-6 text-center" glow>
          <AiOrb speaking={loading || speaking || listening || transcribing} size="md" />
          <p className="mt-5 text-lg font-semibold text-white">
            {loading ? "Processing evidence" : primary ? "Case staged" : "Awaiting evidence"}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-100/45">
            {listening ? "Voice input active" : speaking ? "Voice output active" : loading ? "Neural inspection active" : "Vision analyst standing by"}
          </p>
          {report && (
            <Button variant="ghost" size="sm" className="mt-5" onClick={() => void playReportVoice()} disabled={!settings.voice.enabled}>
              {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {voiceStatus === "loading" ? "Preparing voice" : speaking ? "Stop voice" : "Read report"}
            </Button>
          )}
        </Card>
      </section>

      {loading && settings.analyst.liveLogs && (
        <Card className="mb-5 flex flex-wrap items-center justify-between gap-4 p-4 md:p-5" glow>
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sentra-cyan shadow-[0_0_12px_rgba(83,244,255,.85)]" />
            <div>
              <p className="text-sm font-medium text-white">Visual forensics analysis in progress</p>
              <p className="mt-1 font-mono text-[11px] text-white/42">
                STAGE: {investigationTimeline[Math.max(0, activeStep)]?.label ?? "Scanning"}
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => setLogModalOpen(true)}>
            <TerminalSquare className="h-4 w-4" /> Open activity log
          </Button>
        </Card>
      )}

      {loading && <ReportSkeleton />}

      {!settings.forensics.authenticityDetection && (
        <Card className="mb-5 grid min-h-40 place-items-center p-8 text-center" glow>
          <p className="text-sm text-white/48">Image authenticity detection is disabled in Settings.</p>
        </Card>
      )}

      {!loading && !report && primary && settings.forensics.authenticityDetection && (
        <Card className="grid min-h-40 place-items-center p-8 text-center" glow>
          <ScanSearch className="h-10 w-10 text-sentra-cyan" />
          <h2 className="mt-4 text-xl font-semibold text-white">Evidence staged — awaiting directive</h2>
          <p className="mt-2 text-sm text-white/48">Choose a suggested investigation or describe what to analyze, then run the investigation.</p>
        </Card>
      )}

      {!loading && report && (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} aria-label="Visual forensics report">
          <Card className="p-6 md:p-8" glow>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={verdictVariant}>{report.status}</Badge>
              {report.source === "demo" && <Badge variant="violet">Demo mode</Badge>}
              <Badge variant="cyan">{report.threatLevel} threat</Badge>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
              {report.status}
              <span className="ml-3 text-lg font-normal text-white/44">{report.scores.confidence}% confidence</span>
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/58">{report.summary}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Authenticity", `${report.scores.authenticity}%`, "text-emerald-200"],
                ["AI signal", `${report.scores.aiGeneratedProbability}%`, "text-violet-200"],
                ["Manipulation", `${report.scores.manipulationProbability}%`, "text-amber-200"],
                ["Deepfake", `${report.scores.deepfakeProbability}%`, "text-rose-200"],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">{label}</p>
                  <p className={cn("mt-1 text-xl font-semibold", String(color))}>{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-white/40">Full forensic detail is in the views below — the main page stays clean.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Button variant="neon" className="justify-start" onClick={() => setInsightModalOpen(true)}>
                <Eye className="h-4 w-4" /> View full verdict
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => setViewPanel("verdict")}>
                <Sparkles className="h-4 w-4" /> Scores & findings
              </Button>
              {(primary || comparison) && (
                <Button variant="ghost" className="justify-start" onClick={() => setViewPanel("evidence")}>
                  <Expand className="h-4 w-4" /> Evidence images
                </Button>
              )}
              <Button variant="ghost" className="justify-start" onClick={() => setViewPanel("timeline")}>
                <Waypoints className="h-4 w-4" /> Investigation timeline
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => void playReportVoice()} disabled={!settings.voice.enabled}>
                <Volume2 className="h-4 w-4" /> Read aloud
              </Button>
              {settings.analyst.liveLogs && (
                <Button variant="ghost" className="justify-start" onClick={() => setLogModalOpen(true)}>
                  <TerminalSquare className="h-4 w-4" /> Activity log
                </Button>
              )}
              <Button variant="ghost" className="justify-start" onClick={() => downloadInvestigationReport(report, "markdown")}>
                <FileText className="h-4 w-4" /> Download brief
              </Button>
              <Button variant="ghost" className="justify-start" onClick={exportPdf}>
                <Download className="h-4 w-4" /> Export PDF
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => void shareReport()}>
                <ArrowRight className="h-4 w-4" /> Share summary
              </Button>
              {history.length > 0 && (
                <Button variant="ghost" className="justify-start" onClick={() => setViewPanel("history")}>
                  <History className="h-4 w-4" /> Case history
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      <StudioModal
        open={logModalOpen && settings.analyst.liveLogs}
        title="Forensics activity log"
        description="Live evidence-processing activity stream."
        onClose={() => setLogModalOpen(false)}
        className="max-w-6xl"
      >
        <LiveAgentLogs
          logs={pipeline.logs}
          running={pipeline.running}
          className="h-[clamp(420px,55vh,640px)] rounded-2xl border border-cyan-300/[0.08] bg-black/10"
        />
      </StudioModal>

      <StudioModal
        open={insightModalOpen && Boolean(report)}
        title="Visual forensics verdict"
        description={report?.prompt}
        onClose={() => setInsightModalOpen(false)}
        className="max-w-6xl"
      >
        {report ? (
          <InvestigationResults
            report={report}
            onShare={shareReport}
            onExport={exportPdf}
            onSpeak={playReportVoice}
            speaking={speaking}
            voiceLoading={voiceStatus === "loading"}
          />
        ) : null}
      </StudioModal>

      <StudioModal
        open={viewPanel === "verdict" && Boolean(report)}
        title="Scores & forensic findings"
        description="Probability telemetry, scene analysis, and analyst limitations."
        onClose={() => setViewPanel(null)}
        className="max-w-6xl"
      >
        {report ? (
          <InvestigationResults
            report={report}
            onShare={shareReport}
            onExport={exportPdf}
            onSpeak={playReportVoice}
            speaking={speaking}
            voiceLoading={voiceStatus === "loading"}
          />
        ) : null}
      </StudioModal>

      <StudioModal
        open={viewPanel === "evidence"}
        title="Evidence images"
        description="Primary and comparison visuals under investigation."
        onClose={() => setViewPanel(null)}
        className="max-w-5xl"
      >
        <div className={cn("grid gap-5", comparisonMode && comparison && primary && "md:grid-cols-2")}>
          {primary && (
            <EvidencePreview
              evidence={primary}
              title="Primary evidence"
              scanning={false}
              onInspect={() => {
                setViewPanel(null);
                setInspecting(primary);
              }}
              onRemove={() => setPrimary(null)}
            />
          )}
          {comparisonMode && comparison && (
            <EvidencePreview
              evidence={comparison}
              title="Comparison evidence"
              scanning={false}
              onInspect={() => {
                setViewPanel(null);
                setInspecting(comparison);
              }}
              onRemove={() => setComparison(null)}
            />
          )}
        </div>
        {!primary && !comparison && <p className="text-sm text-white/50">Evidence was cleared after analysis. Re-upload to inspect images again.</p>}
      </StudioModal>

      <StudioModal
        open={viewPanel === "timeline"}
        title="Investigation timeline"
        description="Pipeline stages from evidence intake to final verdict."
        onClose={() => setViewPanel(null)}
      >
        <ScanTimeline activeStep={activeStep} loading={loading} />
      </StudioModal>

      <StudioModal
        open={viewPanel === "history"}
        title="Saved case history"
        description="Reports stored on this device."
        onClose={() => setViewPanel(null)}
      >
        {history.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setReport(entry);
                  setViewPanel(null);
                }}
                className="sentra-focus rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-left transition"
              >
                <span className="flex items-center justify-between gap-2 text-sm text-white/70">
                  <span className="truncate">{entry.status} verdict</span>
                  <span className="text-cyan-100/52">{entry.scores.confidence}%</span>
                </span>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/48">{entry.summary}</p>
                <span className="mt-2 flex items-center gap-1 text-[10px] text-white/38">
                  <Clock3 className="h-3 w-3" /> {new Date(entry.createdAt).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/50">No saved investigations yet.</p>
        )}
      </StudioModal>

      <AnimatePresence>
        {inspecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-sentra-ink/95 p-4 backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Fullscreen evidence inspection"
          >
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] p-3">
              <p className="truncate text-sm text-white/68">{inspecting.file.name}</p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setZoom((value) => Math.max(0.5, value - 0.2))} aria-label="Zoom out">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="min-w-12 text-center text-xs text-white/50">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" onClick={() => setZoom((value) => Math.min(3, value + 0.2))} aria-label="Zoom in">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setInspecting(null);
                    setZoom(1);
                  }}
                  aria-label="Close inspection"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto rounded-3xl border border-white/10 bg-black/40">
              <motion.div animate={{ scale: zoom }} className="relative h-[75vh] w-[90vw]">
                <Image src={inspecting.url} alt="Fullscreen evidence" fill unoptimized className="object-contain" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
