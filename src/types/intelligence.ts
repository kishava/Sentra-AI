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

export type ChatProvider = "openai-web-search" | "bright-data-openai";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  provider?: ChatProvider;
};

export type BrightDataRequest = {
  query: string;
  targetUrl?: string;
  mode?: "serp" | "unlocker" | "scraper" | "browser";
};
