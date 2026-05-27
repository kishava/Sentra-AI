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
  logStep({ category: "SOCIAL", stage: "Social monitoring", message: "Monitoring X, Reddit, LinkedIn, and industry forums for narrative drift...", source: "Social graph" }),
  logStep({ category: "ANALYSIS", stage: "Intelligence graph", message: "Generating intelligence graph and entity relationship clusters...", source: "Sentra graph engine" }),
  logStep({ category: "AI", stage: "Strategic synthesis", message: "Synthesizing strategic report with enterprise risk framing...", source: "OpenAI Responses", confidence: 72 }),
  logStep({ category: "SIGNAL", stage: "Signal classification", message: "Classifying competitor, pricing, and sentiment signals...", confidence: 78 }),
  logStep({ category: "COMPLETE", stage: "Complete", message: "Strategic briefing ready for delivery.", level: "success", confidence: 84 }),
];

export const visionPipelineScript: PipelineLogStep[] = [
  logStep({ category: "INTAKE", stage: "Evidence intake", message: "Staging visual evidence and normalizing capture metadata...", delayMs: 0 }),
  logStep({ category: "VISION", stage: "Forensic scan", message: "Running forensic authenticity checks across pixel and compression layers...", source: "Vision analyst" }),
  logStep({ category: "ANALYSIS", stage: "Manipulation model", message: "Scoring manipulation probability, deepfake indicators, and lighting consistency...", source: "Forensics model" }),
  logStep({ category: "AI", stage: "Reasoning report", message: "Generating AI reasoning report with recommended executive action...", source: "OpenAI Vision", confidence: 68 }),
  logStep({ category: "RISK", stage: "Risk scoring", message: "Computing enterprise risk score and threat posture...", confidence: 74 }),
  logStep({ category: "COMPLETE", stage: "Complete", message: "Investigation dossier compiled.", level: "success", confidence: 81 }),
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
