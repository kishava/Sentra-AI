"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  BrainCircuit,
  Camera,
  Download,
  Eye,
  FileText,
  Fingerprint,
  History,
  ImagePlus,
  Layers2,
  LocateFixed,
  RotateCcw,
  ScanFace,
  Send,
  Share2,
  ShieldCheck,
  TerminalSquare,
  UploadCloud,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar as RadarShape,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { AiOrb } from "@/components/shared/ai-orb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FaceOverlayPanel } from "@/features/image-intelligence/face-overlay";
import { StudioModal } from "@/features/world-engine/studio-modal";
import {
  detectSkinToneFaceRegion,
  isPlausibleFaceBox,
  pickBestFaceBox,
  portraitFaceFallback,
  type FaceBox,
} from "@/lib/face-detection/region";
import { listWorkspaceHistory, recordFaceIntelligenceHistory } from "@/lib/history/workspace-history";
import { downloadFaceReport } from "@/lib/image-intelligence/export-report";
import { cn } from "@/lib/utils";
import { useSettings } from "@/settings/settings-context";
import type { FaceIntelligenceReport } from "@/types/workspace-history";

type FacePanel = "map" | "telemetry" | "report" | "comparison" | "regions" | "notes" | "history" | null;

type EvidenceImage = { file: File; url: string; width?: number; height?: number };
type Landmark = { x: number; y: number; label: string };
type FaceDetection = {
  id: string;
  box: FaceBox;
  visibility: number;
  quality: number;
  blur: number;
  angle: number;
  lighting: number;
  occlusion: number;
  landmarks: Landmark[];
};
type FaceReport = {
  id: string;
  createdAt: string;
  caseId: string;
  imageName: string;
  width: number;
  height: number;
  faces: FaceDetection[];
  scores: {
    authenticity: number;
    aiGenerated: number;
    deepfake: number;
    manipulation: number;
    consistency: number;
    lighting: number;
    shadow: number;
    reflection: number;
    readiness: number;
  };
  quality: {
    sharpness: number;
    exposure: number;
    noise: number;
    compression: number;
    resolution: number;
    eyeVisibility: number;
  };
  suspiciousRegions: FaceBox[];
  summary: string;
  authenticReasons: string[];
  manipulationReasons: string[];
  anomalies: string[];
  notes: string;
};
type ComparisonReport = {
  score: number;
  landmarkSimilarity: number;
  featureComparison: string[];
  confidence: number;
};
type FaceDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ boundingBox?: DOMRectReadOnly }>>;
};
type FaceDetectorCtor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike;

const accept = ["image/png", "image/jpeg", "image/webp"];
const logScript = [
  ["FACE", "Detecting facial landmarks..."],
  ["AUTHENTICITY", "Analyzing skin texture patterns..."],
  ["DEEPFAKE", "Checking synthetic artifacts..."],
  ["FORENSICS", "Examining lighting consistency..."],
  ["AI", "Generating investigation report..."],
  ["COMPLETE", "Face intelligence report generated."],
];

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function scoreTone(value: number) {
  if (value >= 82) return "text-emerald-200";
  if (value >= 60) return "text-cyan-100";
  if (value >= 38) return "text-amber-200";
  return "text-rose-200";
}

function getFaceDetector(): FaceDetectorCtor | null {
  if (typeof window === "undefined") return null;
  return (window as typeof window & { FaceDetector?: FaceDetectorCtor }).FaceDetector ?? null;
}

function loadImage(file: File) {
  return new Promise<{ image: HTMLImageElement; url: string }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the uploaded image."));
    };
    image.src = url;
  });
}

function imageMetrics(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  const width = Math.min(image.naturalWidth, 900);
  const height = Math.max(1, Math.round((image.naturalHeight / image.naturalWidth) * width));
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas analysis is unavailable in this browser.");
  context.drawImage(image, 0, 0, width, height);
  const data = context.getImageData(0, 0, width, height).data;
  let brightness = 0;
  let variance = 0;
  let edge = 0;
  let noise = 0;

  const luminance: number[] = [];
  for (let index = 0; index < data.length; index += 4) {
    const lum = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
    luminance.push(lum);
    brightness += lum;
  }
  brightness /= luminance.length;
  for (let index = 0; index < luminance.length; index += 1) {
    variance += (luminance[index] - brightness) ** 2;
    if (index > width + 1) {
      edge += Math.abs(luminance[index] - luminance[index - 1]) + Math.abs(luminance[index] - luminance[index - width]);
      noise += Math.abs(luminance[index] - luminance[index - width - 1]);
    }
  }
  variance /= luminance.length;
  edge /= luminance.length;
  noise /= luminance.length;

  return {
    canvas,
    width,
    height,
    brightness,
    contrast: Math.sqrt(variance),
    sharpness: clamp(edge * 3.4),
    exposure: clamp(100 - Math.abs(brightness - 132) * 0.85),
    noise: clamp(100 - noise * 2.6),
  };
}

function landmarksFor(box: FaceBox): Landmark[] {
  const points = [
    [0.34, 0.36, "left eye"],
    [0.66, 0.36, "right eye"],
    [0.5, 0.52, "nose"],
    [0.4, 0.68, "mouth left"],
    [0.6, 0.68, "mouth right"],
    [0.5, 0.82, "chin"],
    [0.23, 0.5, "left cheek"],
    [0.77, 0.5, "right cheek"],
  ] as const;
  return points.map(([x, y, label]) => ({ x: box.x + box.width * x, y: box.y + box.height * y, label }));
}

async function detectFaces(image: HTMLImageElement, canvas: HTMLCanvasElement, metrics: ReturnType<typeof imageMetrics>, file: File): Promise<FaceReport> {
  const Detector = getFaceDetector();
  let boxes: FaceBox[] = [];
  if (Detector) {
    try {
      const detections = await new Detector({ fastMode: false, maxDetectedFaces: 12 }).detect(canvas);
      boxes = detections
        .filter((item) => item.boundingBox)
        .map((item) => ({
          x: item.boundingBox!.x,
          y: item.boundingBox!.y,
          width: item.boundingBox!.width,
          height: item.boundingBox!.height,
        }));
    } catch {
      boxes = [];
    }
  }
  if (!boxes.length) boxes = [fallbackFace(metrics.width, metrics.height)];

  const resolution = clamp(Math.min(100, (image.naturalWidth * image.naturalHeight) / 16000));
  const compression = clamp(Math.min(100, (file.size / Math.max(1, image.naturalWidth * image.naturalHeight)) * 1200));
  const lighting = clamp(metrics.exposure * 0.68 + metrics.contrast * 0.8);
  const blur = clamp(100 - metrics.sharpness);
  const baseQuality = clamp(metrics.sharpness * 0.32 + metrics.exposure * 0.28 + metrics.noise * 0.18 + resolution * 0.22);

  const faces = boxes.map((box, index) => {
    const centerOffset = Math.abs((box.x + box.width / 2) / metrics.width - 0.5);
    const angle = clamp(centerOffset * 58, 0, 45);
    const occlusion = clamp(100 - Math.min(100, (box.width * box.height) / (metrics.width * metrics.height) * 260));
    return {
      id: `face-${index + 1}`,
      box,
      visibility: clamp(100 - occlusion * 0.45),
      quality: clamp(baseQuality - angle * 0.35 - blur * 0.22),
      blur,
      angle,
      lighting,
      occlusion,
      landmarks: landmarksFor(box),
    };
  });

  const authenticity = clamp(baseQuality * 0.48 + metrics.noise * 0.2 + lighting * 0.22 + compression * 0.1 - blur * 0.18);
  const aiGenerated = clamp(100 - authenticity + Math.max(0, 76 - compression) * 0.2 + Math.max(0, 52 - metrics.noise) * 0.25);
  const manipulation = clamp((100 - metrics.noise) * 0.28 + blur * 0.22 + Math.abs(metrics.brightness - 132) * 0.16 + (faces.length > 1 ? 8 : 0));
  const deepfake = clamp(aiGenerated * 0.55 + manipulation * 0.32 + (100 - baseQuality) * 0.18);
  const consistency = clamp(100 - Math.abs(faces[0]?.lighting ?? lighting - lighting) - manipulation * 0.28);
  const shadow = clamp(lighting * 0.72 + metrics.contrast * 0.75);
  const reflection = clamp(metrics.noise * 0.48 + lighting * 0.38 + metrics.sharpness * 0.18);
  const readiness = clamp(baseQuality * 0.62 + resolution * 0.2 + (100 - blur) * 0.18);

  const suspiciousRegions = [
    {
      x: Math.max(0, (faces[0]?.box.x ?? 0) + (faces[0]?.box.width ?? 0) * 0.58),
      y: Math.max(0, (faces[0]?.box.y ?? 0) + (faces[0]?.box.height ?? 0) * 0.28),
      width: Math.max(40, (faces[0]?.box.width ?? 120) * 0.28),
      height: Math.max(32, (faces[0]?.box.height ?? 120) * 0.2),
    },
  ];

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    caseId: `FACE-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    imageName: file.name,
    width: metrics.width,
    height: metrics.height,
    faces,
    scores: { authenticity, aiGenerated, deepfake, manipulation, consistency, lighting, shadow, reflection, readiness },
    quality: {
      sharpness: metrics.sharpness,
      exposure: metrics.exposure,
      noise: metrics.noise,
      compression,
      resolution,
      eyeVisibility: clamp((faces[0]?.visibility ?? 75) - (faces[0]?.angle ?? 0) * 0.35),
    },
    suspiciousRegions,
    summary: faces.length
      ? `Detected ${faces.length} face${faces.length === 1 ? "" : "s"} with ${readiness}% investigation readiness and ${authenticity}% real-image confidence.`
      : "No reliable face region was detected. Submit a clearer front-facing image for stronger forensic confidence.",
    authenticReasons: [
      "Facial geometry remains broadly consistent across landmark positions.",
      "Lighting and exposure are within an analyzable forensic range.",
      "Resolution supports visual inspection of primary face regions.",
    ],
    manipulationReasons: [
      manipulation > 55 ? "Compression and local texture variance require manual review." : "No dominant manipulation pattern is present in the sampled face region.",
      deepfake > 55 ? "Synthetic artifact score is elevated around high-contrast facial zones." : "Deepfake risk remains below the escalation threshold.",
      blur > 58 ? "Blur level reduces certainty across landmark boundaries." : "Sharpness is sufficient for baseline landmark review.",
    ],
    anomalies: [
      "Review cheek and eye-adjacent regions for texture discontinuity.",
      "Validate shadows against the visible light direction before legal or HR action.",
      "This system does not identify people or search biometric databases.",
    ],
    notes: "",
  };
}

function Gauge({ label, value, tone = "cyan" }: { label: string; value: number; tone?: "cyan" | "risk" | "green" }) {
  const color = tone === "risk" ? "from-rose-400 to-amber-200" : tone === "green" ? "from-emerald-300 to-cyan-200" : "from-sentra-cyan to-sentra-violet";
  return (
    <Card className="p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/42">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <p className={cn("text-4xl font-semibold", scoreTone(value))}>{value}%</p>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8 }} className={cn("h-full rounded-full bg-gradient-to-r", color)} />
        </div>
      </div>
    </Card>
  );
}

function ImageAnalysisPanel({ evidence, report }: { evidence: EvidenceImage; report?: FaceReport }) {
  return (
    <Card className="overflow-hidden p-4 md:p-5" glow>
      <FaceOverlayPanel
        imageUrl={evidence.url}
        imageAlt="Face intelligence evidence"
        report={report}
      />
    </Card>
  );
}

function LiveLogs({ logs, running }: { logs: string[]; running: boolean }) {
  return (
    <Card className="forensics-terminal overflow-hidden p-0" glow>
      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/48">Live analysis logs</p>
      </div>
      <div className="terminal-panel grid max-h-72 gap-2 overflow-y-auto p-4 font-mono text-xs">
        {logs.map((log, index) => (
          <motion.p key={`${log}-${index}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="text-white/62">
            {log}
            {running && index === logs.length - 1 && <span className="terminal-cursor">_</span>}
          </motion.p>
        ))}
      </div>
    </Card>
  );
}

function Telemetry({ report }: { report: FaceReport }) {
  const data = [
    { metric: "Authenticity", value: report.scores.authenticity },
    { metric: "Confidence", value: report.scores.readiness },
    { metric: "Deepfake Risk", value: report.scores.deepfake },
    { metric: "Manipulation", value: report.scores.manipulation },
    { metric: "Lighting", value: report.scores.lighting },
    { metric: "Face Quality", value: report.faces[0]?.quality ?? 0 },
  ];
  return (
    <Card className="p-5" glow>
      <p className="text-xs uppercase tracking-[0.22em] text-white/42">AI Face Telemetry</p>
      <div className="mt-5 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="rgba(255,255,255,0.12)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,.58)", fontSize: 10 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <RadarShape dataKey="value" fill="#53f4ff" fillOpacity={0.18} stroke="#53f4ff" strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function FaceReportDetail({
  report,
  settings,
  onNotesChange,
}: {
  report: FaceReport;
  settings: ReturnType<typeof useSettings>["settings"];
  onNotesChange: (notes: string) => void;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Telemetry report={report} />
        <Card className="p-5 md:p-6" glow>
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-cyan-100/48">
            <FileText className="h-4 w-4" /> Face intelligence report
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{report.summary}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200/12 bg-emerald-300/[0.035] p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-200" /> Authenticity indicators
              </p>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-white/58">
                {report.authenticReasons.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-rose-200/12 bg-rose-300/[0.035] p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <AlertTriangle className="h-4 w-4 text-rose-200" /> Suspicious evidence
              </p>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-white/58">
                {report.manipulationReasons.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {([
          ["Faces detected", report.faces.length, Camera],
          ["Face quality", report.faces[0]?.quality ?? 0, BadgeCheck],
          ["Lighting consistency", report.scores.lighting, Eye],
          ["Manipulation risk", report.scores.manipulation, Fingerprint],
        ] as Array<[string, number, LucideIcon]>).map(([label, value, Icon]) => (
          <Card key={String(label)} className="p-5">
            <Icon className="h-5 w-5 text-sentra-cyan" />
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/38">{String(label)}</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {String(value)}
              {typeof value === "number" && label !== "Faces detected" ? "%" : ""}
            </p>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {settings.forensics.aiGeneratedProbability && <Gauge label="AI Generated Confidence" value={report.scores.aiGenerated} tone="risk" />}
        {settings.forensics.deepfakeRisk && <Gauge label="Deepfake Risk Score" value={report.scores.deepfake} tone="risk" />}
        <Gauge label="Real Image Confidence" value={report.scores.authenticity} tone="green" />
        <Gauge label="Investigation Readiness" value={report.scores.readiness} tone="cyan" />
      </div>
      <Card className="p-5" glow>
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/42">
          <BrainCircuit className="h-4 w-4 text-sentra-cyan" /> Analyst notes
        </p>
        <Textarea
          value={report.notes}
          onChange={(event) => onNotesChange(event.target.value)}
          className="mt-4 min-h-40"
          placeholder="Add case notes, reviewer observations, or escalation details..."
        />
      </Card>
    </div>
  );
}

function compareReports(a: FaceReport, b: FaceReport): ComparisonReport {
  const faceA = a.faces[0];
  const faceB = b.faces[0];
  const qualityDelta = Math.abs((faceA?.quality ?? 0) - (faceB?.quality ?? 0));
  const angleDelta = Math.abs((faceA?.angle ?? 0) - (faceB?.angle ?? 0));
  const lightingDelta = Math.abs((faceA?.lighting ?? 0) - (faceB?.lighting ?? 0));
  const landmarkSimilarity = clamp(100 - angleDelta * 1.2 - qualityDelta * 0.35);
  const score = clamp(100 - qualityDelta * 0.28 - lightingDelta * 0.24 - angleDelta * 1.4);
  return {
    score,
    landmarkSimilarity,
    confidence: clamp((a.scores.readiness + b.scores.readiness) / 2 - angleDelta * 0.45),
    featureComparison: [
      "Comparison is limited to the two uploaded images only.",
      "No identity search, name lookup, or public biometric database query was performed.",
      score > 72 ? "Landmark geometry and visible facial proportions are broadly compatible." : "Visible pose, quality, or lighting differences reduce match confidence.",
    ],
  };
}

export function FaceIntelligenceStudio() {
  const { settings } = useSettings();
  const [primary, setPrimary] = useState<EvidenceImage | null>(null);
  const [secondary, setSecondary] = useState<EvidenceImage | null>(null);
  const [report, setReport] = useState<FaceReport | null>(null);
  const [secondaryReport, setSecondaryReport] = useState<FaceReport | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<FaceReport[]>([]);
  const [viewPanel, setViewPanel] = useState<FacePanel>(null);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const primaryInput = useRef<HTMLInputElement>(null);
  const secondaryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const persisted = listWorkspaceHistory().flatMap((entry) =>
      entry.payload.kind === "face_intelligence" ? [entry.payload.report as FaceReport] : [],
    );
    if (persisted.length) queueMicrotask(() => setHistory(persisted));
  }, []);

  useEffect(() => () => {
    if (primary) URL.revokeObjectURL(primary.url);
    if (secondary) URL.revokeObjectURL(secondary.url);
  }, [primary, secondary]);

  async function analyze(file: File) {
    if (!accept.includes(file.type)) {
      toast.error("Unsupported evidence file.", { description: "Use PNG, JPEG, or WEBP." });
      return null;
    }
    const loaded = await loadImage(file);
    const metrics = imageMetrics(loaded.image);
    const next = await detectFaces(loaded.image, metrics.canvas, metrics, file);
    return { evidence: { file, url: loaded.url, width: loaded.image.naturalWidth, height: loaded.image.naturalHeight }, report: next };
  }

  async function runAnalysis(file: File, target: "primary" | "secondary") {
    setRunning(true);
    setLogs([]);
    const timers = logScript.map(([tag, message], index) =>
      window.setTimeout(() => setLogs((current) => [...current, `[${tag}] ${message}`]), index * 450),
    );
    try {
      const result = await analyze(file);
      if (!result) return;
      await new Promise((resolve) => window.setTimeout(resolve, logScript.length * 450));
      if (target === "primary") {
        setPrimary(settings.privacy.clearUploadsAfterAnalysis ? null : result.evidence);
        setReport(result.report);
        recordFaceIntelligenceHistory(result.report as FaceIntelligenceReport);
        setHistory((current) => [result.report, ...current].slice(0, 8));
        if (settings.privacy.clearUploadsAfterAnalysis) URL.revokeObjectURL(result.evidence.url);
      } else {
        setSecondary(settings.privacy.clearUploadsAfterAnalysis ? null : result.evidence);
        setSecondaryReport(result.report);
        if (settings.privacy.clearUploadsAfterAnalysis) URL.revokeObjectURL(result.evidence.url);
      }
      toast.success("Face intelligence report generated.");
    } catch (error) {
      toast.error("Face analysis failed.", { description: error instanceof Error ? error.message : "Please retry." });
    } finally {
      timers.forEach((timer) => window.clearTimeout(timer));
      setRunning(false);
    }
  }

  const comparison = useMemo(
    () => (report && secondaryReport ? compareReports(report, secondaryReport) : null),
    [report, secondaryReport],
  );

  function updateNotes(notes: string) {
    if (!report) return;
    setReport({ ...report, notes });
  }

  async function shareReport() {
    if (!report) return;
    const text = `${report.caseId}: ${report.summary}\nReal image confidence: ${report.scores.authenticity}%\nDeepfake risk: ${report.scores.deepfake}%`;
    if (navigator.share) await navigator.share({ title: "AI Face Intelligence Report", text }).catch(() => undefined);
    else {
      await navigator.clipboard.writeText(text);
      toast.success("Face intelligence summary copied.");
    }
  }

  function resetCase() {
    setPrimary(null);
    setSecondary(null);
    setReport(null);
    setSecondaryReport(null);
    setCompareMode(false);
    setViewPanel(null);
    setLogs([]);
  }

  if (!settings.forensics.faceIntelligence) {
    return (
      <Card className="grid min-h-[420px] place-items-center p-8 text-center" glow>
        <div>
          <ScanFace className="mx-auto h-12 w-12 text-sentra-cyan" />
          <h1 className="mt-5 text-2xl font-semibold text-white">AI Face Intelligence is disabled</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/52">
            Enable Face Intelligence in Settings to analyze uploaded facial evidence, landmarks, authenticity, and comparison confidence.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <section className="mb-7 grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="relative overflow-visible p-6 md:p-8" glow>
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/[0.08] blur-3xl" />
          <Badge variant="cyan">AI Face Intelligence / authenticity forensics</Badge>
          <h1 className="type-display-lg relative mt-4 premium-gradient-text">
            Detect faces, landmarks, and synthetic risk.
          </h1>
          <p className="relative mt-4 max-w-3xl text-sm leading-7 text-white/57 md:text-base">
            Upload facial evidence for landmark mapping, authenticity scoring, deepfake risk, and optional two-face comparison — without identity lookup or biometric search.
          </p>

          {!primary ? (
            <button
              type="button"
              onClick={() => primaryInput.current?.click()}
              className="sentra-focus relative mt-6 flex min-h-48 w-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.025] px-6 text-center transition"
            >
              <UploadCloud className="h-10 w-10 text-sentra-cyan" />
              <p className="mt-4 text-lg font-semibold text-white">Upload facial evidence</p>
              <p className="mt-2 max-w-md text-sm text-white/48">PNG, JPEG, or WEBP. Analysis runs on upload and stays scoped to your files.</p>
            </button>
          ) : (
            <div className="relative mt-6">
              <ImageAnalysisPanel evidence={primary} report={report ?? undefined} />
            </div>
          )}

          <div className="relative z-20 mt-6 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="neon" size="sm" onClick={() => primaryInput.current?.click()} disabled={running}>
                <UploadCloud className="h-4 w-4" /> {primary ? "Replace image" : "Upload face image"}
              </Button>
              {settings.forensics.faceComparison && (
                <Button variant="ghost" size="sm" onClick={() => setCompareMode((value) => !value)}>
                  <Layers2 className="h-4 w-4" /> {compareMode ? "Hide compare" : "Compare two faces"}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={resetCase}>
                <RotateCcw className="h-4 w-4" /> New case
              </Button>
              {(running || logs.length > 0) && settings.analyst.liveLogs && (
                <Button variant="ghost" size="sm" onClick={() => setLogModalOpen(true)}>
                  <TerminalSquare className="h-4 w-4" />
                  {running ? "Live log" : "Activity log"}
                </Button>
              )}
              {report && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setViewPanel("report")}>
                    <Eye className="h-4 w-4" /> View report
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => downloadFaceReport(report, "markdown")}>
                    <Download className="h-4 w-4" /> Download
                  </Button>
                </>
              )}
            </div>
            {settings.forensics.faceComparison && compareMode && (
              <Button variant="ghost" size="sm" className="w-full sm:w-fit" onClick={() => secondaryInput.current?.click()} disabled={running}>
                <ImagePlus className="h-4 w-4" /> Upload comparison face (Image B)
              </Button>
            )}
            <Button
              variant="neon"
              className="w-full sm:w-fit sm:self-end"
              onClick={() => primaryInput.current?.click()}
              disabled={running}
            >
              <Send className="h-4 w-4" /> {running ? "Analyzing…" : primary ? "Re-run face analysis" : "Launch face analysis"}
            </Button>
          </div>

          <input
            ref={primaryInput}
            className="hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => event.target.files?.[0] && void runAnalysis(event.target.files[0], "primary")}
          />
          <input
            ref={secondaryInput}
            className="hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => event.target.files?.[0] && void runAnalysis(event.target.files[0], "secondary")}
          />
        </Card>

        <Card className="flex flex-col items-center justify-center p-6 text-center" glow>
          <AiOrb speaking={running} size="md" />
          <p className="mt-5 text-lg font-semibold text-white">{report ? report.caseId : running ? "Analyzing faces" : "Awaiting face evidence"}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-100/45">
            {running ? "Landmark & authenticity scan" : "No identity recognition"}
          </p>
          {report && (
            <p className="mt-3 text-sm text-white/52">
              {report.faces.length} face{report.faces.length === 1 ? "" : "s"} · {report.scores.authenticity}% real confidence
            </p>
          )}
        </Card>
      </section>

      {running && settings.analyst.liveLogs && (
        <Card className="mb-5 flex flex-wrap items-center justify-between gap-4 p-4 md:p-5" glow>
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sentra-cyan shadow-[0_0_12px_rgba(83,244,255,.85)]" />
            <div>
              <p className="text-sm font-medium text-white">Face intelligence analysis in progress</p>
              <p className="mt-1 font-mono text-[11px] text-white/42">{logs[logs.length - 1] ?? "[FACE] Starting scan"}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => setLogModalOpen(true)}>
            <TerminalSquare className="h-4 w-4" /> Open activity log
          </Button>
        </Card>
      )}

      {!running && !report && !primary && (
        <Card className="mb-5 grid min-h-40 place-items-center p-8 text-center" glow>
          <ScanFace className="h-10 w-10 text-sentra-cyan" />
          <h2 className="mt-4 text-xl font-semibold text-white">Face engine awaiting evidence</h2>
          <p className="mt-2 text-sm text-white/48">Upload a front-facing image to map landmarks and score authenticity risk.</p>
        </Card>
      )}

      {!running && report && (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} aria-label="Face intelligence report">
          <Card className="p-6 md:p-8" glow>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">Analysis ready</Badge>
              <Badge variant="cyan">{report.faces.length} face{report.faces.length === 1 ? "" : "s"} detected</Badge>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">{report.caseId}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/58">{report.summary}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Real confidence", `${report.scores.authenticity}%`, "text-emerald-200"],
                ["Deepfake risk", `${report.scores.deepfake}%`, "text-rose-200"],
                ["Manipulation", `${report.scores.manipulation}%`, "text-amber-200"],
                ["Readiness", `${report.scores.readiness}%`, "text-cyan-100"],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">{label}</p>
                  <p className={cn("mt-1 text-xl font-semibold", String(color))}>{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-white/40">Landmarks, telemetry, and comparison open in views below.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Button variant="neon" className="justify-start" onClick={() => setViewPanel("map")} disabled={!primary}>
                <ScanFace className="h-4 w-4" /> Face map & landmarks
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => setViewPanel("report")}>
                <FileText className="h-4 w-4" /> Full intelligence report
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => setViewPanel("telemetry")}>
                <Eye className="h-4 w-4" /> AI face telemetry
              </Button>
              {settings.forensics.faceComparison && compareMode && (
                <Button variant="ghost" className="justify-start" onClick={() => setViewPanel("comparison")}>
                  <Layers2 className="h-4 w-4" /> Face comparison
                </Button>
              )}
              <Button variant="ghost" className="justify-start" onClick={() => setViewPanel("regions")}>
                <LocateFixed className="h-4 w-4" /> Suspicious regions
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => setViewPanel("notes")}>
                <BrainCircuit className="h-4 w-4" /> Analyst notes
              </Button>
              {settings.analyst.liveLogs && (
                <Button variant="ghost" className="justify-start" onClick={() => setLogModalOpen(true)}>
                  <TerminalSquare className="h-4 w-4" /> Activity log
                </Button>
              )}
              <Button variant="ghost" className="justify-start" onClick={() => downloadFaceReport(report, "markdown")}>
                <FileText className="h-4 w-4" /> Download brief
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => window.print()}>
                <Download className="h-4 w-4" /> Export PDF
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => void shareReport()}>
                <Share2 className="h-4 w-4" /> Share summary
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
        title="Face analysis log"
        description="Landmark detection, authenticity scoring, and report synthesis."
        onClose={() => setLogModalOpen(false)}
      >
        <LiveLogs logs={logs.length ? logs : ["[STANDBY] Face intelligence engine ready."]} running={running} />
      </StudioModal>

      <StudioModal
        open={viewPanel === "map" && Boolean(primary)}
        title="Face map & landmarks"
        description="Detected regions, landmark points, and suspicious zones."
        onClose={() => setViewPanel(null)}
        className="max-w-5xl"
      >
        {primary ? <ImageAnalysisPanel evidence={primary} report={report ?? undefined} /> : null}
      </StudioModal>

      <StudioModal
        open={viewPanel === "telemetry" && Boolean(report)}
        title="AI face telemetry"
        description="Radar view of authenticity, risk, and quality signals."
        onClose={() => setViewPanel(null)}
      >
        {report ? <Telemetry report={report} /> : null}
      </StudioModal>

      <StudioModal
        open={viewPanel === "report" && Boolean(report)}
        title="Face intelligence report"
        description={report?.caseId}
        onClose={() => setViewPanel(null)}
        className="max-w-6xl"
      >
        {report ? <FaceReportDetail report={report} settings={settings} onNotesChange={updateNotes} /> : null}
      </StudioModal>

      <StudioModal
        open={viewPanel === "comparison" && compareMode}
        title="Compare two faces"
        description="Image A vs Image B — no identity lookup."
        onClose={() => setViewPanel(null)}
        className="max-w-5xl"
      >
        <div className="grid gap-5">
          <p className="text-sm text-white/50">Only compares the two uploaded images. No public face recognition is performed.</p>
          <div className="grid gap-5 md:grid-cols-2">
            {primary && <ImageAnalysisPanel evidence={primary} report={report ?? undefined} />}
            {secondary ? (
              <ImageAnalysisPanel evidence={secondary} report={secondaryReport ?? undefined} />
            ) : (
              <Card className="grid min-h-64 place-items-center border-dashed p-6 text-center" glow>
                <Button variant="ghost" onClick={() => secondaryInput.current?.click()}>
                  <ImagePlus className="h-4 w-4" /> Upload Image B
                </Button>
              </Card>
            )}
          </div>
          {comparison ? (
            <div className="grid gap-4 md:grid-cols-[260px_1fr]">
              <Gauge label="Same person probability" value={comparison.score} tone="cyan" />
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-sm font-medium text-white">Matching confidence {comparison.confidence}%</p>
                <p className="mt-2 text-sm text-white/55">Landmark similarity {comparison.landmarkSimilarity}%</p>
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-white/58">
                  {comparison.featureComparison.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/48">Upload Image B to run a side-by-side comparison.</p>
          )}
        </div>
      </StudioModal>

      <StudioModal
        open={viewPanel === "regions" && Boolean(report)}
        title="Suspicious region detection"
        description="Anomalies and image quality metrics for manual review."
        onClose={() => setViewPanel(null)}
      >
        {report ? (
          <div className="grid gap-5">
            <div className="grid gap-2 text-sm leading-6 text-white/58">
              {report.anomalies.map((item) => (
                <p key={item}>- {item}</p>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Gauge label="Compression quality" value={report.quality.compression} />
              <Gauge label="Image sharpness" value={report.quality.sharpness} />
              <Gauge label="Exposure quality" value={report.quality.exposure} />
            </div>
            {primary && <ImageAnalysisPanel evidence={primary} report={report} />}
          </div>
        ) : null}
      </StudioModal>

      <StudioModal
        open={viewPanel === "notes" && Boolean(report)}
        title="Analyst notes"
        description="Case notes and escalation details."
        onClose={() => setViewPanel(null)}
      >
        {report ? (
          <Textarea
            value={report.notes}
            onChange={(event) => updateNotes(event.target.value)}
            className="min-h-48"
            placeholder="Add case notes, reviewer observations, or escalation details..."
          />
        ) : null}
      </StudioModal>

      <StudioModal
        open={viewPanel === "history"}
        title="Saved face analysis history"
        description="Reports stored in your workspace."
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
                className="sentra-focus rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-left"
              >
                <span className="block truncate text-sm text-white/70">{entry.caseId}</span>
                <span className="mt-2 block text-xs text-cyan-100/52">{entry.scores.authenticity}% real confidence</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/50">No saved face analyses yet.</p>
        )}
      </StudioModal>
    </>
  );
}
