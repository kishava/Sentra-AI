import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { listIntelligenceReports, saveIntelligenceReport } from "@/lib/db/reports";
import type { ExecutiveIntelligenceReport } from "@/types/intelligence";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.localMode || !auth.supabase) {
    return NextResponse.json({ reports: [], localMode: true });
  }

  try {
    const reports = await listIntelligenceReports(auth.supabase, auth.user.id);
    return NextResponse.json({ reports });
  } catch (error) {
    console.warn("Reports table unavailable", error);
    return NextResponse.json({ reports: [], schemaReady: false });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const body = (await request.json().catch(() => null)) as {
    report?: ExecutiveIntelligenceReport;
    monitorId?: string;
  } | null;

  if (!body?.report) {
    return NextResponse.json({ error: "Report is required." }, { status: 400 });
  }

  if (auth.localMode || !auth.supabase) {
    return NextResponse.json({ report: body.report, localMode: true });
  }

  try {
    const saved = await saveIntelligenceReport(auth.supabase, auth.user.id, body.report, body.monitorId);
    return NextResponse.json({ report: saved });
  } catch (error) {
    console.warn("Report persistence unavailable", error);
    return NextResponse.json({ report: body.report, schemaReady: false });
  }
}
