import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export function isBrowserSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

/** Returns null when Supabase env vars are not set (local dev without cloud). */
export function getBrowserClient(): SupabaseClient | null {
  if (!isBrowserSupabaseConfigured()) return null;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/** @deprecated Prefer getBrowserClient() — throws if used without env configured. */
export function createClient(): SupabaseClient {
  const client = getBrowserClient();
  if (!client) {
    throw new Error(
      "Supabase is not configured. For local development, leave URL/key empty and use Enter workspace (local mode) on sign-in.",
    );
  }
  return client;
}
