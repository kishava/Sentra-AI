import type { ImageInvestigationReport } from "@/types/image-intelligence";

export function buildInvestigationMarkdown(report: ImageInvestigationReport) {
  const lines = [
    `# Visual Forensics — ${report.status}`,
    "",
    `**Prompt:** ${report.prompt}`,
    `**Generated:** ${new Date(report.createdAt).toLocaleString()}`,
    `**Confidence:** ${report.scores.confidence}% | **Threat:** ${report.threatLevel}`,
    "",
    "## Summary",
    report.summary,
    "",
    "## Recommended action",
    report.recommendedAction,
    "",
    "## Scores",
    `- Authenticity: ${report.scores.authenticity}%`,
    `- AI-generated probability: ${report.scores.aiGeneratedProbability}%`,
    `- Manipulation: ${report.scores.manipulationProbability}%`,
    `- Deepfake: ${report.scores.deepfakeProbability}%`,
    `- Risk: ${report.scores.risk}%`,
    "",
    "## Forensic analysis",
    ...report.forensicAnalysis.map((item) => `- ${item}`),
    "",
    "## Metadata",
    ...report.metadataInsights.map((item) => `- ${item}`),
    "",
    "## Environment",
    report.environmentEstimate,
    "",
    "## Limitations",
    ...report.limitations.map((item) => `- ${item}`),
  ];
  return lines.join("\n");
}

export function downloadInvestigationReport(report: ImageInvestigationReport, format: "json" | "markdown") {
  const content = format === "json" ? JSON.stringify(report, null, 2) : buildInvestigationMarkdown(report);
  const mime = format === "json" ? "application/json" : "text/markdown";
  const extension = format === "json" ? "json" : "md";
  const slug = report.prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 48)
    .replace(/^-|-$/g, "");

  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type: mime }));
  link.download = `sentra-visual-forensics-${slug || report.id}.${extension}`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export type FaceReportExport = {
  id: string;
  createdAt: string;
  caseId: string;
  imageName: string;
  summary: string;
  scores: {
    authenticity: number;
    aiGenerated: number;
    deepfake: number;
    manipulation: number;
    readiness: number;
  };
  authenticReasons: string[];
  manipulationReasons: string[];
  anomalies: string[];
  notes: string;
  faces: Array<{ id: string; quality: number }>;
};

export function buildFaceReportMarkdown(report: FaceReportExport) {
  const lines = [
    `# AI Face Intelligence — ${report.caseId}`,
    "",
    `**Image:** ${report.imageName}`,
    `**Generated:** ${new Date(report.createdAt).toLocaleString()}`,
    `**Real-image confidence:** ${report.scores.authenticity}%`,
    `**Deepfake risk:** ${report.scores.deepfake}%`,
    "",
    "## Summary",
    report.summary,
    "",
    "## Scores",
    `- Authenticity: ${report.scores.authenticity}%`,
    `- AI generated: ${report.scores.aiGenerated}%`,
    `- Deepfake: ${report.scores.deepfake}%`,
    `- Manipulation: ${report.scores.manipulation}%`,
    `- Investigation readiness: ${report.scores.readiness}%`,
    "",
    "## Authenticity indicators",
    ...report.authenticReasons.map((item) => `- ${item}`),
    "",
    "## Suspicious evidence",
    ...report.manipulationReasons.map((item) => `- ${item}`),
    "",
    "## Review notes",
    ...report.anomalies.map((item) => `- ${item}`),
    "",
    report.notes ? `## Analyst notes\n${report.notes}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

export function downloadFaceReport(report: FaceReportExport, format: "json" | "markdown") {
  const content = format === "json" ? JSON.stringify(report, null, 2) : buildFaceReportMarkdown(report);
  const mime = format === "json" ? "application/json" : "text/markdown";
  const extension = format === "json" ? "json" : "md";

  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type: mime }));
  link.download = `sentra-face-intelligence-${report.caseId.toLowerCase()}.${extension}`;
  link.click();
  URL.revokeObjectURL(link.href);
}
