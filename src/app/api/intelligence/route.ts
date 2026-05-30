import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { saveIntelligenceRun, getLatestBriefing } from "@/lib/db/intelligence";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensurePlatformSecrets } from "@/lib/secrets/platform-secrets";
import { validatePublicHttpsUrl } from "@/lib/security/url";
import {
  BrightDataCollectionError,
  BrightDataNotConfiguredError,
  collectWebIntelligence,
  requiresLiveBrightData,
} from "@/services/bright-data";
import { enrichQueryWithWorkspace, type WorkspaceContext } from "@/lib/gtm/workspace-context";
import { generateEnterpriseAnalysis } from "@/services/openai";

export const runtime = "nodejs";

async function runIntelligence(query: string, targetUrl?: string, workspace?: WorkspaceContext | null) {
  const enrichedQuery = enrichQueryWithWorkspace(query, workspace);
  const validated = targetUrl ? validatePublicHttpsUrl(targetUrl) : null;
  if (targetUrl && validated && !validated.ok) {
    throw new Error(validated.error);
  }

  const webEvidence = await collectWebIntelligence({
    query: enrichedQuery,
    targetUrl: validated?.ok ? validated.url : undefined,
    mode: targetUrl ? "unlocker" : "serp",
  });
  if (requiresLiveBrightData() && webEvidence.provider !== "bright-data") {
    throw new BrightDataNotConfiguredError(
      "Bright Data must be configured for live GTM briefings in production.",
      targetUrl ? "unlocker" : "serp",
      "missing_zone",
    );
  }
  const analysis = await generateEnterpriseAnalysis(enrichedQuery, webEvidence.evidence, workspace);
  return { provider: webEvidence.provider, analysis, cacheHit: webEvidence.cacheHit };
}

export async function POST(request: Request) {
  try {
    await ensurePlatformSecrets();
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    const limited = await checkRateLimit(auth.user.id, "intelligence").catch((rateError) => {
      console.warn("Intelligence rate limit skipped", rateError);
      return { allowed: true as const };
    });
    if (!limited.allowed) {
      return NextResponse.json({ error: limited.message }, { status: 429 });
    }

    const body = (await request.json()) as { query?: string; targetUrl?: string; workspace?: WorkspaceContext };
    const query = body.query?.trim() || "Summarize enterprise market intelligence";
    const targetUrl = body.targetUrl?.trim();
    const result = await runIntelligence(query, targetUrl, body.workspace);

    if (!auth.localMode && auth.supabase) {
      try {
        await saveIntelligenceRun(auth.supabase, auth.user.id, {
          query,
          provider: result.provider,
          evidencePreview: result.analysis.summary,
          analysis: result.analysis,
        });
      } catch (error) {
        console.warn("Intelligence persistence skipped", error);
      }
    }

    return NextResponse.json({
      provider: result.provider,
      analysis: result.analysis,
      cacheHit: result.cacheHit,
    });
  } catch (error) {
    console.error("Intelligence route failed", error);
    if (error instanceof BrightDataNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof BrightDataCollectionError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate intelligence" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    if (!auth.localMode && auth.supabase) {
      const briefing = await getLatestBriefing(auth.supabase, auth.user.id);
      if (briefing) {
        return NextResponse.json({
          provider: briefing.provider,
          analysis: briefing.analysis,
          cached: true,
        });
      }
    }

    return NextResponse.json({ analysis: null, cached: false });
  } catch (error) {
    console.error("Intelligence GET failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate intelligence" },
      { status: 500 },
    );
  }
}
