import { NextResponse } from "next/server";
import { analyzeImageInvestigation } from "@/services/image-analysis";
import type { ImageFileEvidence } from "@/types/image-intelligence";

export const runtime = "nodejs";

const acceptedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxFileSize = 20 * 1024 * 1024;

async function evidenceFromFile(file: File) {
  if (!acceptedImageTypes.has(file.type)) {
    throw new Error("Upload a PNG, JPEG, or WEBP image.");
  }
  if (file.size > maxFileSize) {
    throw new Error("Each evidence file must be 20 MB or smaller.");
  }

  const metadata: ImageFileEvidence = {
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified,
  };
  const encoded = Buffer.from(await file.arrayBuffer()).toString("base64");
  return { file: metadata, dataUrl: `data:${file.type};base64,${encoded}` };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const prompt = formData.get("prompt");
    const primary = formData.get("image");
    const comparison = formData.get("comparison");

    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Investigation question is required." }, { status: 400 });
    }
    if (!(primary instanceof File)) {
      return NextResponse.json({ error: "An evidence image is required." }, { status: 400 });
    }

    const images = [await evidenceFromFile(primary)];
    if (comparison instanceof File && comparison.size) {
      images.push(await evidenceFromFile(comparison));
    }

    const report = await analyzeImageInvestigation({ prompt: prompt.trim().slice(0, 1500), images });
    return NextResponse.json({ report });
  } catch (error) {
    console.error("Image analysis route failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image investigation failed." },
      { status: 500 },
    );
  }
}
