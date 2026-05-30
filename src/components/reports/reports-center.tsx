"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, FileCheck2, Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { WorkspacePage, WorkspacePageHeader, WorkspaceSection } from "@/components/workspace/workspace-page";
import type { ExecutiveIntelligenceReport } from "@/types/intelligence";

const REPORTS_STORAGE_KEY = "sentra-intelligence-reports";

type DbReport = {
  id: string;
  report: ExecutiveIntelligenceReport;
  created_at: string;
};

function isDbReport(value: DbReport | ExecutiveIntelligenceReport): value is DbReport {
  return "report" in value;
}

function normalizeReports(items?: Array<DbReport | ExecutiveIntelligenceReport>) {
  return (items ?? []).map((item) => (isDbReport(item) ? item.report : item));
}

function readLocalReports() {
  try {
    return JSON.parse(window.localStorage.getItem(REPORTS_STORAGE_KEY) || "[]") as ExecutiveIntelligenceReport[];
  } catch {
    return [];
  }
}

export function ReportsCenter() {
  const [reports, setReports] = useState<ExecutiveIntelligenceReport[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadMessage, setLoadMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      try {
        const response = await fetch("/api/reports");
        const data = (await response.json().catch(() => ({}))) as {
          reports?: Array<DbReport | ExecutiveIntelligenceReport>;
          schemaReady?: boolean;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error || "Reports could not be loaded.");
        }
        const serverReports = normalizeReports(data.reports);
        const localReports = readLocalReports();
        const merged = [...serverReports, ...localReports].filter((report, index, all) =>
          all.findIndex((item) => item.id === report.id) === index,
        );
        if (!cancelled) {
          setReports(merged);
          setSelectedId(merged[0]?.id);
          setLoadMessage(data.schemaReady === false ? "Cloud report storage is not ready yet, so local reports are shown." : "");
        }
      } catch (error) {
        const localReports = readLocalReports();
        if (!cancelled) {
          setReports(localReports);
          setSelectedId(localReports[0]?.id);
          setLoadMessage(error instanceof Error ? error.message : "Reports could not be loaded.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadReports();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return reports;
    return reports.filter((report) =>
      `${report.verdict} ${report.monitorRequirement} ${report.situation} ${report.provider}`.toLowerCase().includes(needle),
    );
  }, [query, reports]);
  const selected = filtered.find((report) => report.id === selectedId) ?? filtered[0];

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        badge="Reports center"
        title="Verified intelligence reports"
        description="Executive briefs generated from monitor checks and Bright Data evidence. Search by verdict, monitor requirement, or risk score."
      />

      <WorkspaceSection>
    <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card className="p-5 md:p-6" glow>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">Report library</p>
            <p className="mt-1 text-xs text-white/45">{filtered.length} report{filtered.length === 1 ? "" : "s"}</p>
          </div>
          <FileCheck2 className="h-7 w-7 text-sentra-cyan" />
        </div>
        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-white/35" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reports, monitors, risks..."
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
            <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-white/50">Loading reports...</p>
          ) : filtered.length ? (
            filtered.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedId(report.id)}
                className={`sentra-focus rounded-2xl border p-4 text-left transition ${
                  selected?.id === report.id ? "border-cyan-200/30 bg-cyan-300/10" : "border-white/10 bg-white/[0.045]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={report.hallucinationRisk === "low" ? "success" : "risk"}>
                    {report.riskScore}% risk
                  </Badge>
                  <span className="text-xs text-white/40">{new Date(report.generatedAt).toLocaleString()}</span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm font-medium text-white">{report.verdict}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/45">{report.monitorRequirement}</p>
              </button>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-white/45">
              No reports yet. Run a monitor check from Alerts to generate the first verified report.
            </p>
          )}
        </div>
      </Card>

      <Card className="min-h-[680px] p-5 md:p-7" glow>
        {selected ? (
          <div className="grid gap-6">
            <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-start">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="risk">{selected.riskScore}% risk</Badge>
                  <Badge variant="cyan">{selected.provider === "bright-data" ? "Live web evidence" : "Simulation evidence"}</Badge>
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
                      <li key={item} className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-white/68">
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
                    {selected.verifiedClaims.map((claim) => (
                      <div key={claim.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={claim.status === "verified" ? "success" : claim.status === "partial" ? "default" : "risk"}>
                            {claim.status}
                          </Badge>
                          <span className="text-xs text-cyan-100/58">{claim.confidence}%</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-white/62">{claim.claim}</p>
                      </div>
                    ))}
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
                          <Badge variant={source.reliability >= 80 ? "success" : "default"}>{source.reliability}%</Badge>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-white/50">{source.claimSupported}</p>
                        {source.url && (
                          <a href={source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-100">
                            Open source <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200/15 bg-amber-300/[0.04] p-4">
                  <div className="flex gap-2 text-sm font-medium text-amber-100">
                    <AlertTriangle className="h-4 w-4" />
                    Analyst caution
                  </div>
                  <p className="mt-2 text-xs leading-5 text-amber-100/65">
                    Forecasts and risk scores are decision support, not final facts. Review source evidence before external action.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid min-h-[560px] place-items-center text-center">
            <div>
              <ShieldCheck className="mx-auto h-10 w-10 text-sentra-cyan" />
              <h2 className="mt-4 text-xl font-semibold text-white">No report selected</h2>
              <p className="mt-2 text-sm text-white/45">Generate a monitor report to review verified evidence here.</p>
            </div>
          </div>
        )}
      </Card>
    </div>
      </WorkspaceSection>
    </WorkspacePage>
  );
}

function ReportSection({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-white/35">{title}</p>
      <p className="mt-2 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-7 text-white/68">{body}</p>
    </div>
  );
}
