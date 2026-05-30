import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensurePlatformSecrets } from "@/lib/secrets/platform-secrets";
import {
  BrightDataCollectionError,
  BrightDataNotConfiguredError,
} from "@/lib/bright-data/config";
import { generateEnterpriseAnalysis } from "@/services/openai";
import { runGtmResearch } from "@/services/gtm-research";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    await ensurePlatformSecrets();
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    const limited = await checkRateLimit(auth.user.id, "intelligence");
    if (!limited.allowed) {
      return NextResponse.json({ error: limited.message }, { status: 429 });
    }

    const body = (await request.json()) as { query?: string; multiSource?: boolean; workspace?: import("@/lib/gtm/workspace-context").WorkspaceContext };
    const query = body.query?.trim();
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const enrichedQuery = body.workspace
      ? `${query}\n\nAccount context:\n${[
          body.workspace.companyName ? `Company: ${body.workspace.companyName}` : null,
          body.workspace.industry ? `Industry: ${body.workspace.industry}` : null,
          body.workspace.competitors ? `Competitors: ${body.workspace.competitors}` : null,
          body.workspace.markets ? `Markets: ${body.workspace.markets}` : null,
        ]
          .filter(Boolean)
          .join("\n")}`
      : query;

    const bundle = await runGtmResearch(enrichedQuery, {
      preferMcp: true,
      multiSource: body.multiSource !== false,
    });

    const analysis = await generateEnterpriseAnalysis(enrichedQuery, bundle.evidence);

    return NextResponse.json({
      provider: bundle.provider,
      plan: bundle.plan,
      steps: bundle.steps,
      analysis,
      evidencePreview: bundle.evidence.slice(0, 2000),
    });
  } catch (error) {
    console.error("GTM research agent failed", error);
    if (error instanceof BrightDataNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof BrightDataCollectionError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GTM research failed" },
      { status: 500 },
    );
  }
}
