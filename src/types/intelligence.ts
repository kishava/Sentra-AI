export type Severity = "low" | "medium" | "high" | "critical";

export type IntelligenceSignal = {
  id: string;
  title: string;
  source: string;
  summary: string;
  category: "competitor" | "market" | "risk" | "pricing" | "hiring" | "sentiment";
  severity: Severity;
  confidence: number;
  timestamp: string;
};

export type IntelligenceAnalysis = {
  summary: string;
  risks: string[];
  opportunities: string[];
  recommendations: string[];
  confidenceScore: number;
  signals: IntelligenceSignal[];
};

export type EvidenceSource = {
  id: string;
  title: string;
  url?: string;
  publisher: string;
  freshness: string;
  reliability: number;
  claimSupported: string;
};

export type VerifiedClaim = {
  id: string;
  claim: string;
  status: "verified" | "partial" | "unsupported";
  confidence: number;
  sourceIds: string[];
};

export type ExecutiveIntelligenceReport = {
  id: string;
  monitorRequirement: string;
  generatedAt: string;
  provider: "bright-data" | "demo";
  verdict: string;
  riskScore: number;
  confidence: number;
  situation: string;
  impact: string;
  actionPlan: string[];
  watchItems: string[];
  evidenceSources: EvidenceSource[];
  verifiedClaims: VerifiedClaim[];
  observedFacts: string[];
  forecasts: string[];
  hallucinationRisk: "low" | "medium" | "high";
};

export type ChatProvider =
  | "aiml-search"
  | "aiml-bright-data"
  | "aiml-document"
  | "aiml-document-bright-data"
  | "featherless-document"
  | "featherless-document-bright-data"
  | "openai-web-search"
  | "bright-data-openai"
  | "gtm-agent";

export type ChatDocumentAttachment = {
  fileName: string;
  mimeType: string;
  charCount?: number;
  truncated?: boolean;
  ocrUsed?: boolean;
};

export type ChatDocumentEvidence = ChatDocumentAttachment & {
  text: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  provider?: ChatProvider;
  attachment?: ChatDocumentAttachment;
};

export type BrightDataRequest = {
  query: string;
  targetUrl?: string;
  mode?: "serp" | "unlocker" | "scraper" | "browser";
};

export type MonitorCategory = IntelligenceSignal["category"];

export type MonitorIntent = {
  normalizedRequirement: string;
  category: "any" | MonitorCategory;
  minimumSeverity: Severity;
  keywords: string[];
  rationale: string;
  confidence: number;
  provider: "aiml" | "featherless" | "openai" | "heuristic";
};
