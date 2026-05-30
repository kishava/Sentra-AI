import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { listIntelligenceReports } from "@/lib/db/reports";
import { entryFromMonitorReport } from "@/lib/history/workspace-history";
import type { ExecutiveIntelligenceReport } from "@/types/intelligence";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.localMode || !auth.supabase) {
    return NextResponse.json({ entries: [], localMode: true });
  }

  try {
    const reports = await listIntelligenceReports(auth.supabase, auth.user.id);
    const entries = reports.map((row) =>
      entryFromMonitorReport(row.report, row.monitor_id ?? undefined),
    );
    return NextResponse.json({ entries, schemaReady: true });
  } catch (error) {
    console.warn("History cloud load unavailable", error);
    return NextResponse.json({ entries: [], schemaReady: false });
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
    return NextResponse.json({ ok: true, localMode: true });
  }

  try {
    const { saveIntelligenceReport } = await import("@/lib/db/reports");
    await saveIntelligenceReport(auth.supabase, auth.user.id, body.report, body.monitorId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("History cloud save unavailable", error);
    return NextResponse.json({ ok: true, schemaReady: false });
  }
}
