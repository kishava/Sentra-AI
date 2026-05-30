import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupabaseAuthSettings = {
  external?: {
    email?: boolean;
    google?: boolean;
    github?: boolean;
  };
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      supabase: false,
      providers: { email: false, google: false, github: false },
      workspaceReady: false,
    });
  }

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  let providers = { email: true, google: false, github: false };

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey },
      cache: "no-store",
    });
    if (response.ok) {
      const settings = (await response.json()) as SupabaseAuthSettings;
      providers = {
        email: settings.external?.email !== false,
        google: Boolean(settings.external?.google),
        github: Boolean(settings.external?.github),
      };
    }
  } catch {
    // Keep email as the conservative fallback when auth settings cannot be reached.
  }

  let workspaceReady = false;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").select("id").limit(1);
    workspaceReady = !error;
  } catch {
    workspaceReady = false;
  }

  return NextResponse.json(
    { supabase: true, providers, workspaceReady },
    { headers: { "Cache-Control": "no-store" } },
  );
}
