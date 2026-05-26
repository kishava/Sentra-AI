"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Code2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AiOrb } from "@/components/shared/ai-orb";
import { ParticleField } from "@/components/shared/particle-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type AuthShellProps = {
  mode: "sign-in" | "sign-up";
};

export function AuthShell({ mode }: AuthShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignUp = mode === "sign-up";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const supabase = createClient();
  const nextPath = searchParams.get("next") || "/dashboard";

  async function handleEmailAuth(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { company_name: companyName },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
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
    if (!email.trim()) {
      toast.error("Enter your work email first.");
      return;
    }

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
          <Link href="/" className="mb-12 inline-flex items-center gap-3 text-white">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sentra-cyan to-sentra-violet shadow-glow">
              <ShieldCheck className="h-5 w-5" />
            </span>
            Sentra AI
          </Link>
          <Badge variant="cyan">Secure enterprise access</Badge>
          <h1 className="mt-5 max-w-xl text-5xl font-semibold tracking-tight text-white">
            Enter the intelligence layer for teams that never fly blind.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-white/55">
            Sign in to save chat history, live briefings, and custom monitors powered by Bright Data.
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
                Email, magic link, Google, or GitHub — your intelligence workspace syncs securely.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="ghost"
                className="rounded-2xl"
                disabled={loading}
                onClick={() => handleOAuth("github")}
              >
                <Code2 className="h-4 w-4" /> GitHub
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-2xl"
                disabled={loading}
                onClick={() => handleOAuth("google")}
              >
                <Mail className="h-4 w-4" /> Google
              </Button>
            </div>
            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs uppercase tracking-[0.24em] text-white/35">or email</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
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
                placeholder="Password"
                type="password"
                required={!magicLinkSent}
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button variant="neon" size="lg" className="mt-2" disabled={loading} type="submit">
                {isSignUp ? "Create intelligence workspace" : "Enter Sentra OS"}
              </Button>
            </form>
            <Button
              type="button"
              variant="ghost"
              className="mt-3 w-full rounded-2xl"
              disabled={loading}
              onClick={handleMagicLink}
            >
              {magicLinkSent ? "Magic link sent — check your inbox" : "Send me a magic link instead"}
            </Button>
            <p className="mt-7 text-center text-sm text-white/50">
              {isSignUp ? "Already have an account?" : "New to Sentra AI?"}{" "}
              <Link
                href={isSignUp ? "/sign-in" : "/sign-up"}
                className="font-medium text-sentra-cyan hover:text-white"
              >
                {isSignUp ? "Sign in" : "Create account"}
              </Link>
            </p>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
