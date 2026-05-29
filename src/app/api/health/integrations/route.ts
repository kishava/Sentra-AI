import { NextResponse } from "next/server";
import { getIntegrationStatusWithDiscovery } from "@/lib/integrations";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const status = await getIntegrationStatusWithDiscovery();
  let supabaseSchema = false;

  if (status.supabase) {
    try {
      const admin = createAdminClient();
      const { error } = await admin.from("profiles").select("id").limit(1);
      supabaseSchema = !error;
    } catch {
      supabaseSchema = false;
    }
  }

  return NextResponse.json({ ...status, supabaseSchema });
}
