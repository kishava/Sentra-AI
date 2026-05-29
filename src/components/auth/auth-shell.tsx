"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Code2, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";
import { AiOrb } from "@/components/shared/ai-orb";
import { BrandLogo } from "@/components/shared/brand-mark";
import { ParticleField } from "@/components/shared/particle-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createLocalAccount, markNewUserGuidePending, signInLocalAccount } from "@/lib/local-auth";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { DEMO_USER_EMAIL, isDemoUserEmail } from "@/lib/supabase/config";
import { getBrowserClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";

type AuthShellProps = {
  mode: "sign-in" | "sign-up";
};

const DEMO_PASSWORD = "admin123";

type AuthCapabilities = {
  providers: { email: boolean; google: boolean; github: boolean };
  workspaceReady: boolean | null;
};

export function AuthShell({ mode }: AuthShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignUp = mode === "sign-up";
  const supabaseEnabled = isBrowserSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [capabilities, setCapabilities] = useState<AuthCapabilities | null>(null);
  const nextPath = safeRedirectPath(searchParams.get("next"));
  const authError = searchParams.get("error");
  const checkingCapabilities = supabaseEnabled && !capabilities;
  const workspaceUnavailable = supabaseEnabled && capabilities?.workspaceReady === false;
  const hasSocialProvider = Boolean(capabilities?.providers.github || capabilities?.providers.google);
  const authToggleHref = isSignUp
    ? `/sign-in${nextPath !== "/dashboard" ? `?next=${encodeURIComponent(nextPath)}` : ""}`
    : `/sign-up${nextPath !== "/dashboard" ? `?next=${encodeURIComponent(nextPath)}` : ""}`;

  useEffect(() => {
    if (!supabaseEnabled) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void fetch("/api/auth/capabilities", { cache: "no-store", signal: controller.signal })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: AuthCapabilities | null) => {
          if (data) setCapabilities(data);
        })
        .catch(() => {
          setCapabilities({
            providers: { email: true, google: false, github: false },
            workspaceReady: null,
          });
        });
    }, 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [supabaseEnabled]);

  async function handleLocalAuth() {
    setLoading(true);
    try {
      if (isSignUp) {
        await createLocalAccount({ email, password, companyName });
        toast.success("Local account created", {
          description: "This account is stored only in this browser until Supabase is configured.",
        });
      } else {
        await signInLocalAccount({ email, password });
        toast.success("Signed in locally", {
          description: "Your local workspace session is active in this browser.",
        });
      }
      router.push(nextPath);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Local authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailAuth(event: React.FormEvent) {
    event.preventDefault();

    if (!supabaseEnabled) {
      await handleLocalAuth();
      return;
    }

    const supabase = getBrowserClient();
    if (!supabase) return;

    if (checkingCapabilities) {
      toast.message("Checking workspace authentication setup. Please try again in a moment.");
      return;
    }

    if (workspaceUnavailable && (isSignUp || !isDemoUserEmail(email))) {
      toast.error("Workspace setup is incomplete.", {
        description: "Apply the Supabase schema migration, or use the demo account for now.",
      });
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const response = await fetch("/api/auth/sign-up", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, companyName }),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Could not create account.");
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        markNewUserGuidePending();
        toast.success("Workspace created — welcome to Sentra.");
        router.push(nextPath);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(nextPath);
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!supabaseEnabled) {
      toast.message("Magic links need Supabase.", {
        description: "Use local email and password until you add Supabase keys.",
      });
      return;
    }

    if (!email.trim()) {
      toast.error("Enter your work email first.");
      return;
    }

    if (workspaceUnavailable) {
      toast.error("Magic link sign-in is unavailable until workspace setup is complete.", {
        description: "Apply the Supabase schema migration, or use demo access.",
      });
      return;
    }

    const supabase = getBrowserClient();
    if (!supabase) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (error) throw error;
      setMagicLinkSent(true);
      toast.success("Magic link sent", { description: "Open the link in your email to continue." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send magic link.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    if (!supabaseEnabled) {
      toast.message(`${provider} sign-in needs Supabase.`, {
        description: "Use local email and password until you add Supabase keys.",
      });
      return;
    }

    if (capabilities && !capabilities.providers[provider]) {
      toast.error(`${provider === "google" ? "Google" : "GitHub"} sign-in is not enabled in Supabase.`);
      return;
    }

    if (workspaceUnavailable) {
      toast.error("Workspace setup is incomplete.", {
        description: "Apply the Supabase schema migration before enabling cloud sign-in.",
      });
      return;
    }

    const supabase = getBrowserClient();
    if (!supabase) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OAuth sign-in failed.");
      setLoading(false);
    }
  }

  async function handleDemoSignIn() {
    const supabase = getBrowserClient();
    if (!supabase) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: DEMO_USER_EMAIL,
        password: DEMO_PASSWORD,
      });
      if (error) throw error;
      router.push(nextPath);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Demo sign-in failed.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden">
      <ParticleField />
      <div className="container grid min-h-screen items-center gap-12 py-10 lg:grid-cols-[0.92fr_1.08fr]">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="hidden lg:block"
        >
          <Link href="/" className="group mb-12 inline-flex text-white" aria-label="Santra home">
            <BrandLogo className="h-[220px] w-[330px]" />
          </Link>
          <Badge variant="cyan">{supabaseEnabled ? "Secure enterprise access" : "Local auth"}</Badge>
          <h1 className="type-display-lg mt-5 max-w-2xl text-white">
            Enter the intelligence layer for teams that never fly blind.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-white/55">
            {supabaseEnabled
              ? "Sign in to save chat history, live briefings, and custom monitors powered by Bright Data."
              : "Create a browser-local account now. Supabase auth and cloud saves can be added later without changing the flow."}
          </p>
          <AiOrb size="lg" className="mt-12" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="mx-auto max-w-xl p-7 md:p-10" glow>
            <div className="mb-8">
              <Badge variant="violet">{isSignUp ? "Create workspace" : "Welcome back"}</Badge>
              <h2 className="mt-4 text-3xl font-semibold text-white">
                {isSignUp ? "Start monitoring the live web" : "Sign in to Sentra OS"}
              </h2>
              <p className="mt-2 text-sm text-white/50">
                {supabaseEnabled
                  ? "Use an available authentication method below to access your workspace."
                  : "No Supabase keys detected. Use email and password for local browser auth."}
              </p>
            </div>

            {authError && (
              <div className="mb-6 flex gap-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Sign-in could not be completed. The link may be expired, invalid, or missing redirect configuration.</p>
              </div>
            )}

            {workspaceUnavailable && (
              <div className="mb-6 flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Cloud workspace setup is incomplete. Run the Supabase database migration before creating real accounts.
                  Demo access is available below.
                </p>
              </div>
            )}

            {supabaseEnabled && hasSocialProvider && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {capabilities?.providers.github && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-2xl"
                      disabled={loading || workspaceUnavailable}
                      onClick={() => handleOAuth("github")}
                    >
                      <Code2 className="h-4 w-4" /> GitHub
                    </Button>
                  )}
                  {capabilities?.providers.google && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-2xl"
                      disabled={loading || workspaceUnavailable}
                      onClick={() => handleOAuth("google")}
                    >
                      <Mail className="h-4 w-4" /> Google
                    </Button>
                  )}
                </div>
                <div className="my-7 flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-xs uppercase tracking-[0.24em] text-white/35">or email</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
              </>
            )}

            <form className="grid gap-4" onSubmit={handleEmailAuth}>
              {isSignUp && (
                <Input
                  placeholder="Company name"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                />
              )}
              <Input
                placeholder="Work email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Input
                placeholder={supabaseEnabled ? "Password" : "Local password"}
                type="password"
                required={!magicLinkSent}
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button
                variant={supabaseEnabled ? "neon" : "ghost"}
                size="lg"
                className="mt-2"
                disabled={loading || checkingCapabilities || (isSignUp && workspaceUnavailable)}
                type="submit"
              >
                {supabaseEnabled
                  ? isSignUp
                    ? "Create intelligence workspace"
                    : "Enter Sentra OS"
                  : isSignUp
                    ? "Create local account"
                    : "Sign in locally"}
              </Button>
            </form>

            {supabaseEnabled && capabilities?.providers.email !== false && !workspaceUnavailable && !isSignUp && (
              <Button
                type="button"
                variant="ghost"
                className="mt-3 w-full rounded-2xl"
                disabled={loading}
                onClick={handleMagicLink}
              >
                {magicLinkSent ? "Magic link sent — check your inbox" : "Send me a magic link instead"}
              </Button>
            )}

            {supabaseEnabled && !isSignUp && (
              <div className="mt-6 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Demo access</p>
                    <p className="mt-1 text-xs text-white/52">{DEMO_USER_EMAIL} / {DEMO_PASSWORD}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={handleDemoSignIn}>
                    <KeyRound className="h-4 w-4" />
                    Use demo
                  </Button>
                </div>
              </div>
            )}

            <p className="mt-7 text-center text-sm text-white/50">
              {isSignUp ? "Already have an account?" : "New to Sentra AI?"}{" "}
              <Link href={authToggleHref} className="font-medium text-sentra-cyan">
                {isSignUp ? "Sign in" : "Create account"}
              </Link>
            </p>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
