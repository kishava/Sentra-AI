import type { ImageInvestigationReport } from "@/types/image-intelligence";
import type { ExecutiveIntelligenceReport, IntelligenceAnalysis } from "@/types/intelligence";
import type {
  FaceIntelligenceReport,
  WorkspaceHistoryEntry,
  WorkspaceHistoryKind,
} from "@/types/workspace-history";
import type { WorldEngineReport } from "@/types/world-engine";

export const WORKSPACE_HISTORY_KEY = "sentra-workspace-history";
export const WORKSPACE_HISTORY_EVENT = "sentra:workspace-history-updated";

const LEGACY_REPORTS_KEY = "sentra-intelligence-reports";
const LEGACY_IMAGE_KEY = "sentra-image-investigations";
const LEGACY_FACE_KEY = "sentra-face-intelligence";
const MIGRATION_FLAG = "sentra-workspace-history-migrated-v1";

const MAX_ENTRIES = 120;

function readRawList(): WorkspaceHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(WORKSPACE_HISTORY_KEY) || "[]") as WorkspaceHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(WORKSPACE_HISTORY_KEY);
    return [];
  }
}

function writeRawList(entries: WorkspaceHistoryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WORKSPACE_HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  window.dispatchEvent(new CustomEvent(WORKSPACE_HISTORY_EVENT));
}

export function entryFromMonitorReport(report: ExecutiveIntelligenceReport, monitorId?: string): WorkspaceHistoryEntry {
  return {
    id: report.id,
    kind: "monitor_report",
    title: report.verdict,
    subtitle: report.monitorRequirement,
    summary: report.situation.slice(0, 280),
    createdAt: report.generatedAt,
    provider: report.provider,
    tags: ["Monitor"],
    preview: { riskScore: report.riskScore, confidence: report.confidence },
    payload: { kind: "monitor_report", report, monitorId },
  };
}

function entryFromImageReport(report: ImageInvestigationReport): WorkspaceHistoryEntry {
  return {
    id: report.id,
    kind: "image_forensics",
    title: `${report.status} · ${report.prompt.slice(0, 72)}`,
    subtitle: report.files.map((file) => file.name).join(", ") || "Visual evidence",
    summary: report.summary,
    createdAt: report.createdAt,
    provider: report.source,
    tags: ["Visual forensics"],
    preview: {
      confidence: report.scores.confidence,
      status: report.status,
      threatLevel: report.threatLevel,
    },
    payload: { kind: "image_forensics", report },
  };
}

function entryFromFaceReport(report: FaceIntelligenceReport): WorkspaceHistoryEntry {
  return {
    id: report.id,
    kind: "face_intelligence",
    title: `${report.imageName} · ${report.scores.authenticity}% authentic`,
    subtitle: report.caseId,
    summary: report.summary,
    createdAt: report.createdAt,
    tags: ["Face intelligence"],
    preview: {
      confidence: report.scores.authenticity,
      status: report.scores.aiGenerated > 55 ? "AI signal elevated" : "Within normal range",
    },
    payload: { kind: "face_intelligence", report },
  };
}

function entryFromWorldReport(report: WorldEngineReport): WorkspaceHistoryEntry {
  return {
    id: report.id,
    kind: "world_engine",
    title: report.headline,
    subtitle: report.query,
    summary: report.executiveSummary.slice(0, 280),
    createdAt: report.generatedAt,
    provider: report.provider,
    tags: ["World Engine"],
    preview: { riskScore: report.riskIndex, confidence: report.confidence },
    payload: { kind: "world_engine", report },
  };
}

function entryFromBriefing(query: string, analysis: IntelligenceAnalysis, provider?: string): WorkspaceHistoryEntry {
  const id = `briefing-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  return {
    id,
    kind: "gtm_briefing",
    title: analysis.summary.slice(0, 96),
    subtitle: query,
    summary: analysis.summary,
    createdAt,
    provider,
    tags: ["GTM briefing"],
    preview: { confidence: Math.round((analysis.confidenceScore ?? 0) * 100) },
    payload: { kind: "gtm_briefing", query, analysis, provider },
  };
}

function migrateLegacyEntries(existing: WorkspaceHistoryEntry[]) {
  if (typeof window === "undefined") return existing;
  if (window.localStorage.getItem(MIGRATION_FLAG) === "1") return existing;

  const merged = [...existing];
  const seen = new Set(existing.map((entry) => entry.id));

  try {
    const monitorReports = JSON.parse(
      window.localStorage.getItem(LEGACY_REPORTS_KEY) || "[]",
    ) as ExecutiveIntelligenceReport[];
    for (const report of monitorReports) {
      if (!report?.id || seen.has(report.id)) continue;
      merged.push(entryFromMonitorReport(report));
      seen.add(report.id);
    }
  } catch {
    // ignore
  }

  try {
    const imageReports = JSON.parse(
      window.localStorage.getItem(LEGACY_IMAGE_KEY) || "[]",
    ) as ImageInvestigationReport[];
    for (const report of imageReports) {
      if (!report?.id || seen.has(report.id)) continue;
      merged.push(entryFromImageReport(report));
      seen.add(report.id);
    }
  } catch {
    // ignore
  }

  try {
    const faceReports = JSON.parse(
      window.localStorage.getItem(LEGACY_FACE_KEY) || "[]",
    ) as FaceIntelligenceReport[];
    for (const report of faceReports) {
      if (!report?.id || seen.has(report.id)) continue;
      merged.push(entryFromFaceReport(report));
      seen.add(report.id);
    }
  } catch {
    // ignore
  }

  window.localStorage.setItem(MIGRATION_FLAG, "1");
  return merged.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, MAX_ENTRIES);
}

export function listWorkspaceHistory(): WorkspaceHistoryEntry[] {
  const migrated = migrateLegacyEntries(readRawList());
  if (migrated.length !== readRawList().length || migrated.some((entry, index) => entry.id !== readRawList()[index]?.id)) {
    writeRawList(migrated);
  }
  return migrated;
}

export function appendWorkspaceHistory(entry: WorkspaceHistoryEntry) {
  const current = listWorkspaceHistory();
  const next = [entry, ...current.filter((item) => item.id !== entry.id)].slice(0, MAX_ENTRIES);
  writeRawList(next);
  return entry;
}

export function clearWorkspaceHistory() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(WORKSPACE_HISTORY_KEY);
  window.localStorage.removeItem(MIGRATION_FLAG);
  [LEGACY_REPORTS_KEY, LEGACY_IMAGE_KEY, LEGACY_FACE_KEY].forEach((key) => window.localStorage.removeItem(key));
  window.dispatchEvent(new CustomEvent(WORKSPACE_HISTORY_EVENT));
}

export function historyKindLabel(kind: WorkspaceHistoryKind) {
  switch (kind) {
    case "monitor_report":
      return "Monitor";
    case "image_forensics":
      return "Visual forensics";
    case "face_intelligence":
      return "Face intelligence";
    case "world_engine":
      return "World Engine";
    case "gtm_briefing":
      return "GTM briefing";
    default:
      return "Analysis";
  }
}

export function recordMonitorReportHistory(report: ExecutiveIntelligenceReport, monitorId?: string) {
  return appendWorkspaceHistory(entryFromMonitorReport(report, monitorId));
}

export function recordImageForensicsHistory(report: ImageInvestigationReport) {
  return appendWorkspaceHistory(entryFromImageReport(report));
}

export function recordFaceIntelligenceHistory(report: FaceIntelligenceReport) {
  return appendWorkspaceHistory(entryFromFaceReport(report));
}

export function recordWorldEngineHistory(report: WorldEngineReport) {
  return appendWorkspaceHistory(entryFromWorldReport(report));
}

export function recordGtmBriefingHistory(query: string, analysis: IntelligenceAnalysis, provider?: string) {
  return appendWorkspaceHistory(entryFromBriefing(query, analysis, provider));
}

export function mergeHistoryEntries(local: WorkspaceHistoryEntry[], server: WorkspaceHistoryEntry[]) {
  const seen = new Set(local.map((entry) => entry.id));
  const merged = [...local];
  for (const entry of server) {
    if (!entry?.id || seen.has(entry.id)) continue;
    merged.push(entry);
    seen.add(entry.id);
  }
  return merged.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function mergeServerMonitorReports(
  local: WorkspaceHistoryEntry[],
  serverReports: Array<{ id: string; report: ExecutiveIntelligenceReport; created_at?: string }>,
) {
  const serverEntries = serverReports
    .filter((row) => row.report?.id)
    .map((row) => entryFromMonitorReport(row.report, undefined));
  return mergeHistoryEntries(local, serverEntries);
}
