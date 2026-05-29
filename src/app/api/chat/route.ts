import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { appendChatMessage, createChatThread } from "@/lib/db/chat";
import { checkRateLimit } from "@/lib/rate-limit";
import { isLlmConfigured } from "@/lib/llm/client";
import { collectWebIntelligence } from "@/services/bright-data";
import { generateChatResponse } from "@/services/openai";
import type { BrightDataRequest, ChatMessage, ChatProvider } from "@/types/intelligence";

export const runtime = "nodejs";

const collectionIntent =
  /\b(monitor|monitoring|track|tracking|watch|scrape|extract|crawl|competitor|competitive|pricing|price changes?|website changes?|product launches?|hiring signals?|compare (?:plans|prices|pricing))\b/i;

const MAX_MESSAGE_LENGTH = 4000;

function getTargetUrl(message: string) {
  const match = message.match(/https?:\/\/[^\s<>()\]]+/i)?.[0]?.replace(/[.,;!?]+$/, "");
  if (!match) return undefined;

  try {
    return new URL(match).toString();
  } catch {
    return undefined;
  }
}

function getCollectionRequest(message: string): BrightDataRequest | null {
  const targetUrl = getTargetUrl(message);
  if (targetUrl) {
    return { query: message, targetUrl, mode: "unlocker" };
  }

  return collectionIntent.test(message) ? { query: message, mode: "serp" } : null;
}

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
      brightData?: {
        serp?: boolean;
        scraper?: boolean;
        webUnlocker?: boolean;
      };
    };
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message is too long." }, { status: 400 });
    }

    if (!isLlmConfigured()) {
      return NextResponse.json(
        {
          error:
            "Live chat requires AIML_API_KEY in .env.local (from aimlapi.com). Restart npm run dev after saving.",
        },
        { status: 503 },
      );
    }

    let provider: ChatProvider = "aiml-search";
    let brightDataEvidence: string | undefined;
    const collectionRequest = getCollectionRequest(message);

    const brightDataEnabled = collectionRequest
      ? collectionRequest.mode === "unlocker"
        ? body.brightData?.webUnlocker !== false
        : body.brightData?.serp !== false
      : true;

    if (collectionRequest && brightDataEnabled) {
      const evidence = await collectWebIntelligence(collectionRequest);
      if (evidence.provider === "bright-data") {
        provider = "aiml-bright-data";
        brightDataEvidence = evidence.evidence;
      }
    }

    const response = await generateChatResponse(message, {
      history: getHistory(body.history),
      brightDataEvidence,
    });

    let threadId = body.threadId;
    if (!auth.localMode && auth.supabase) {
      if (!threadId) {
        const thread = await createChatThread(auth.supabase, auth.user.id);
        threadId = thread.id;
      }

      if (threadId) {
        await appendChatMessage(auth.supabase, auth.user.id, threadId, {
          role: "user",
          content: message,
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
    const message =
      error instanceof Error ? error.message : "Sentra AI could not generate a response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
