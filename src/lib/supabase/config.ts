import { isSupabaseEnvConfigured } from "@/lib/supabase/env";

/** Shared Supabase env check — when false, app runs in local collaboration mode (no cloud DB). */
export function isSupabaseConfigured() {
  return isSupabaseEnvConfigured();
}

export const LOCAL_DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
export const LOCAL_DEV_USER_EMAIL = "local@sentra.dev";
