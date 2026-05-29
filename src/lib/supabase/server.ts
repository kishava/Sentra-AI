import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function getServerClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();

  return createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from Server Component — middleware will refresh session.
          }
        },
      },
    },
  );
}

export async function createClient(): Promise<SupabaseClient> {
  const client = await getServerClient();
  if (!client) {
    throw new Error("Supabase is not configured on the server.");
  }
  return client;
}
