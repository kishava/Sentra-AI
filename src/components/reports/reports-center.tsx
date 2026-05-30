"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Globe2,
  History,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { InvestigationResults } from "@/features/image-intelligence/investigation-results";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { WorkspacePage, WorkspacePageHeader, WorkspaceSection } from "@/components/workspace/workspace-page";
import {
  WORKSPACE_HISTORY_EVENT,
  historyKindLabel,
  listWorkspaceHistory,
  mergeHistoryEntries,
} from "@/lib/history/workspace-history";
import type { WorkspaceHistoryEntry } from "@/types/workspace-history";
import { claimStatusLabel, normalizeClaimStatus } from "@/types/intelligence";

const kindIcons = {
  monitor_report: Radar,
  image_forensics: Camera,
  face_intelligence: ShieldCheck,
  world_engine: Globe2,
  gtm_briefing: Sparkles,
} as const;

export function ReportsCenter() {
  const [entries, setEntries] = useState<WorkspaceHistoryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadMessage, setLoadMessage] = useState("");

  const loadEntries = useCallback(async () => {
    try {
      const local = listWorkspaceHistory();
      const response = await fetch("/api/history", { credentials: "include" });
      const data = (await response.json().catch(() => ({}))) as {
        entries?: WorkspaceHistoryEntry[];
        schemaReady?: boolean;
        error?: string;
      };

      if (response.ok) {
        const merged = mergeHistoryEntries(local, data.entries ?? []);
        setEntries(merged);
        setSelectedId((current) => current ?? merged[0]?.id);
        setLoadMessage(
          data.schemaReady === false
            ? "Cloud history is unavailable — showing analyses saved on this device."
            : "",
        );
      } else {
        throw new Error(data.error || "History could not be loaded.");
      }
    } catch (error) {
      const local = listWorkspaceHistory();
      setEntries(local);
      setSelectedId(local[0]?.id);
      setLoadMessage(error instanceof Error ? error.message : "Showing device history only.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
    const onUpdate = () => void loadEntries();
    window.addEventListener(WORKSPACE_HISTORY_EVENT, onUpdate);
    return () => window.removeEventListener(WORKSPACE_HISTORY_EVENT, onUpdate);
  }, [loadEntries]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) =>
      `${entry.title} ${entry.subtitle} ${entry.summary} ${entry.kind} ${entry.provider ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [entries, query]);

  const selected = filtered.find((entry) => entry.id === selectedId) ?? filtered[0];

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        badge="Analysis history"
        title="Everything you have analyzed"
        description="Monitor reports, visual forensics, face intelligence, world briefings, and GTM refreshes are stored here automatically."
      />

      <WorkspaceSection>
        <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="p-5 md:p-6" glow>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">History</p>
                <p className="mt-1 text-xs text-white/45">
                  {filtered.length} saved run{filtered.length === 1 ? "" : "s"}
                </p>
              </div>
              <History className="h-7 w-7 text-sentra-cyan" />
            </div>
            <div className="relative mt-5">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-white/35" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search analyses, prompts, monitors..."
                className="pl-9"
              />
            </div>
            {loadMessage && (
              <p className="mt-4 rounded-2xl border border-amber-200/15 bg-amber-300/[0.04] p-3 text-xs leading-5 text-amber-100/70">
                {loadMessage}
              </p>
            )}
            <div className="mt-5 grid max-h-[68vh] gap-3 overflow-y-auto pr-1">
              {loading ? (
                <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-white/50">
                  Loading history...
                </p>
              ) : filtered.length ? (
                filtered.map((entry) => {
                  const Icon = kindIcons[entry.kind];
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedId(entry.id)}
                      className={`sentra-focus rounded-2xl border p-4 text-left transition ${
                        selected?.id === entry.id
                          ? "border-cyan-200/30 bg-cyan-300/10"
                          : "border-white/10 bg-white/[0.045]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="cyan">{historyKindLabel(entry.kind)}</Badge>
                        <span className="text-xs text-white/40">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-3 flex items-start gap-2">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-sentra-cyan" />
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-medium text-white">{entry.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/45">{entry.subtitle}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-white/45">
                  <p>No history yet.</p>
                  <p className="mt-2 text-xs text-white/38">
                    Run a monitor check, upload an image in{" "}
                    <Link href="/analyst?mode=vision" className="text-cyan-100 underline">
                      Visual Forensics
                    </Link>
                    , or refresh your dashboard briefing — results appear here automatically.
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card className="min-h-[680px] p-5 md:p-7" glow>
            {selected ? (
              <HistoryDetail entry={selected} />
            ) : (
              <div className="grid min-h-[560px] place-items-center text-center">
                <div>
                  <FileCheck2 className="mx-auto h-10 w-10 text-sentra-cyan" />
                  <h2 className="mt-4 text-xl font-semibold text-white">Select a saved analysis</h2>
                  <p className="mt-2 text-sm text-white/45">Pick any run from the left to review the full output.</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </WorkspaceSection>
    </WorkspacePage>
  );
}

function HistoryDetail({ entry }: { entry: WorkspaceHistoryEntry }) {
  if (entry.payload.kind === "image_forensics") {
    return (
      <div className="grid gap-4">
        <HistoryDetailHeader entry={entry} />
        <InvestigationResults
          report={entry.payload.report}
          onExport={() => undefined}
          onShare={() => undefined}
          onSpeak={() => undefined}
          speaking={false}
          voiceLoading={false}
        />
      </div>
    );
  }

  if (entry.payload.kind === "monitor_report") {
    const selected = entry.payload.report;
    return (
      <div className="grid gap-6">
        <HistoryDetailHeader entry={entry} />
        <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-start">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="risk">{selected.riskScore}% risk</Badge>
              <Badge variant="cyan">
                {selected.provider === "bright-data" ? "Live web evidence" : "Simulation evidence"}
              </Badge>
              <Badge variant={selected.hallucinationRisk === "low" ? "success" : "risk"}>
                {selected.hallucinationRisk} AI risk
              </Badge>
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-white">{selected.verdict}</h2>
            <p className="mt-2 text-sm leading-6 text-white/52">{selected.monitorRequirement}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">Confidence</p>
              <p className="mt-2 text-2xl font-semibold text-cyan-100">{selected.confidence}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">Sources</p>
              <p className="mt-2 text-2xl font-semibold text-white">{selected.evidenceSources.length}</p>
            </div>
          </div>
        </header>
        <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="grid gap-5">
            <ReportSection title="Situation" body={selected.situation} />
            <ReportSection title="Impact" body={selected.impact} />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">Action plan</p>
              <ul className="mt-3 grid gap-2">
                {selected.actionPlan.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-white/68"
                  >
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-200" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="grid content-start gap-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">Claim verification</p>
              <div className="mt-3 grid gap-2">
                {selected.verifiedClaims.map((claim) => {
                  const status = normalizeClaimStatus(claim.status);
                  return (
                    <div key={claim.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant={
                            status === "evidence-backed" ? "success" : status === "partial" ? "default" : "risk"
                          }
                        >
                          {claimStatusLabel(status)}
                        </Badge>
                        <span className="text-xs text-cyan-100/58">{claim.confidence}%</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/62">{claim.claim}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">Evidence table</p>
              <div className="mt-3 grid gap-2">
                {selected.evidenceSources.map((source) => (
                  <div key={source.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{source.publisher}</p>
                        <p className="mt-1 text-xs text-white/40">{source.freshness}</p>
                      </div>
                      <Badge variant={source.reliability >= 80 ? "success" : "default"}>
                        {source.reliability}%
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-white/50">{source.claimSupported}</p>
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-100"
                      >
                        Open source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (entry.payload.kind === "face_intelligence") {
    const report = entry.payload.report;
    return (
      <div className="grid gap-5">
        <HistoryDetailHeader entry={entry} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Authenticity", `${report.scores.authenticity}%`],
            ["AI generated", `${report.scores.aiGenerated}%`],
            ["Deepfake", `${report.scores.deepfake}%`],
            ["Readiness", `${report.scores.readiness}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
        <ReportSection title="Summary" body={report.summary} />
        <div className="grid gap-5 lg:grid-cols-2">
          <ListSection title="Authentic indicators" items={report.authenticReasons} />
          <ListSection title="Manipulation indicators" items={report.manipulationReasons} />
        </div>
        <ListSection title="Review notes" items={report.anomalies} />
      </div>
    );
  }

  if (entry.payload.kind === "world_engine") {
    const report = entry.payload.report;
    return (
      <div className="grid gap-5">
        <HistoryDetailHeader entry={entry} />
        <h2 className="text-3xl font-semibold text-white">{report.headline}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricTile label="Risk index" value={`${report.riskIndex}%`} />
          <MetricTile label="Confidence" value={`${report.confidence}%`} />
          <MetricTile label="Signals" value={String(report.signals.length)} />
        </div>
        <ReportSection title="Executive summary" body={report.executiveSummary} />
        <ReportSection title="Outlook" body={report.outlook} />
        <ReportSection title="Recommendation" body={report.recommendation} />
        {report.reasoning.length ? (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Reasoning stages</p>
            <ul className="mt-3 grid gap-2">
              {report.reasoning.map((stage) => (
                <li key={stage.stage} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm text-white/68">
                  <span className="font-medium text-white">{stage.stage}</span>
                  <span className="text-white/45"> · {stage.confidence}%</span>
                  <p className="mt-2 leading-6">{stage.finding}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  const { analysis, query } = entry.payload;
  return (
    <div className="grid gap-5">
      <HistoryDetailHeader entry={entry} />
      <p className="text-sm text-white/45">Query: {query}</p>
      <ReportSection title="Summary" body={analysis.summary} />
      <ListSection title="Risks" items={analysis.risks} />
      <ListSection title="Opportunities" items={analysis.opportunities} />
      <ListSection title="Recommendations" items={analysis.recommendations} />
      {analysis.signals.length ? (
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/35">Signals</p>
          <ul className="mt-3 grid gap-2">
            {analysis.signals.map((signal) => (
              <li key={signal.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm text-white/68">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white">{signal.title}</span>
                  <Badge variant={signal.severity === "critical" ? "risk" : "default"}>{signal.severity}</Badge>
                </div>
                <p className="mt-2 leading-6">{signal.summary}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function HistoryDetailHeader({ entry }: { entry: WorkspaceHistoryEntry }) {
  const Icon = kindIcons[entry.kind];
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
      <Icon className="h-5 w-5 text-sentra-cyan" />
      <Badge variant="cyan">{historyKindLabel(entry.kind)}</Badge>
      {entry.provider && <Badge variant="default">{entry.provider}</Badge>}
      <span className="text-xs text-white/40">{new Date(entry.createdAt).toLocaleString()}</span>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-center">
      <p className="text-xs uppercase tracking-[0.18em] text-white/35">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-white/35">{title}</p>
      <ul className="mt-3 grid gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-white/68"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportSection({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-white/35">{title}</p>
      <p className="mt-2 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-7 text-white/68">
        {body}
      </p>
    </div>
  );
}
