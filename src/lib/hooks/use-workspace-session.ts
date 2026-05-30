"use client";

import { useEffect, useState } from "react";
import type { UserResponse } from "@supabase/supabase-js";
import { getLocalSession, repairLocalSessionFromCookie } from "@/lib/local-auth";
import { getBrowserClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";

/** True when the user can access workspace routes (Supabase session or local account). */
export function useWorkspaceSession() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!isBrowserSupabaseConfigured()) {
      const timeout = window.setTimeout(() => {
        repairLocalSessionFromCookie();
        setSignedIn(Boolean(getLocalSession()));
        setReady(true);
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const supabase = getBrowserClient();
    if (!supabase) {
      const timeout = window.setTimeout(() => setReady(true), 0);
      return () => window.clearTimeout(timeout);
    }

    void supabase.auth.getUser().then((result: UserResponse) => {
      setSignedIn(Boolean(result.data.user));
      setReady(true);
    });
  }, []);

  return { ready, signedIn };
}
