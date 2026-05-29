import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensurePlatformSecrets } from "@/lib/secrets/platform-secrets";
import { analyzeMonitorIntent } from "@/services/openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await ensurePlatformSecrets();
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const limited = await checkRateLimit(auth.user.id, "monitor_check");
  if (!limited.allowed) {
    return NextResponse.json({ error: limited.message }, { status: 429 });
  }

  try {
    const body = (await request.json()) as { input?: string };
    const input = body.input?.trim();

    if (!input) {
      return NextResponse.json({ error: "Monitor input is required" }, { status: 400 });
    }

    const intent = await analyzeMonitorIntent(input);
    return NextResponse.json({ intent });
  } catch (error) {
    console.error("Monitor intent route failed", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to analyze monitor intent",
      },
      { status: 500 },
    );
  }
}
