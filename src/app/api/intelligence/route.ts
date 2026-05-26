import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { saveIntelligenceRun, getLatestBriefing } from "@/lib/db/intelligence";
import { checkRateLimit } from "@/lib/rate-limit";
import { validatePublicHttpsUrl } from "@/lib/security/url";
import { collectWebIntelligence } from "@/services/bright-data";
import { generateEnterpriseAnalysis } from "@/services/openai";

export const runtime = "nodejs";

async function runIntelligence(query: string, targetUrl?: string) {
  const validated = targetUrl ? validatePublicHttpsUrl(targetUrl) : null;
  if (targetUrl && validated && !validated.ok) {
    throw new Error(validated.error);
  }

  const webEvidence = await collectWebIntelligence({
    query,
    targetUrl: validated?.ok ? validated.url : undefined,
    mode: targetUrl ? "unlocker" : "serp",
  });
  const analysis = await generateEnterpriseAnalysis(query, webEvidence.evidence);
  return { provider: webEvidence.provider, analysis, cacheHit: webEvidence.cacheHit };
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    const limited = await checkRateLimit(auth.user.id, "intelligence");
    if (!limited.allowed) {
      return NextResponse.json({ error: limited.message }, { status: 429 });
    }

    const body = (await request.json()) as { query?: string; targetUrl?: string };
    const query = body.query?.trim() || "Summarize enterprise market intelligence";
    const targetUrl = body.targetUrl?.trim();
    const result = await runIntelligence(query, targetUrl);

    if (!auth.localMode && auth.supabase) {
      await saveIntelligenceRun(auth.supabase, auth.user.id, {
        query,
        provider: result.provider,
        evidencePreview: result.analysis.summary,
        analysis: result.analysis,
      });
    }

    return NextResponse.json({
      provider: result.provider,
      analysis: result.analysis,
      cacheHit: result.cacheHit,
    });
  } catch (error) {
    console.error("Intelligence route failed", error);
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

    const limited = await checkRateLimit(auth.user.id, "intelligence");
    if (!limited.allowed) {
      return NextResponse.json({ error: limited.message }, { status: 429 });
    }

    const query = "Daily enterprise intelligence briefing";
    const result = await runIntelligence(query);

    if (!auth.localMode && auth.supabase) {
      await saveIntelligenceRun(auth.supabase, auth.user.id, {
        query,
        provider: result.provider,
        evidencePreview: result.analysis.summary,
        analysis: result.analysis,
      });
    }

    return NextResponse.json({
      provider: result.provider,
      analysis: result.analysis,
      cacheHit: result.cacheHit,
    });
  } catch (error) {
    console.error("Intelligence GET failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate intelligence" },
      { status: 500 },
    );
  }
}
