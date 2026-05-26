"use client";

import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import Image from "next/image";
import {
  ArrowRight,
  Clock3,
  Expand,
  History,
  ImagePlus,
  Layers2,
  RotateCcw,
  ScanSearch,
  Sparkles,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AiOrb } from "@/components/shared/ai-orb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { investigationPrompts, investigationTimeline } from "@/features/image-intelligence/constants";
import { InvestigationResults } from "@/features/image-intelligence/investigation-results";
import { cn } from "@/lib/utils";
import type { ImageInvestigationReport } from "@/types/image-intelligence";

type EvidenceImage = { file: File; url: string };
const historyKey = "sentra-image-investigations";
const accept = ["image/png", "image/jpeg", "image/webp"];

function EvidencePreview({
  evidence,
  title,
  scanning,
  onInspect,
  onRemove,
}: {
  evidence: EvidenceImage;
  title: string;
  scanning: boolean;
  onInspect: () => void;
  onRemove: () => void;
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
      className="relative overflow-hidden rounded-3xl border border-cyan-200/15 bg-black/35"
    >
      <div className="relative h-72 w-full">
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
          <button type="button" onClick={onInspect} className="sentra-focus rounded-xl p-2 text-white/55 transition hover:bg-white/10 hover:text-white" aria-label={`Inspect ${title}`}>
            <Expand className="h-4 w-4" />
          </button>
          <button type="button" onClick={onRemove} className="sentra-focus rounded-xl p-2 text-white/55 transition hover:bg-white/10 hover:text-white" aria-label={`Remove ${title}`}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </figcaption>
    </motion.figure>
  );
}

function ScanTimeline({ activeStep, loading }: { activeStep: number; loading: boolean }) {
  return (
    <Card className="p-5" glow aria-label="Investigation timeline">
      <p className="text-xs uppercase tracking-[0.24em] text-white/42">Investigation Timeline</p>
      <div className="mt-5 grid gap-2">
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
    </Card>
  );
}

function ReportSkeleton() {
  return (
    <div className="mt-6 grid gap-5" aria-label="Analysis loading">
      {[160, 300].map((height) => (
        <div key={height} style={{ height }} className="glass-panel animate-pulse rounded-3xl bg-gradient-to-r from-white/[0.045] via-white/[0.09] to-white/[0.045] bg-[length:220%_100%]" />
      ))}
    </div>
  );
}

export function InvestigationStudio() {
  const [primary, setPrimary] = useState<EvidenceImage | null>(null);
  const [comparison, setComparison] = useState<EvidenceImage | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [report, setReport] = useState<ImageInvestigationReport | null>(null);
  const [history, setHistory] = useState<ImageInvestigationReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [inspecting, setInspecting] = useState<EvidenceImage | null>(null);
  const [zoom, setZoom] = useState(1);
  const primaryInput = useRef<HTMLInputElement>(null);
  const comparisonInput = useRef<HTMLInputElement>(null);

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
    setLoading(true);
    setReport(null);
    setActiveStep(1);
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
      setActiveStep(investigationTimeline.length);
      setHistory((current) => {
        const next = [data.report!, ...current.filter((entry) => entry.id !== data.report!.id)].slice(0, 8);
        window.localStorage.setItem(historyKey, JSON.stringify(next));
        return next;
      });
    } catch (error) {
      setActiveStep(0);
      toast.error("Investigation could not be completed.", {
        description: error instanceof Error ? error.message : "Please retry.",
      });
    } finally {
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
    setPrimary(null);
    setComparison(null);
    setComparisonMode(false);
    setPrompt("");
    setReport(null);
    setActiveStep(-1);
    if (primaryInput.current) primaryInput.current.value = "";
    if (comparisonInput.current) comparisonInput.current.value = "";
  }

  return (
    <>
      <header className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <Badge variant="cyan">Multimodal intelligence / visual forensics</Badge>
          <h1 className="mt-4 premium-gradient-text text-4xl font-semibold tracking-tight md:text-6xl">AI Analyst</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/56 md:text-base">
            Securely stage visual evidence, direct the investigation, and generate a defensible AI-assisted authenticity assessment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setComparisonMode((current) => !current)}>
            <Layers2 className="h-4 w-4" /> Compare images
          </Button>
          <Button variant="ghost" onClick={resetInvestigation}>
            <RotateCcw className="h-4 w-4" /> New case
          </Button>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1fr_350px]">
        <div className="grid gap-5">
          <Card className="overflow-hidden p-5 md:p-7" glow>
            {!primary ? (
              <motion.button
                whileHover={{ scale: 1.005 }}
                type="button"
                onClick={() => primaryInput.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "sentra-focus flex min-h-[430px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.025] px-6 text-center transition",
                  dragging && "border-cyan-200/55 bg-cyan-300/[0.06]",
                )}
              >
                <span className="relative grid h-24 w-24 place-items-center rounded-3xl border border-cyan-200/15 bg-cyan-300/[0.06] text-sentra-cyan">
                  <UploadCloud className="h-10 w-10" />
                  <span className="absolute inset-0 animate-pulse-glow rounded-3xl shadow-glow" />
                </span>
                <h2 className="mt-8 text-2xl font-semibold text-white">Drop evidence to open a case</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-white/48">Drag and drop an image or select a file. PNG, JPEG, or WEBP up to 20 MB.</p>
                <Badge variant="violet" className="mt-7">No automatic analysis on upload</Badge>
              </motion.button>
            ) : (
              <div className="grid gap-5">
                <div className={cn("grid gap-4", comparisonMode && "lg:grid-cols-2")}>
                  <EvidencePreview
                    evidence={primary}
                    title="Primary evidence"
                    scanning={loading}
                    onInspect={() => setInspecting(primary)}
                    onRemove={() => setPrimary(null)}
                  />
                  {comparisonMode && (
                    comparison ? (
                      <EvidencePreview
                        evidence={comparison}
                        title="Comparison evidence"
                        scanning={loading}
                        onInspect={() => setInspecting(comparison)}
                        onRemove={() => setComparison(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => comparisonInput.current?.click()}
                        className="sentra-focus flex h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-white/14 bg-white/[0.03] text-white/50 transition hover:border-cyan-200/30 hover:text-white"
                      >
                        <ImagePlus className="h-7 w-7 text-sentra-cyan" />
                        <span className="mt-3 text-sm">Add comparison evidence</span>
                      </button>
                    )
                  )}
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 md:p-6">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-sentra-cyan" />
                    <h2 className="text-xl font-semibold text-white">What would you like to investigate about this image?</h2>
                  </div>
                  <Textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Describe the evidence question, suspected alteration, location hypothesis, or threat concern..."
                    className="mt-5 min-h-24"
                    aria-label="Investigation question"
                  />
                  <p className="mt-5 text-[11px] uppercase tracking-[0.2em] text-white/36">AI suggested investigations</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {investigationPrompts.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setPrompt(suggestion)}
                        className={cn(
                          "sentra-focus rounded-full border border-white/10 bg-white/[0.045] px-3.5 py-2 text-xs text-white/58 transition hover:border-cyan-200/35 hover:bg-cyan-300/[0.08] hover:text-white",
                          prompt === suggestion && "border-cyan-200/35 bg-cyan-300/[0.1] text-cyan-50",
                        )}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center">
                    <p className="text-xs text-white/40">Analysis begins only when you authorize the investigation.</p>
                    <Button variant="neon" disabled={!prompt.trim() || loading} onClick={investigate}>
                      {loading ? <ScanSearch className="h-4 w-4 animate-pulse" /> : <Sparkles className="h-4 w-4" />}
                      {loading ? "Investigating" : "Run investigation"} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <input ref={primaryInput} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => event.target.files?.[0] && stageFile(event.target.files[0], "primary")} />
            <input ref={comparisonInput} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => event.target.files?.[0] && stageFile(event.target.files[0], "comparison")} />
          </Card>
        </div>

        <aside className="grid content-start gap-5">
          <Card className="relative overflow-hidden p-6 text-center" glow>
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-300/[0.06] to-transparent" />
            <AiOrb speaking={loading} size="md" className="relative mx-auto" />
            <p className="relative mt-5 text-lg font-semibold text-white">{loading ? "Processing evidence" : primary ? "Case staged" : "Awaiting evidence"}</p>
            <p className="relative mt-2 text-xs uppercase tracking-[0.2em] text-cyan-100/45">
              {loading ? "Neural inspection active" : "Vision analyst standing by"}
            </p>
          </Card>
          {primary && <ScanTimeline activeStep={activeStep} loading={loading} />}
          <Card className="p-5">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/42"><History className="h-4 w-4" /> Saved history</p>
            {history.length ? (
              <div className="mt-4 grid gap-2">
                {history.slice(0, 4).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setReport(entry)}
                    className="sentra-focus rounded-2xl border border-white/8 bg-white/[0.035] p-3 text-left transition hover:bg-white/[0.065]"
                  >
                    <span className="flex items-center justify-between gap-2 text-xs text-white/65">
                      <span className="truncate">{entry.status} verdict</span>
                      <span className="text-cyan-100/52">{entry.scores.confidence}%</span>
                    </span>
                    <span className="mt-2 flex items-center gap-1 text-[10px] text-white/38">
                      <Clock3 className="h-3 w-3" /> {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-xs leading-5 text-white/42">Completed investigation reports will be stored on this device.</p>
            )}
          </Card>
        </aside>
      </div>

      {loading ? <ReportSkeleton /> : report && <InvestigationResults report={report} onShare={shareReport} onExport={exportPdf} />}

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
                <Button variant="ghost" size="icon" onClick={() => setZoom((value) => Math.max(0.5, value - 0.2))} aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></Button>
                <span className="min-w-12 text-center text-xs text-white/50">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" onClick={() => setZoom((value) => Math.min(3, value + 0.2))} aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { setInspecting(null); setZoom(1); }} aria-label="Close inspection"><X className="h-4 w-4" /></Button>
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
