"use client";

import { AlertTriangle, CheckCircle2, Download, Fingerprint, MapPin, Share2, ShieldAlert, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ImageInvestigationReport } from "@/types/image-intelligence";

type ResultsProps = {
  report: ImageInvestigationReport;
  onExport: () => void;
  onShare: () => void;
};

function Meter({ label, value, tone = "cyan" }: { label: string; value: number; tone?: "cyan" | "violet" | "risk" | "green" }) {
  const colors = {
    cyan: "from-cyan-300 to-sentra-blue",
    violet: "from-violet-300 to-sentra-pink",
    risk: "from-amber-300 to-rose-400",
    green: "from-emerald-300 to-cyan-300",
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-white/58">
        <span>{label}</span>
        <span className="font-medium text-white">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full bg-gradient-to-r ${colors[tone]}`}
        />
      </div>
    </div>
  );
}

function InsightCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-100/48">{title}</p>
      <div className="mt-3 text-sm leading-6 text-white/65">{children}</div>
    </Card>
  );
}

export function InvestigationResults({ report, onExport, onShare }: ResultsProps) {
  const chartData = [
    { metric: "Authenticity", value: report.scores.authenticity },
    { metric: "Confidence", value: report.scores.confidence },
    { metric: "AI signal", value: report.scores.aiGeneratedProbability },
    { metric: "Manipulation", value: report.scores.manipulationProbability },
    { metric: "Deepfake", value: report.scores.deepfakeProbability },
    { metric: "Risk", value: report.scores.risk },
  ];
  const verdictVariant =
    report.status === "Real" ? "success" : report.status === "AI Generated" ? "risk" : "violet";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 grid gap-5"
      aria-label="Investigation results"
    >
      <Card className="relative overflow-hidden p-6 md:p-7" glow>
        <div className="pointer-events-none absolute right-0 top-0 h-52 w-52 bg-cyan-300/[0.08] blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={verdictVariant}>AI Verdict Card</Badge>
              {report.source === "demo" && <Badge variant="violet">Demo mode</Badge>}
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-white">
              {report.status}
              <span className="ml-3 text-lg font-normal text-white/44">{report.scores.confidence}% confidence</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">{report.summary}</p>
          </div>
          <div className="grid min-w-[290px] grid-cols-2 gap-3">
            {[
              ["Threat level", report.threatLevel.toUpperCase()],
              ["Authenticity", `${report.scores.authenticity}%`],
              ["Risk score", `${report.scores.risk}%`],
              ["Deepfake", `${report.scores.deepfakeProbability}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">{label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 md:flex-row md:items-center md:justify-between">
          <p className="flex max-w-3xl items-start gap-2 text-sm text-white/68">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sentra-cyan" />
            <span><strong className="text-white">Recommended action:</strong> {report.recommendedAction}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onShare}><Share2 className="h-4 w-4" /> Share</Button>
            <Button variant="ghost" size="sm" onClick={onExport}><Download className="h-4 w-4" /> Export PDF</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Card className="p-5" glow>
          <p className="text-xs uppercase tracking-[0.22em] text-white/42">Probability telemetry</p>
          <div className="mt-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData}>
                <PolarGrid stroke="rgba(255,255,255,0.12)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,.55)", fontSize: 10 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" fill="#53f4ff" fillOpacity={0.19} stroke="#53f4ff" strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-4">
            <Meter label="AI-generated probability" value={report.scores.aiGeneratedProbability} tone="violet" />
            <Meter label="Authenticity score" value={report.scores.authenticity} tone="green" />
            <Meter label="Manipulation detection" value={report.scores.manipulationProbability} tone="risk" />
          </div>
        </Card>
        <div className="grid gap-5 sm:grid-cols-2">
          <InsightCard title="Image Forensics">
            <ul className="grid gap-2">
              {report.forensicAnalysis.map((finding) => <li key={finding}>• {finding}</li>)}
            </ul>
          </InsightCard>
          <InsightCard title="Metadata Insights">
            <ul className="grid gap-2">
              {report.metadataInsights.map((finding) => <li key={finding}>• {finding}</li>)}
            </ul>
          </InsightCard>
          <InsightCard title="Environment Estimate">
            <p className="flex gap-2"><MapPin className="mt-1 h-4 w-4 shrink-0 text-sentra-cyan" />{report.environmentEstimate}</p>
          </InsightCard>
          <InsightCard title="Lighting + Shadow Consistency">{report.lightingAnalysis}</InsightCard>
          <InsightCard title="Manipulation Detection">
            <p className="flex gap-2"><Fingerprint className="mt-1 h-4 w-4 shrink-0 text-sentra-cyan" />{report.manipulationAnalysis}</p>
          </InsightCard>
          <InsightCard title="Emotional / Social Context">{report.emotionalContext}</InsightCard>
          <InsightCard title="Objects + Scene Recognition">
            <div className="flex flex-wrap gap-2">
              {report.objects.map((object) => <Badge key={object}>{object}</Badge>)}
            </div>
          </InsightCard>
          <InsightCard title="Brand / Logo Detection">
            <div className="flex flex-wrap gap-2">
              {report.brands.map((brand) => <Badge key={brand} variant="cyan">{brand}</Badge>)}
            </div>
          </InsightCard>
        </div>
      </div>

      {report.comparisonAnalysis && (
        <Card className="p-6" glow>
          <div className="flex gap-3">
            <Sparkles className="h-5 w-5 shrink-0 text-sentra-cyan" />
            <div>
              <h3 className="font-semibold text-white">Side-by-side forensic comparison</h3>
              <p className="mt-2 text-sm leading-7 text-white/64">{report.comparisonAnalysis}</p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-amber-200/65">
          <ShieldAlert className="h-4 w-4" /> Analyst limitations
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {report.limitations.map((item) => (
            <p key={item} className="flex gap-2 text-sm leading-6 text-white/52">
              <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-200/65" /> {item}
            </p>
          ))}
        </div>
      </Card>
    </motion.section>
  );
}
