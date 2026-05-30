import type { ImageInvestigationReport } from "@/types/image-intelligence";
import type { ExecutiveIntelligenceReport, IntelligenceAnalysis } from "@/types/intelligence";
import type { WorldEngineReport } from "@/types/world-engine";

export type WorkspaceHistoryKind =
  | "monitor_report"
  | "image_forensics"
  | "face_intelligence"
  | "world_engine"
  | "gtm_briefing";

export type FaceIntelligenceReport = {
  id: string;
  createdAt: string;
  caseId: string;
  imageName: string;
  width: number;
  height: number;
  summary: string;
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
  faces: Array<{ id: string }>;
  authenticReasons: string[];
  manipulationReasons: string[];
  anomalies: string[];
  notes: string;
};

export type WorkspaceHistoryEntry = {
  id: string;
  kind: WorkspaceHistoryKind;
  title: string;
  subtitle: string;
  summary: string;
  createdAt: string;
  provider?: string;
  tags?: string[];
  preview?: {
    riskScore?: number;
    confidence?: number;
    status?: string;
    threatLevel?: string;
  };
  payload:
    | { kind: "monitor_report"; report: ExecutiveIntelligenceReport; monitorId?: string }
    | { kind: "image_forensics"; report: ImageInvestigationReport }
    | { kind: "face_intelligence"; report: FaceIntelligenceReport }
    | { kind: "world_engine"; report: WorldEngineReport }
    | { kind: "gtm_briefing"; query: string; analysis: IntelligenceAnalysis; provider?: string };
};
