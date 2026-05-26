"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, User } from "lucide-react";
import type { UserResponse } from "@supabase/supabase-js";
import { getBrowserClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function getInitialLabel() {
  return isBrowserSupabaseConfigured() ? null : "Local dev";
}

export function UserMenu() {
  const router = useRouter();
  const [label, setLabel] = useState<string | null>(getInitialLabel);

  useEffect(() => {
    if (!isBrowserSupabaseConfigured()) return;

    const supabase = getBrowserClient();
    if (!supabase) return;

    void supabase.auth.getUser().then((result: UserResponse) => {
      setLabel(result.data.user?.email ?? null);
    });
  }, []);

  async function signOut() {
    if (!isBrowserSupabaseConfigured()) {
      router.push("/sign-in");
      return;
    }

    const supabase = getBrowserClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  if (!label) return null;

  return (
    <div className="hidden items-center gap-2 md:flex">
      <span className="flex max-w-[180px] items-center gap-2 truncate rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/60">
        <User className="h-3.5 w-3.5 shrink-0 text-sentra-cyan" />
        <span className="truncate">{label}</span>
      </span>
      <Button variant="ghost" size="icon" className="rounded-2xl" onClick={signOut} aria-label="Sign out">
        <LogOut className="h-4 w-4" />
      </Button>
      <Link
        href="/settings"
        className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/60 transition hover:text-white"
      >
        Settings
      </Link>
    </div>
  );
}
