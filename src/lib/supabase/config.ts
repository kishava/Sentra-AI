/** Shared Supabase env check — when false, app runs in local collaboration mode (no cloud DB). */
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

export const LOCAL_DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
export const LOCAL_DEV_USER_EMAIL = "local@sentra.dev";
