/** Supabase URL from env. */
export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

/** Publishable (sb_publishable_…) or legacy anon JWT — both work with @supabase/ssr. */
export function getSupabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

/** Secret (sb_secret_…) or legacy service_role JWT — server-only. */
export function getSupabaseServiceRoleKey() {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}

export function isSupabaseEnvConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
