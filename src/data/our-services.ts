import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  Bot,
  Camera,
  DatabaseZap,
  Globe2,
  LayoutDashboard,
  ScanSearch,
  Settings,
} from "lucide-react";

export type SentraService = {
  id: string;
  title: string;
  tagline: string;
  /** Short public overview — visible without signing in. */
  summary: string;
  /** Fuller description — shown in guides after sign-in. */
  description: string;
  href: string;
  icon: LucideIcon;
  highlights: string[];
  steps: string[];
};

export const sentraServices: SentraService[] = [
  {
    id: "dashboard",
    title: "Intelligence Dashboard",
    tagline: "Command overview",
    summary: "Live signals, market charts, daily AI briefings, and risk summaries in one executive view.",
    description:
      "Executive view of live signals, market movement, risk posture, and AI recommendations — with honest Live vs Sample labels.",
    href: "/dashboard",
    icon: LayoutDashboard,
    highlights: ["Daily briefing", "Live signals", "Trend charts", "Risk summary"],
    steps: [
      "Open Dashboard from the sidebar.",
      "Tap Refresh briefing to pull Bright Data evidence and generate a summary.",
      "Check the badge: Live · Bright Data means real web data; Sample means demo evidence.",
      "Drill into Live Signals when something needs follow-up in Chat or Alerts.",
    ],
  },
  {
    id: "chat",
    title: "AI Chat",
    tagline: "Research assistant",
    summary: "Ask business questions in plain language with live web answers, voice, and competitor monitoring.",
    description:
      "Ask questions in plain language. Sentra uses AI/ML API live search by default and Bright Data when you monitor competitors, pricing, or paste a URL.",
    href: "/chat",
    icon: Bot,
    highlights: ["Live web answers", "Bright Data triggers", "Voice playback", "Prompt shortcuts"],
    steps: [
      "Open AI Chat from the sidebar.",
      "Try: Track competitor pricing changes or paste a competitor HTTPS URL.",
      "Use the microphone to dictate; use the speaker icon to hear replies.",
      "Watch the provider badge on answers (Bright Data + AIML vs live search only).",
    ],
  },
  {
    id: "alerts",
    title: "Alerts & Monitors",
    tagline: "Automated watching",
    summary: "Describe what to watch; Sentra interprets intent and checks the live web for matching signals.",
    description:
      "Describe what to watch in natural language. AI interprets category and severity; Check now runs Bright Data + matching signals.",
    href: "/alerts",
    icon: BellRing,
    highlights: ["AI intent parsing", "Check now", "Browser alerts", "AI reports"],
    steps: [
      "Open Alerts from the sidebar.",
      "Type what you want monitored (e.g. competitor product launches in APAC).",
      "Review the AI interpretation, then save the monitor.",
      "Click Check now for a live Bright Data pass; open reports when matches appear.",
    ],
  },
  {
    id: "analyst",
    title: "AI Analyst",
    tagline: "Deep investigations",
    summary: "Structured investigations with evidence review, confidence scoring, and recommended actions.",
    description:
      "Structured workspace for evidence review, situation analysis, and recommended next steps when a signal needs more than a chat reply.",
    href: "/analyst",
    icon: ScanSearch,
    highlights: ["Investigation prompts", "Evidence cards", "Confidence scoring", "Action plans"],
    steps: [
      "Open AI Analyst from the sidebar.",
      "Describe the situation or paste evidence you need analyzed.",
      "Review findings, risks, and recommended actions.",
      "Escalate to a monitor in Alerts if the topic needs ongoing tracking.",
    ],
  },
  {
    id: "world-engine",
    title: "World Engine",
    tagline: "Global intelligence studio",
    summary: "3D globe, timelines, and narrated briefings for macro market and geopolitical questions.",
    description:
      "Cinematic globe, relationship graphs, timelines, and narrated briefings for macro market and geopolitical questions.",
    href: "/analyst",
    icon: Globe2,
    highlights: ["3D globe", "Scenario simulation", "Activity console", "World Pulse mode"],
    steps: [
      "Open AI Analyst — World Engine is the primary studio view.",
      "Enter a global question (e.g. What is shifting in enterprise AI regulation?).",
      "Explore visualizations and the live activity console as evidence streams in.",
      "Use World Pulse for a full-screen briefing presentation.",
    ],
  },
  {
    id: "forensics",
    title: "Visual Forensics",
    tagline: "Image intelligence",
    summary: "Upload images for authenticity indicators, scene context, and investigation reports.",
    description:
      "Upload visual evidence for authenticity indicators, scene context, and investigation notes — scores are guidance, not legal proof.",
    href: "/analyst?mode=vision",
    icon: Camera,
    highlights: ["Image upload", "Authenticity signals", "PDF-style reports", "Investigation notes"],
    steps: [
      "Open Visual Forensics from the sidebar (or AI Analyst → vision mode).",
      "Upload the image and add investigation context.",
      "Run analysis and review indicator cards.",
      "Export or share findings with your team as part of a wider case file.",
    ],
  },
  {
    id: "pipeline",
    title: "Bright Data Pipeline",
    tagline: "Live web collection",
    summary: "SERP and Web Unlocker power live briefings, chat evidence, and monitor checks.",
    description:
      "SERP and Web Unlocker zones feed chat, briefings, monitor checks, and alert reports. Configure zones in Bright Data, then .env.local.",
    href: "/settings",
    icon: DatabaseZap,
    highlights: ["SERP search", "Web Unlocker", "MCP tools", "Live vs sample badges"],
    steps: [
      "Create SERP and/or Web Unlocker zones in the Bright Data control panel.",
      "Add BRIGHT_DATA_API_KEY and zone names to .env.local.",
      "Restart npm run dev and confirm green status on Settings.",
      "Trigger collection via Dashboard Refresh, Chat, or Alerts Check now.",
    ],
  },
  {
    id: "settings",
    title: "Workspace Settings",
    tagline: "Integrations",
    summary: "Check AI/ML API, Bright Data, Speechmatics, and Supabase connection status in one place.",
    description:
      "See which providers are connected: AI/ML API, Bright Data, Speechmatics, and Supabase (when you deploy).",
    href: "/settings",
    icon: Settings,
    highlights: ["Integration status", "Bright Data zones", "Local dev mode", "Deploy checklist"],
    steps: [
      "Open Settings from the header or sidebar.",
      "Verify AI/ML API and Bright Data show Ready before a hackathon demo.",
      "Add missing keys to .env.local on each developer machine.",
      "Add Supabase keys only when you are ready for cloud auth and persistence.",
    ],
  },
];

export function getServiceById(id: string) {
  return sentraServices.find((service) => service.id === id);
}
