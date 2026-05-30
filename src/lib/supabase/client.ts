import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseEnvConfigured } from "@/lib/supabase/env";

let browserClient: SupabaseClient | null = null;

export function isBrowserSupabaseConfigured() {
  return isSupabaseEnvConfigured();
}

/** Returns null when Supabase env vars are not set (local dev without cloud). */
export function getBrowserClient(): SupabaseClient | null {
  if (!isBrowserSupabaseConfigured()) return null;

  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
  }

  return browserClient;
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
