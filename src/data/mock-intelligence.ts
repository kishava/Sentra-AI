import type { IntelligenceAnalysis, IntelligenceSignal } from "@/types/intelligence";

export const signalStream: IntelligenceSignal[] = [
  {
    id: "sig-001",
    title: "Tesla adjusted Model Y leasing incentives in California",
    source: "Bright Data SERP + pricing monitor",
    summary: "Detected a 7.8% effective discount increase across regional landing pages.",
    category: "pricing",
    severity: "high",
    confidence: 0.91,
    timestamp: "3 min ago",
  },
  {
    id: "sig-002",
    title: "AI infrastructure hiring spike in Singapore",
    source: "Hiring signal crawler",
    summary: "32 new roles posted by funded AI startups across inference, MLOps, and sales engineering.",
    category: "hiring",
    severity: "medium",
    confidence: 0.86,
    timestamp: "11 min ago",
  },
  {
    id: "sig-003",
    title: "Negative sentiment lift around cloud billing",
    source: "Social mention monitor",
    summary: "Complaint volume rose 18% after new enterprise pricing screenshots circulated.",
    category: "sentiment",
    severity: "critical",
    confidence: 0.88,
    timestamp: "18 min ago",
  },
  {
    id: "sig-004",
    title: "Competitor launched autonomous procurement agent",
    source: "Website diff + press monitor",
    summary: "New product copy emphasizes workflow automation and invoice intelligence.",
    category: "competitor",
    severity: "high",
    confidence: 0.94,
    timestamp: "24 min ago",
  },
];

export const demoAnalysis: IntelligenceAnalysis = {
  summary:
    "Sentra detected fast-moving pricing, hiring, and sentiment shifts across the live web. The strongest opportunity is to position autonomous monitoring around cost control and competitive response speed.",
  risks: [
    "Competitor messaging is converging on autonomous agent workflows.",
    "Pricing volatility may trigger procurement scrutiny in enterprise accounts.",
    "Negative sentiment around cloud billing could bleed into adjacent AI platform narratives.",
  ],
  opportunities: [
    "Launch a pricing intelligence briefing for strategic accounts.",
    "Target Singapore AI infrastructure startups with partnership outreach.",
    "Publish trust content around transparent usage controls and alert governance.",
  ],
  recommendations: [
    "Open a critical watchlist for Tesla pricing and adjacent EV incentives.",
    "Brief sales leadership with a competitor battlecard within 24 hours.",
    "Escalate cloud billing sentiment to product marketing for counter-positioning.",
  ],
  confidenceScore: 0.89,
  signals: signalStream,
};

export const trendData = [
  { name: "Mon", market: 62, sentiment: 74, risk: 28 },
  { name: "Tue", market: 68, sentiment: 70, risk: 35 },
  { name: "Wed", market: 78, sentiment: 76, risk: 44 },
  { name: "Thu", market: 73, sentiment: 82, risk: 39 },
  { name: "Fri", market: 86, sentiment: 79, risk: 52 },
  { name: "Sat", market: 91, sentiment: 84, risk: 47 },
  { name: "Sun", market: 96, sentiment: 88, risk: 61 },
];

export const competitorData = [
  { name: "Tesla", share: 38, velocity: 82 },
  { name: "Rivian", share: 18, velocity: 56 },
  { name: "BYD", share: 31, velocity: 74 },
  { name: "Lucid", share: 13, velocity: 43 },
];

export const briefingCards = [
  "Competitor product launch probability increased to 72%.",
  "Hiring velocity suggests three AI startups are preparing enterprise GTM expansion.",
  "Market conversation shifted from experimentation to measurable cost reduction.",
  "Sentiment risk is concentrated in pricing, procurement, and data governance threads.",
];
