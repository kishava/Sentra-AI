import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { sliceDocumentForContext } from "@/lib/documents/extract-text";
import { enrichQueryWithWorkspace, type WorkspaceContext } from "@/lib/gtm/workspace-context";
import { ensurePlatformSecrets } from "@/lib/secrets/platform-secrets";
import { isFeatherlessConfigured } from "@/lib/llm/featherless";
import { bundleToLegacyEvidence, runGtmResearch } from "@/services/gtm-research";
import { generateChatResponse } from "@/services/openai";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    await ensurePlatformSecrets();
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    const limited = await checkRateLimit(auth.user.id, "chat");
    if (!limited.allowed) {
      return NextResponse.json({ error: limited.message }, { status: 429 });
    }

    if (!isFeatherlessConfigured()) {
      return NextResponse.json(
        { error: "Featherless is required for battlecard analysis. Add FEATHERLESS_API_KEY." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as {
      fileName?: string;
      text?: string;
      workspace?: WorkspaceContext;
      runLiveCheck?: boolean;
    };

    const fileName = body.fileName?.trim() || "battlecard.pdf";
    const text = body.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "Battlecard text is required." }, { status: 400 });
    }

    const query = enrichQueryWithWorkspace(
      `Analyze this competitor battlecard and identify gaps vs live market signals for our GTM team.`,
      body.workspace,
    );

    let brightDataEvidence: string | undefined;
    let collectionProvider: "bright-data" | "demo" | undefined;

    if (body.runLiveCheck !== false) {
      const bundle = await runGtmResearch(
        `${query}\n\nFocus on competitor claims in the battlecard: ${sliceDocumentForContext(text.slice(0, 4000))}`,
        { preferMcp: true, multiSource: true },
      );
      if (bundle.provider === "bright-data") {
        brightDataEvidence = bundleToLegacyEvidence(bundle).evidence;
        collectionProvider = "bright-data";
      }
    }

    const analysis = await generateChatResponse(
      `${query}\n\nReturn:
- battlecard strengths
- outdated or unverified claims
- live web contradictions
- recommended GTM counter-messaging
- priority accounts or segments to brief`,
      {
        documentEvidence: { fileName, text: sliceDocumentForContext(text) },
        brightDataEvidence,
      },
    );

    return NextResponse.json({
      provider: collectionProvider ? "featherless-document-bright-data" : "featherless-document",
      fileName,
      analysis,
      liveCheck: Boolean(brightDataEvidence),
    });
  } catch (error) {
    console.error("Battlecard analysis failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Battlecard analysis failed." },
      { status: 500 },
    );
  }
}
