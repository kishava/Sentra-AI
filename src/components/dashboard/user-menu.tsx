"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  if (!email) return null;

  return (
    <div className="hidden items-center gap-2 md:flex">
      <span className="flex max-w-[180px] items-center gap-2 truncate rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/60">
        <User className="h-3.5 w-3.5 shrink-0 text-sentra-cyan" />
        <span className="truncate">{email}</span>
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
