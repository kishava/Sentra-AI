"use client";

import Link from "next/link";
import { isBrowserSupabaseConfigured } from "@/lib/supabase/client";

export function LocalDevBanner() {
  if (isBrowserSupabaseConfigured()) return null;

  return (
    <div className="border-b border-amber-300/20 bg-amber-400/10 px-4 py-2 text-center text-xs text-amber-100 md:px-8">
      <span className="font-medium">Local dev mode</span>
      <span className="text-amber-100/80">
        {" "}
        — Supabase is off. Chat, Bright Data, and voice work; data is not saved to the cloud.{" "}
      </span>
      <Link href="/settings" className="underline underline-offset-2">
        Settings
      </Link>
    </div>
  );
}
