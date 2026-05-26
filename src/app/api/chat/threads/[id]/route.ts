import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { getThreadMessages } from "@/lib/db/chat";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const messages = await getThreadMessages(auth.supabase, auth.user.id, id);
  return NextResponse.json({ messages });
}
