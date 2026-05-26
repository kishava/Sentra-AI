import { collectWebIntelligence } from "@/services/bright-data";
import { encodeSse, RealtimeLogService } from "@/services/realtime-log";
import { generateWorldEngineReport } from "@/services/world-engine";
import type { ActivityStreamEvent } from "@/types/activity-console";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sourceIdentity(url: string, title: string) {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes("reuters")) return { id: "reuters", name: "Reuters" };
  if (hostname.includes("linkedin")) return { id: "linkedin", name: "LinkedIn" };
  if (hostname.includes("techcrunch")) return { id: "techcrunch", name: "TechCrunch" };
  if (hostname.includes("reddit")) return { id: "reddit", name: "Reddit" };
  if (hostname.includes("github")) return { id: "github", name: "GitHub" };
  if (hostname.includes("sec.gov")) return { id: "sec", name: "SEC filings" };
  if (hostname.includes("twitter") || hostname === "x.com") return { id: "x", name: "X / Twitter" };
  return { id: `source-${hostname}`, name: title };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { query?: string } | null;
  const query = body?.query?.trim().slice(0, 1500);
  if (!query) return new Response("An intelligence question is required.", { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: ActivityStreamEvent) => controller.enqueue(encoder.encode(encodeSse(event)));
      const logs = new RealtimeLogService(emit);
      const heartbeat = setInterval(() => logs.health(), 1000);
      const brightDataConfigured = Boolean(
        process.env.BRIGHT_DATA_API_KEY &&
        process.env.BRIGHT_DATA_SERP_ENDPOINT &&
        process.env.BRIGHT_DATA_SERP_ZONE,
      );
      const openAiConfigured = Boolean(process.env.OPENAI_API_KEY);
      const observedSourceIds = new Set<string>();

      try {
        logs.log({
          category: "INTAKE",
          stage: "Request intake",
          message: `Received directive: "${query}"`,
        });
        logs.log({
          category: "ROUTER",
          stage: "Pipeline routing",
          message: `Selecting intelligence pipelines: ${brightDataConfigured ? "Bright Data SERP + " : ""}${openAiConfigured ? "OpenAI live search" : "illustrative demo model"}.`,
        });

        if (brightDataConfigured) {
          logs.source({
            id: "bright-data-serp",
            name: "Google SERP via Bright Data",
            channel: "api",
            status: "active",
            detail: "SERP collection request in flight",
          });
          logs.log({
            category: "SERP",
            source: "Bright Data SERP",
            stage: "Evidence collection",
            message: "Querying configured Google SERP collection endpoint.",
          });
        } else {
          const missingSettings = [
            !process.env.BRIGHT_DATA_API_KEY && "API key",
            !process.env.BRIGHT_DATA_SERP_ENDPOINT && "SERP endpoint",
            !process.env.BRIGHT_DATA_SERP_ZONE && "SERP zone",
          ].filter(Boolean).join(", ");
          logs.source({
            id: "bright-data-serp",
            name: "Google SERP via Bright Data",
            channel: "api",
            status: "unavailable",
            detail: `Not contacted: missing ${missingSettings}`,
          });
          logs.log({
            category: "SERP",
            stage: "Evidence collection",
            message: "Bright Data SERP is not configured; using labelled illustrative evidence.",
            level: "warning",
          });
        }

        const collectionStartedAt = performance.now();
        const evidence = await collectWebIntelligence({ query, mode: "serp" });
        const collectionLatency = Math.round(performance.now() - collectionStartedAt);
        if (evidence.provider === "bright-data") {
          logs.source({
            id: "bright-data-serp",
            name: "Google SERP via Bright Data",
            channel: "api",
            status: "success",
            detail: "Collected SERP evidence",
            latencyMs: collectionLatency,
          });
          logs.log({
            category: "SOURCE",
            source: "Bright Data SERP",
            stage: "Evidence collection",
            message: "SERP evidence collection complete.",
            level: "success",
            latencyMs: collectionLatency,
          });
        } else if (brightDataConfigured) {
          logs.source({
            id: "bright-data-serp",
            name: "Google SERP via Bright Data",
            channel: "api",
            status: "error",
            detail: "Collection failed; illustrative evidence substituted",
            latencyMs: collectionLatency,
          });
          logs.log({
            category: "SERP",
            source: "Bright Data SERP",
            stage: "Evidence collection",
            message: "Configured SERP collection failed; switching to labelled demo evidence.",
            level: "warning",
            latencyMs: collectionLatency,
          });
        }

        if (openAiConfigured) {
          logs.source({
            id: "openai-live-search",
            name: "OpenAI Web Search",
            channel: "api",
            status: "connecting",
            detail: "Submitting intelligence model request",
          });
          logs.log({
            category: "AI",
            source: "OpenAI Responses",
            stage: "Model invocation",
            message: "Submitting structured world-intelligence request with live web-search tools.",
          });
        } else {
          logs.source({
            id: "openai-live-search",
            name: "OpenAI Web Search",
            channel: "api",
            status: "unavailable",
            detail: "Not contacted: OPENAI_API_KEY not configured",
          });
          logs.log({
            category: "AI",
            stage: "Model invocation",
            message: "OpenAI is not configured; returning a clearly labelled demo intelligence model.",
            level: "warning",
          });
        }

        const aiStartedAt = performance.now();
        const report = await generateWorldEngineReport(
          {
            query,
            evidence: evidence.evidence,
            brightDataAvailable: evidence.provider === "bright-data",
          },
          openAiConfigured
            ? {
                onResponseCreated: () => {
                  logs.log({
                    category: "AI",
                    source: "OpenAI Responses",
                    stage: "Model invocation",
                    message: "Model response stream established.",
                    level: "success",
                  });
                },
                onWebSearchStarted: () => {
                  logs.source({
                    id: "openai-live-search",
                    name: "OpenAI Web Search",
                    channel: "api",
                    status: "active",
                    detail: "Web-search tool call active",
                  });
                  logs.log({
                    category: "SERP",
                    source: "OpenAI Web Search",
                    stage: "Source discovery",
                    message: "Live web-search tool call initiated.",
                  });
                },
                onWebSearchSearching: () => {
                  logs.log({
                    category: "SOURCE",
                    source: "OpenAI Web Search",
                    stage: "Source discovery",
                    message: "Searching for corroborating current sources.",
                  });
                },
                onWebSearchCompleted: (latencyMs) => {
                  logs.source({
                    id: "openai-live-search",
                    name: "OpenAI Web Search",
                    channel: "api",
                    status: "success",
                    detail: "Web-search tool call completed",
                    latencyMs,
                  });
                  logs.log({
                    category: "SOURCE",
                    source: "OpenAI Web Search",
                    stage: "Source discovery",
                    message: "Live source discovery completed.",
                    level: "success",
                    latencyMs,
                  });
                },
                onSynthesisStarted: () => {
                  logs.log({
                    category: "AI",
                    source: "OpenAI Responses",
                    stage: "Intelligence synthesis",
                    message: "Synthesizing structured intelligence model from gathered evidence.",
                  });
                },
                onSourceDiscovered: (source) => {
                  const identity = sourceIdentity(source.url, source.title);
                  if (observedSourceIds.has(identity.id)) return;
                  observedSourceIds.add(identity.id);
                  logs.source({
                    id: identity.id,
                    name: identity.name,
                    channel: "web",
                    status: "success",
                    detail: "Discovered during active live search",
                    url: source.url,
                  });
                  logs.log({
                    category: "SOURCE",
                    source: source.title,
                    stage: "Verification",
                    message: `Verified source reference discovered: ${source.url}`,
                    level: "success",
                  });
                },
              }
            : undefined,
        );

        const aiLatency = Math.round(performance.now() - aiStartedAt);
        report.reasoning.forEach((thought) => {
          emit({ type: "thought", thought });
          logs.log({
            category: "AI",
            stage: "Reasoning summary",
            message: thought.finding,
            confidence: thought.confidence,
          });
        });
        logs.log({
          category: "SIGNAL",
          stage: "Signal classification",
          message: `Classified ${report.signals.length} regional signals across ${new Set(report.signals.map((signal) => signal.domain)).size} intelligence domains.`,
          confidence: report.confidence,
        });
        logs.log({
          category: "RISK",
          stage: "Risk scoring",
          message: `Calculated intelligence risk index at ${report.riskIndex}%.`,
          confidence: report.confidence,
        });
        report.visualizations.forEach((visualization) => {
          logs.log({
            category: visualization === "globe" ? "MAP" : "CHART",
            stage: "Visualization generation",
            message: `Generated ${visualization} visualization specification.`,
            level: "success",
          });
        });
        logs.log({
          category: "VOICE",
          stage: "Narration staging",
          message: "Executive narration scripts prepared; voice synthesis runs only when Brief Me is selected.",
        });
        if (report.sources.length) emit({ type: "verified_sources", sources: report.sources });
        logs.log({
          category: "COMPLETE",
          stage: "Complete",
          message: "Intelligence synthesis finished.",
          level: "success",
          confidence: report.confidence,
          latencyMs: aiLatency,
        });
        logs.setStatus(report.provider === "demo" ? "degraded" : "complete", "Complete");
        emit({ type: "report", report });
        emit({ type: "complete" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Streamed intelligence request failed.";
        if (openAiConfigured) {
          logs.source({
            id: "openai-live-search",
            name: "OpenAI Web Search",
            channel: "api",
            status: "error",
            detail: "Intelligence model request failed",
          });
        }
        logs.log({ category: "SYSTEM", stage: "Failure", message, level: "error" });
        logs.setStatus("failed", "Failure");
        emit({ type: "error", message });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
