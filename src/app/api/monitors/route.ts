import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { createMonitor, listMonitors } from "@/lib/db/monitors";
import type { Severity } from "@/types/intelligence";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.localMode || !auth.supabase) {
    return NextResponse.json({ monitors: [], localMode: true });
  }

  const monitors = await listMonitors(auth.supabase, auth.user.id);
  return NextResponse.json({ monitors });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const body = (await request.json()) as {
    requirement?: string;
    category?: string;
    minimumSeverity?: Severity;
    keywords?: string[];
    targetUrl?: string;
    active?: boolean;
  };

  if (!body.requirement?.trim()) {
    return NextResponse.json({ error: "Monitor requirement is required." }, { status: 400 });
  }

  if (auth.localMode || !auth.supabase) {
    const monitor = {
      id: randomUUID(),
      requirement: body.requirement.trim(),
      category: body.category ?? "any",
      minimum_severity: body.minimumSeverity ?? "medium",
      keywords: body.keywords ?? [],
      target_url: body.targetUrl ?? null,
      active: body.active ?? true,
      last_checked_at: null,
    };
    return NextResponse.json({ monitor, localMode: true });
  }

  const monitor = await createMonitor(auth.supabase, auth.user.id, {
    requirement: body.requirement.trim(),
    category: body.category ?? "any",
    minimum_severity: body.minimumSeverity ?? "medium",
    keywords: body.keywords ?? [],
    target_url: body.targetUrl ?? null,
    active: body.active ?? true,
  });

  return NextResponse.json({ monitor });
}
