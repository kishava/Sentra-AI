import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { validatePublicHttpsUrl } from "@/lib/security/url";
import { ensurePlatformSecrets } from "@/lib/secrets/platform-secrets";
import { collectWebIntelligence } from "@/services/bright-data";
import type { BrightDataRequest } from "@/types/intelligence";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await ensurePlatformSecrets();
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    const body = (await request.json()) as BrightDataRequest;
    if (!body.query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (body.targetUrl) {
      const validated = validatePublicHttpsUrl(body.targetUrl);
      if (!validated.ok) {
        return NextResponse.json({ error: validated.error }, { status: 400 });
      }
      body.targetUrl = validated.url;
    }

    const result = await collectWebIntelligence(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Bright Data route failed", error);
    return NextResponse.json({ error: "Unable to collect web intelligence" }, { status: 500 });
  }
}
