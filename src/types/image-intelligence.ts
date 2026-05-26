export type ThreatLevel = "low" | "moderate" | "high" | "critical";
export type VerdictStatus = "Real" | "AI Generated" | "Inconclusive";

export type ImageFileEvidence = {
  name: string;
  type: string;
  size: number;
  lastModified?: number;
};

export type InvestigationScores = {
  aiGeneratedProbability: number;
  confidence: number;
  authenticity: number;
  risk: number;
  deepfakeProbability: number;
  manipulationProbability: number;
};

export type ImageInvestigationReport = {
  id: string;
  createdAt: string;
  prompt: string;
  status: VerdictStatus;
  threatLevel: ThreatLevel;
  recommendedAction: string;
  scores: InvestigationScores;
  summary: string;
  forensicAnalysis: string[];
  metadataInsights: string[];
  environmentEstimate: string;
  lightingAnalysis: string;
  manipulationAnalysis: string;
  objects: string[];
  brands: string[];
  emotionalContext: string;
  comparisonAnalysis?: string;
  limitations: string[];
  source: "openai-vision" | "demo";
  files: ImageFileEvidence[];
};
