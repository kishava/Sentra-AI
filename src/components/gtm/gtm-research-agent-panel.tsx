"use client";

import { useState } from "react";
import { Bot, Loader2, Radar, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getWorkspaceContext } from "@/lib/gtm/workspace-context";
import type { IntelligenceAnalysis } from "@/types/intelligence";

type GtmResearchResult = {
  provider?: string;
  plan?: { steps?: Array<{ label: string; mode: string; reason: string }> };
  steps?: Array<{ label: string; mode: string; evidence: string }>;
  analysis?: IntelligenceAnalysis;
  evidencePreview?: string;
};

type GtmResearchAgentPanelProps = {
  initialQuery?: string;
  compact?: boolean;
  onApplyRequirement?: (requirement: string) => void;
};

export function GtmResearchAgentPanel({
  initialQuery = "",
  compact = false,
  onApplyRequirement,
}: GtmResearchAgentPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GtmResearchResult | null>(null);

  async function runAgent() {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/agent/gtm-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmed,
          multiSource: true,
          workspace: getWorkspaceContext(),
        }),
      });

      const data = (await response.json()) as GtmResearchResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "GTM research agent failed.");

      setResult(data);
      toast.success("GTM research agent completed", {
        description:
          data.provider === "bright-data"
            ? "Bright Data MCP + multi-source collection finished."
            : "Analysis completed with available evidence.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "GTM research agent failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={compact ? "p-4" : "p-5 md:p-6"} glow>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="cyan">Bright Data MCP agent</Badge>
          <h2 className={`mt-3 font-semibold text-white ${compact ? "text-lg" : "text-xl"}`}>
            GTM research agent
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Runs SERP, Web Unlocker, Scraper, and Bright Data MCP, then synthesizes an executive analysis.
          </p>
        </div>
        <Bot className="h-5 w-5 shrink-0 text-sentra-cyan" />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <Textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Example: research competitor pricing moves and procurement agent launches affecting our enterprise accounts"
          className="min-h-20"
        />
        <Button variant="neon" onClick={() => void runAgent()} disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
          {loading ? "Researching…" : "Run GTM agent"}
        </Button>
      </div>

      {result && (
        <div className="mt-5 space-y-4 rounded-3xl border border-white/10 bg-white/[0.045] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={result.provider === "bright-data" ? "success" : "default"}>
              {result.provider === "bright-data" ? "Live · Bright Data" : "Sample / fallback"}
            </Badge>
            <Badge variant="cyan">MCP + multi-source</Badge>
            {result.analysis && (
              <Badge variant="default">{Math.round(result.analysis.confidenceScore * 100)}% confidence</Badge>
            )}
          </div>

          {result.steps && result.steps.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">Collection steps</p>
              <div className="mt-2 grid gap-2">
                {result.steps.map((step) => (
                  <div key={`${step.mode}-${step.label}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-sm font-medium text-white">
                      {step.label} <span className="text-white/40">({step.mode})</span>
                    </p>
                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-white/45">{step.evidence}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.analysis && (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">Executive analysis</p>
              <p className="mt-2 text-sm leading-7 text-white/68">{result.analysis.summary}</p>
              {result.analysis.recommendations.length > 0 && (
                <ul className="mt-3 grid gap-2">
                  {result.analysis.recommendations.slice(0, 4).map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-6 text-white/62">
                      <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-sentra-cyan" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {onApplyRequirement && result.analysis?.summary && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onApplyRequirement(result.analysis!.summary)}
            >
              Use summary as monitor requirement
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
