import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { createChatThread, listChatThreads } from "@/lib/db/chat";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.localMode || !auth.supabase) {
    return NextResponse.json({ threads: [] });
  }

  const threads = await listChatThreads(auth.supabase, auth.user.id);
  return NextResponse.json({ threads });
}

export async function POST() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.localMode || !auth.supabase) {
    return NextResponse.json({ thread: null, localMode: true });
  }

  const thread = await createChatThread(auth.supabase, auth.user.id);
  return NextResponse.json({ thread });
}
