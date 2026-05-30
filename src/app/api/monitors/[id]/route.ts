import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { deleteMonitor, updateMonitorActive } from "@/lib/db/monitors";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireApiUser();
    if ("error" in auth) return auth.error;

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { active?: boolean };

    if (typeof body.active !== "boolean") {
      return NextResponse.json({ error: "active boolean is required." }, { status: 400 });
    }

    if (!auth.localMode && auth.supabase) {
      await updateMonitorActive(auth.supabase, auth.user.id, id, body.active);
    }

    return NextResponse.json({ ok: true, active: body.active });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update monitor." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  if (!auth.localMode && auth.supabase) {
    await deleteMonitor(auth.supabase, auth.user.id, id);
  }
  return NextResponse.json({ ok: true });
}
