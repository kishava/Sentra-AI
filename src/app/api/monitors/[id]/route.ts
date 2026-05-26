import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { deleteMonitor } from "@/lib/db/monitors";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  if (!auth.localMode && auth.supabase) {
    await deleteMonitor(auth.supabase, auth.user.id, id);
  }
  return NextResponse.json({ ok: true });
}
