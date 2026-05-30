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
  /** Present when signal originated from snapshot diff */
  changeId?: string;
  oldValue?: string;
  newValue?: string;
  sourceUrl?: string;
};

export type IntelligenceAnalysis = {
  summary: string;
  risks: string[];
  opportunities: string[];
  recommendations: string[];
  confidenceScore: number;
  signals: IntelligenceSignal[];
};

export type BrightDataCollectionMode = "serp" | "unlocker" | "scraper" | "browser" | "mcp";

export type EvidenceSource = {
  id: string;
  title: string;
  url?: string;
  publisher: string;
  freshness: string;
  reliability: number;
  claimSupported: string;
  collectedAt?: string;
  brightDataMode?: BrightDataCollectionMode;
  excerpt?: string;
};

export type ClaimSourceRecord = {
  sourceId: string;
  url?: string;
  excerpt: string;
  collectedAt: string;
  brightDataMode?: BrightDataCollectionMode;
  verificationStatus: ClaimVerificationStatus;
};

export type ClaimVerificationStatus = "evidence-backed" | "partial" | "unsupported";

/** @deprecated Use ClaimVerificationStatus — kept for legacy report JSON */
export type LegacyClaimStatus = "verified" | "partial" | "unsupported";

export type VerifiedClaim = {
  id: string;
  claim: string;
  status: ClaimVerificationStatus;
  confidence: number;
  sourceIds: string[];
  sourceRecords: ClaimSourceRecord[];
};

export type PageSnapshot = {
  id: string;
  monitorId?: string;
  url: string;
  collectedAt: string;
  contentHash: string;
  fields: Record<string, string>;
  rawExcerpt?: string;
  brightDataMode?: BrightDataCollectionMode;
};

export type DetectedChange = {
  id: string;
  monitorId?: string;
  field: string;
  oldValue: string;
  newValue: string;
  sourceUrl: string;
  detectedAt: string;
  impact: string;
  severity: Severity;
  category: IntelligenceSignal["category"];
};

export type MonitorTimelineEventType =
  | "change_detected"
  | "check_complete"
  | "report_generated"
  | "workflow_triggered"
  | "signal_matched";

export type MonitorTimelineEvent = {
  id: string;
  type: MonitorTimelineEventType;
  timestamp: string;
  monitorId?: string;
  monitorRequirement?: string;
  summary: string;
  severity?: Severity;
  affectedAccounts?: string[];
  changeId?: string;
  reportId?: string;
  metadata?: Record<string, string>;
};

export type BusinessMetrics = {
  monitoredCompetitors: number;
  pagesTracked: number;
  changesThisWeek: number;
  analystHoursSaved: number;
  strategicAccountsAffected: number;
  activeMonitors: number;
  reportsGenerated: number;
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
  detectedChanges?: DetectedChange[];
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
  /** One sentence, plain-language explanation for the user */
  plainSummary?: string;
  confidence: number;
  provider: "aiml" | "featherless" | "openai" | "heuristic";
};

/** Normalize legacy claim status values from stored reports */
export function normalizeClaimStatus(status: string): ClaimVerificationStatus {
  if (status === "verified" || status === "evidence-backed") return "evidence-backed";
  if (status === "partial") return "partial";
  return "unsupported";
}

export function claimStatusLabel(status: ClaimVerificationStatus | string): string {
  const normalized = normalizeClaimStatus(status);
  if (normalized === "evidence-backed") return "Evidence-backed";
  if (normalized === "partial") return "Partial";
  return "Unsupported";
}
