export type WorldDomain = "geopolitics" | "ai" | "finance" | "cybersecurity" | "climate" | "markets";
export type WorldSeverity = "low" | "medium" | "high" | "critical";
export type EntityKind = "country" | "company" | "government" | "technology" | "conflict" | "market" | "trend";
export type VisualizationKind = "globe" | "network" | "forecast" | "sentiment" | "radar" | "scenario";

export type WorldMapSignal = {
  id: string;
  title: string;
  region: string;
  latitude: number;
  longitude: number;
  severity: WorldSeverity;
  domain: WorldDomain;
  sentiment: number;
  intensity: number;
  summary: string;
};

export type IntelligenceNode = {
  id: string;
  label: string;
  kind: EntityKind;
  influence: number;
  risk: number;
};

export type IntelligenceLink = {
  source: string;
  target: string;
  strength: number;
  rationale: string;
};

export type ForecastPath = {
  horizon: string;
  title: string;
  probability: number;
  impact: number;
  direction: "positive" | "negative" | "mixed";
  rationale: string;
};

export type SignalPulse = {
  domain: WorldDomain;
  intensity: number;
  change: number;
  sentiment: number;
};

export type ReasoningStage = {
  stage: string;
  finding: string;
  confidence: number;
};

export type ScenarioImpact = {
  stage: string;
  sector: string;
  effect: string;
  magnitude: number;
  probability: number;
};

export type WorldSource = {
  title: string;
  url: string;
};

export type WorldEngineReport = {
  id: string;
  query: string;
  generatedAt: string;
  provider: "openai-live" | "bright-data-openai" | "demo";
  scenarioMode: boolean;
  headline: string;
  executiveSummary: string;
  riskIndex: number;
  confidence: number;
  outlook: string;
  recommendation: string;
  visualizations: VisualizationKind[];
  signals: WorldMapSignal[];
  nodes: IntelligenceNode[];
  links: IntelligenceLink[];
  forecasts: ForecastPath[];
  pulse: SignalPulse[];
  reasoning: ReasoningStage[];
  scenario: ScenarioImpact[];
  briefings: {
    quick: string;
    executive: string;
    deep: string;
  };
  sources: WorldSource[];
  limitations: string[];
};
