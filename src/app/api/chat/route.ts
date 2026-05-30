import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { appendChatMessage, createChatThread } from "@/lib/db/chat";
import { recordProviderUsage } from "@/lib/provider-usage";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensurePlatformSecrets } from "@/lib/secrets/platform-secrets";
import { isAimlConfigured, isLlmConfigured } from "@/lib/llm/client";
import {
  BrightDataCollectionError,
  BrightDataNotConfiguredError,
  requiresLiveBrightData,
} from "@/services/bright-data";
import { planGtmCollection } from "@/lib/bright-data/router";
import { bundleToLegacyEvidence, collectFromPlan, runGtmResearch } from "@/services/gtm-research";
import { formatInferenceError, isLlmAuthError } from "@/lib/llm/inference";
import { generateChatResponse, resolveDocumentChatProvider } from "@/services/openai";
import type { ChatDocumentEvidence, ChatMessage, ChatProvider } from "@/types/intelligence";

export const runtime = "nodejs";

const collectionIntent =
  /\b(monitor|monitoring|track|tracking|watch|scrape|extract|crawl|competitor|competitive|pricing|price changes?|website changes?|product launches?|hiring signals?|compare (?:plans|prices|pricing)|https?:\/\/)/i;

const MAX_MESSAGE_LENGTH = 4000;

function getHistory(value: unknown): Pick<ChatMessage, "role" | "content">[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Pick<ChatMessage, "role" | "content"> =>
        typeof item === "object" &&
        item !== null &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string",
    )
    .slice(-8);
}

export async function POST(request: Request) {
  try {
    await ensurePlatformSecrets();
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    const limited = await checkRateLimit(auth.user.id, "chat");
    if (!limited.allowed) {
      return NextResponse.json({ error: limited.message }, { status: 429 });
    }

    const body = (await request.json()) as {
      message?: string;
      history?: unknown;
      threadId?: string;
      document?: ChatDocumentEvidence;
      workspace?: import("@/lib/gtm/workspace-context").WorkspaceContext;
      brightData?: {
        serp?: boolean;
        scraper?: boolean;
        webUnlocker?: boolean;
        mcp?: boolean;
      };
      useGtmAgent?: boolean;
    };

    const documentEvidence =
      body.document?.text?.trim() && body.document.fileName
        ? {
            fileName: body.document.fileName,
            text: body.document.text.trim(),
            truncated: body.document.truncated,
          }
        : undefined;

    const message = (body.message?.trim() || (documentEvidence ? "Analyze the uploaded document." : "")).trim();

    if (!message) {
      return NextResponse.json({ error: "Message or document is required." }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message is too long." }, { status: 400 });
    }

    if (!isLlmConfigured()) {
      return NextResponse.json(
        {
          error:
            "Configure FEATHERLESS_API_KEY and/or AIML_API_KEY in .env.local, then restart npm run dev.",
        },
        { status: 503 },
      );
    }

    if (!documentEvidence && !isAimlConfigured()) {
      return NextResponse.json(
        {
          error: "Live web chat requires AIML_API_KEY. Document-only chat can use Featherless.",
        },
        { status: 503 },
      );
    }

    let provider: ChatProvider = documentEvidence
      ? resolveDocumentChatProvider(false)
      : "aiml-search";
    let brightDataEvidence: string | undefined;

    const wantsCollection = collectionIntent.test(message) || body.useGtmAgent === true;
    const brightDataEnabled =
      body.brightData?.serp !== false &&
      body.brightData?.webUnlocker !== false &&
      body.brightData?.scraper !== false;

    if (wantsCollection && brightDataEnabled) {
      const bundle = body.useGtmAgent
        ? await runGtmResearch(message, { preferMcp: body.brightData?.mcp !== false, multiSource: true })
        : await collectFromPlan(planGtmCollection(message, { preferMcp: body.brightData?.mcp !== false }), {
            multiSource: true,
          });

      if (requiresLiveBrightData() && bundle.provider !== "bright-data") {
        return NextResponse.json(
          {
            error:
              "Bright Data is required for GTM collection in production. Configure all zones in Settings → Bright Data control center.",
          },
          { status: 503 },
        );
      }

      if (bundle.provider === "bright-data") {
        void recordProviderUsage("bright_data");
        const legacy = bundleToLegacyEvidence(bundle);
        brightDataEvidence = legacy.evidence;
        provider = documentEvidence
          ? resolveDocumentChatProvider(true)
          : body.useGtmAgent
            ? "gtm-agent"
            : "aiml-bright-data";
      }
    }

    if (provider.includes("featherless")) {
      void recordProviderUsage("featherless");
    } else if (provider.includes("aiml") || provider === "gtm-agent") {
      void recordProviderUsage("aiml");
    }

    const response = await generateChatResponse(message, {
      history: getHistory(body.history),
      brightDataEvidence,
      documentEvidence,
      workspaceContext: body.workspace,
    });

    let threadId = body.threadId;
    if (!auth.localMode && auth.supabase) {
      if (!threadId) {
        const thread = await createChatThread(auth.supabase, auth.user.id);
        threadId = thread.id;
      }

      if (threadId) {
        const userContent = documentEvidence
          ? `[Document: ${documentEvidence.fileName}]\n${message}`
          : message;
        await appendChatMessage(auth.supabase, auth.user.id, threadId, {
          role: "user",
          content: userContent,
        });
        await appendChatMessage(auth.supabase, auth.user.id, threadId, {
          role: "assistant",
          content: response,
          provider,
        });
      }
    }

    return NextResponse.json({
      message: response,
      provider,
      threadId: threadId ?? undefined,
    });
  } catch (error) {
    console.error("Chat route failed", error);
    if (error instanceof BrightDataNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof BrightDataCollectionError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    const message = formatInferenceError(error);
    const status = isLlmAuthError(error) ? 502 : 500;
    return NextResponse.json(
      {
        error: message,
        hint: isLlmAuthError(error)
          ? "Your Sentra login is fine — the AIML or Featherless API key needs to be updated."
          : undefined,
      },
      { status },
    );
  }
}
