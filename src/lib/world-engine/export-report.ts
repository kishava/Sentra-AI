import type { WorldEngineReport } from "@/types/world-engine";

export function buildWorldInsightMarkdown(report: WorldEngineReport) {
  const lines = [
    `# ${report.headline}`,
    "",
    `**Query:** ${report.query}`,
    `**Generated:** ${new Date(report.generatedAt).toLocaleString()}`,
    `**Risk index:** ${report.riskIndex}% | **Confidence:** ${report.confidence}%`,
    "",
    "## Executive summary",
    report.executiveSummary,
    "",
    "## Outlook",
    report.outlook,
    "",
    "## Recommendation",
    report.recommendation,
    "",
    "## Regional signals",
    ...report.signals.map(
      (signal) => `- **${signal.region}** (${signal.severity}): ${signal.title} — ${signal.summary}`,
    ),
    "",
    "## Forecasts",
    ...report.forecasts.map(
      (forecast) =>
        `- ${forecast.horizon}: ${forecast.title} (${forecast.probability}% probability, ${forecast.impact}% impact)`,
    ),
    "",
    "## Sources",
    ...(report.sources.length
      ? report.sources.map((source) => `- [${source.title}](${source.url})`)
      : ["- No verified sources attached"]),
    "",
    "## Limitations",
    ...report.limitations.map((item) => `- ${item}`),
  ];

  return lines.join("\n");
}

export function downloadWorldReport(report: WorldEngineReport, format: "json" | "markdown") {
  const content =
    format === "json"
      ? JSON.stringify(report, null, 2)
      : buildWorldInsightMarkdown(report);
  const mime = format === "json" ? "application/json" : "text/markdown";
  const extension = format === "json" ? "json" : "md";
  const slug = report.query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 48)
    .replace(/^-|-$/g, "");

  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type: mime }));
  link.download = `sentra-world-insight-${slug || "report"}.${extension}`;
  link.click();
  URL.revokeObjectURL(link.href);
}
