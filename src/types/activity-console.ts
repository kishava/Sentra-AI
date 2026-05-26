import type { ReasoningStage, WorldEngineReport, WorldSource } from "@/types/world-engine";

export type ActivityCategory =
  | "INTAKE"
  | "ROUTER"
  | "SERP"
  | "SOURCE"
  | "AI"
  | "SIGNAL"
  | "MAP"
  | "CHART"
  | "VOICE"
  | "RISK"
  | "COMPLETE"
  | "SYSTEM";

export type ActivityLevel = "info" | "success" | "warning" | "error";
export type StreamStatus = "idle" | "connecting" | "active" | "success" | "error" | "unavailable";

export type ActivityLog = {
  id: string;
  timestamp: string;
  category: ActivityCategory;
  message: string;
  level: ActivityLevel;
  stage: string;
  source?: string;
  confidence?: number;
  latencyMs?: number;
};

export type CollectionSource = {
  id: string;
  name: string;
  channel: "api" | "web" | "source";
  status: StreamStatus;
  detail: string;
  latencyMs?: number;
  confidence?: number;
  url?: string;
};

export type PipelineHealth = {
  status: "running" | "complete" | "degraded" | "failed";
  stage: string;
  events: number;
  activeSources: number;
  completedSources: number;
  apiLatencyMs?: number;
  elapsedMs: number;
};

export type ActivityStreamEvent =
  | { type: "log"; log: ActivityLog }
  | { type: "source"; source: CollectionSource }
  | { type: "health"; health: PipelineHealth }
  | { type: "thought"; thought: ReasoningStage }
  | { type: "verified_sources"; sources: WorldSource[] }
  | { type: "report"; report: WorldEngineReport }
  | { type: "complete" }
  | { type: "error"; message: string };
