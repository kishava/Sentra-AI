import type { ActivityCategory, ActivityLog, ActivityLevel } from "@/types/activity-console";

export type PipelineLogStep = {
  category: ActivityCategory;
  message: string;
  stage: string;
  delayMs: number;
  level?: ActivityLevel;
  source?: string;
  confidence?: number;
};

function logStep(step: Omit<PipelineLogStep, "delayMs"> & { delayMs?: number }): PipelineLogStep {
  return { ...step, delayMs: step.delayMs ?? 520 };
}

export const chatPipelineScript: PipelineLogStep[] = [
  logStep({ category: "INTAKE", stage: "Request intake", message: "Connecting to Bright Data services...", delayMs: 0 }),
  logStep({ category: "SERP", stage: "Evidence collection", message: "Scanning Google search ecosystem for corroborating signals...", source: "Bright Data SERP" }),
  logStep({ category: "UNLOCKER", stage: "Protected sources", message: "Parsing protected publisher endpoints with Web Unlocker...", source: "Bright Data Unlocker" }),
  logStep({ category: "SOCIAL", stage: "Narrative correlation", message: "Correlating themes from SERP and collected page evidence...", source: "Sentra graph engine" }),
  logStep({ category: "ANALYSIS", stage: "Intelligence graph", message: "Generating intelligence graph and entity relationship clusters...", source: "Sentra graph engine" }),
  logStep({ category: "AI", stage: "Strategic synthesis", message: "Synthesizing strategic report with enterprise risk framing...", source: "AI/ML API" }),
  logStep({ category: "SIGNAL", stage: "Signal classification", message: "Classifying competitor, pricing, and sentiment signals..." }),
  logStep({ category: "COMPLETE", stage: "Complete", message: "Strategic briefing ready for delivery.", level: "success" }),
];

export const visionPipelineScript: PipelineLogStep[] = [
  logStep({ category: "INTAKE", stage: "Evidence intake", message: "Staging visual evidence and normalizing capture metadata...", delayMs: 0 }),
  logStep({ category: "VISION", stage: "Forensic scan", message: "Running forensic authenticity checks across pixel and compression layers...", source: "Vision analyst" }),
  logStep({ category: "ANALYSIS", stage: "Manipulation model", message: "Scoring manipulation probability, deepfake indicators, and lighting consistency...", source: "Forensics model" }),
  logStep({ category: "AI", stage: "Reasoning report", message: "Generating AI reasoning report with recommended executive action...", source: "AI/ML API Vision" }),
  logStep({ category: "RISK", stage: "Risk scoring", message: "Computing enterprise risk score and threat posture..." }),
  logStep({ category: "COMPLETE", stage: "Complete", message: "Investigation dossier compiled.", level: "success" }),
];

export function createPipelineLog(step: PipelineLogStep): ActivityLog {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    category: step.category,
    message: step.message,
    level: step.level ?? "info",
    stage: step.stage,
    source: step.source,
    confidence: step.confidence,
  };
}
