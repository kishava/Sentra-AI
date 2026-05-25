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

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type BrightDataRequest = {
  query: string;
  targetUrl?: string;
  mode?: "serp" | "unlocker" | "scraper" | "browser";
};
