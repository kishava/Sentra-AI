"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DASHBOARD_SIGNALS_UPDATED_EVENT } from "@/hooks/use-dashboard-signals";
import { getWorkspaceContext } from "@/lib/gtm/workspace-context";
import { readResponseJson } from "@/lib/http/read-response-json";
import { syncLocalSessionToCookie } from "@/lib/local-auth";
import type { IntelligenceAnalysis } from "@/types/intelligence";

function briefingErrorHint(message: string) {
  if (/401|403|signed in|unauthorized|api.?key|authentication|inference provider/i.test(message)) {
    return " Check AIML_API_KEY and FEATHERLESS_API_KEY in the Supabase vault (npm run secrets:sync), then restart the dev server.";
  }
  if (/zone|bright data/i.test(message)) {
    return "";
  }
  return " Add BRIGHT_DATA_SERP_ZONE in .env.local after creating a zone in the Bright Data control panel.";
}

type BriefingState = {
  provider?: string;
  analysis?: IntelligenceAnalysis;
  source?: "cached" | "live";
};

export function DashboardBriefing() {
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState<BriefingState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        syncLocalSessionToCookie();
        const response = await fetch("/api/intelligence", { credentials: "include" });
        if (!response.ok || cancelled) return;
        const data = await readResponseJson<BriefingState & { cached?: boolean }>(response);
        if (data.analysis && !cancelled) {
          setBriefing({ provider: data.provider, analysis: data.analysis, source: "cached" });
        }
      } catch {
        // No cached briefing yet.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshBriefing() {
    setLoading(true);
    setError("");

    try {
      syncLocalSessionToCookie();
      const response = await fetch("/api/intelligence", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "Daily GTM intelligence briefing for my workspace",
          workspace: getWorkspaceContext(),
        }),
      });
      const data = await readResponseJson<BriefingState & { error?: string }>(response);

      if (!response.ok) {
        throw new Error(data.error || "Could not refresh briefing.");
      }

      setBriefing({ provider: data.provider, analysis: data.analysis, source: "live" });
      window.dispatchEvent(
        new CustomEvent(DASHBOARD_SIGNALS_UPDATED_EVENT, {
          detail: {
            signals: data.analysis?.signals ?? [],
            source: data.provider === "bright-data" ? "live" : "sample",
            generatedAt: new Date().toISOString(),
          },
        }),
      );
      toast.success("Briefing updated", {
        description:
          data.provider === "bright-data"
            ? "Live web evidence collected."
            : "Using illustrative evidence. Configure Bright Data zones for live collection.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Briefing failed.";
      setError(message);
      toast.error("Briefing failed", { description: message });
    } finally {
      setLoading(false);
    }
  }

  const analysis = briefing?.analysis;

  return (
    <Card className="p-6" glow>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-5 w-5 text-sentra-cyan" />
            <p className="font-semibold text-white">AI daily briefing</p>
            {briefing?.provider === "bright-data" ? (
              <Badge variant="cyan">Live web evidence</Badge>
            ) : briefing ? (
              <Badge variant="violet">Illustrative evidence</Badge>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-white/50">
            Refresh collects current web evidence when integrations are configured, then synthesizes risks and opportunities.
          </p>
        </div>
        <Button variant="neon" className="shrink-0" onClick={refreshBriefing} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh briefing
        </Button>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
          {briefingErrorHint(error)}
        </p>
      )}

      <div className="mt-5 grid gap-3">
        {loading && !analysis && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/55">
            Collecting evidence and generating your briefing...
          </div>
        )}
        {analysis ? (
          <>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-white/72">
              {analysis.summary}
            </div>
            {analysis.risks.slice(0, 2).map((risk) => (
              <div
                key={risk}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-white/62"
              >
                <span className="font-medium text-rose-200">Risk:</span> {risk}
              </div>
            ))}
            {analysis.opportunities.slice(0, 2).map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-white/62"
              >
                <span className="font-medium text-sentra-cyan">Opportunity:</span> {item}
              </div>
            ))}
          </>
        ) : (
          !loading && (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-white/45">
              No briefing yet. Tap Refresh to generate your first intelligence summary.
            </div>
          )
        )}
      </div>
    </Card>
  );
}
