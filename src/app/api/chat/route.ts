import { NextResponse } from "next/server";
import { collectWebIntelligence } from "@/services/bright-data";
import { generateChatResponse } from "@/services/openai";
import type { BrightDataRequest, ChatMessage, ChatProvider } from "@/types/intelligence";

export const runtime = "nodejs";

const collectionIntent =
  /\b(monitor|monitoring|track|tracking|watch|scrape|extract|crawl|competitor|competitive|pricing|price changes?|website changes?|product launches?|hiring signals?|compare (?:plans|prices|pricing))\b/i;

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
    const body = (await request.json()) as { message?: string; history?: unknown };
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    let provider: ChatProvider = "openai-web-search";
    let brightDataEvidence: string | undefined;
    const collectionRequest = getCollectionRequest(message);

    if (collectionRequest) {
      const evidence = await collectWebIntelligence(collectionRequest);
      if (evidence.provider === "bright-data") {
        provider = "bright-data-openai";
        brightDataEvidence = evidence.evidence;
      }
    }

    const response = await generateChatResponse(message, {
      history: getHistory(body.history),
      brightDataEvidence,
    });

    return NextResponse.json({
      message: response,
      provider,
    });
  } catch (error) {
    console.error("Chat route failed", error);
    const message =
      error instanceof Error ? error.message : "Sentra AI could not generate a response";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
