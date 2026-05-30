import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  LOCAL_SESSION_COOKIE,
  parseLocalSessionCookie,
} from "@/lib/local-auth/session-cookie";
import {
  isSupabaseConfigured,
  LOCAL_DEV_USER_EMAIL,
  LOCAL_DEV_USER_ID,
} from "@/lib/supabase/config";
import { getServerClient } from "@/lib/supabase/server";

export type ApiAuthContext = {
  user: User | { id: string; email?: string };
  supabase: SupabaseClient | null;
  localMode: boolean;
};

export async function getSessionUser() {
  if (!isSupabaseConfigured()) {
    return {
      user: null,
      supabaseConfigured: false as const,
      localMode: true as const,
      supabase: null as SupabaseClient | null,
    };
  }

  const supabase = await getServerClient();
  if (!supabase) {
    return {
      user: null,
      supabaseConfigured: false as const,
      localMode: true as const,
      supabase: null as SupabaseClient | null,
    };
  }

  const {
    data: { user: userFromGetUser },
  } = await supabase.auth.getUser();

  let user = userFromGetUser;
  if (!user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    user = session?.user ?? null;
  }

  if (!user) {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error) user = data.session?.user ?? null;
    } catch {
      // Session refresh is best-effort; local cookie may still authorize API calls.
    }
  }

  return {
    user,
    supabaseConfigured: true as const,
    localMode: false as const,
    supabase,
  };
}

async function getLocalSessionFromCookies() {
  const cookieStore = await cookies();
  return parseLocalSessionCookie(cookieStore.get(LOCAL_SESSION_COOKIE)?.value);
}

export async function requireApiUser(): Promise<{ error: NextResponse } | ApiAuthContext> {
  const session = await getSessionUser();
  const localSession = await getLocalSessionFromCookies();

  if (!session.supabaseConfigured || session.localMode) {
    return {
      user: localSession
        ? { id: localSession.userId, email: localSession.email }
        : { id: LOCAL_DEV_USER_ID, email: LOCAL_DEV_USER_EMAIL },
      supabase: null,
      localMode: true,
    };
  }

  if (localSession) {
    return {
      user: { id: localSession.userId, email: localSession.email },
      supabase: null,
      localMode: true,
    };
  }

  if (!session.user || !session.supabase) {
    return {
      error: NextResponse.json(
        {
          error: "Sign in required.",
          hint: "Sign in again from the account menu, or use a local workspace account so your session cookie is set.",
        },
        { status: 401 },
      ),
    };
  }

  return { user: session.user, supabase: session.supabase, localMode: false };
}
