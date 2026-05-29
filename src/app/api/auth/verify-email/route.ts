import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/session";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

/** Optional profile email verification — sends a confirmation link when requested. */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.localMode || !auth.supabase) {
    return NextResponse.json({ error: "Cloud account required." }, { status: 400 });
  }

  const {
    data: { user },
  } = await auth.supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "No email on this account." }, { status: 400 });
  }

  if (user.email_confirmed_at) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  try {
    const origin = process.env.SENTRA_APP_URL?.trim() || "http://localhost:3001";
    const url = getSupabaseUrl();
    const anonKey = getSupabaseAnonKey();
    const response = await fetch(`${url}/auth/v1/resend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        type: "signup",
        email: user.email,
        options: { emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
      }),
    });

    if (!response.ok) {
      const details = (await response.json().catch(() => null)) as { msg?: string; message?: string } | null;
      return NextResponse.json(
        { error: details?.msg ?? details?.message ?? "Could not send verification email." },
        { status: response.status },
      );
    }

    return NextResponse.json({ ok: true, sent: true });
  } catch (error) {
    console.error("Verification email failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send verification email." },
      { status: 500 },
    );
  }
}
