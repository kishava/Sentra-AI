import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseConfigured) {
    return { user: null, supabaseConfigured: false as const };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, supabaseConfigured: true as const, supabase };
}

export async function requireApiUser() {
  const session = await getSessionUser();

  if (!session.supabaseConfigured) {
    return {
      error: NextResponse.json(
        {
          error:
            "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        },
        { status: 503 },
      ),
    };
  }

  if (!session.user) {
    return {
      error: NextResponse.json({ error: "Sign in required." }, { status: 401 }),
    };
  }

  return { user: session.user, supabase: session.supabase };
}
