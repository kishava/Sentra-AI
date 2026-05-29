import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { extractDocumentFromFile } from "@/lib/documents/extract-text";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensurePlatformSecrets } from "@/lib/secrets/platform-secrets";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await ensurePlatformSecrets();
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    const limited = await checkRateLimit(auth.user.id, "chat");
    if (!limited.allowed) {
      return NextResponse.json({ error: limited.message }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A document file is required." }, { status: 400 });
    }

    const parsed = await extractDocumentFromFile(file);

    return NextResponse.json({
      document: {
        fileName: parsed.fileName,
        mimeType: parsed.mimeType,
        text: parsed.text,
        truncated: parsed.truncated,
        charCount: parsed.charCount,
        ocrUsed: parsed.ocrUsed,
      },
    });
  } catch (error) {
    console.error("Document parse failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read document." },
      { status: 400 },
    );
  }
}
