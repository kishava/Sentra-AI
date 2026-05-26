import { Database, Eye, Fingerprint, ScanSearch, Sparkles, Waypoints } from "lucide-react";

export const investigationPrompts = [
  "Is this image AI-generated or real?",
  "Detect manipulation or editing",
  "Estimate AI probability percentage",
  "Analyze where this image might have been taken",
  "Detect objects, landmarks, brands, or people",
  "Generate forensic-style analysis",
  "Detect deepfake possibility",
  "Analyze emotional or social context",
  "Extract hidden insights",
  "Reverse-investigate the scene",
  "Explain the story behind this image",
];

export const investigationTimeline = [
  { label: "Upload detected", detail: "Evidence secured", icon: Fingerprint },
  { label: "AI scanning", detail: "Visual signals", icon: ScanSearch },
  { label: "Metadata extraction", detail: "Available attributes", icon: Database },
  { label: "Scene analysis", detail: "Objects and light", icon: Eye },
  { label: "Context reasoning", detail: "Risk inference", icon: Sparkles },
  { label: "Final verdict", detail: "Analyst report", icon: Waypoints },
];
