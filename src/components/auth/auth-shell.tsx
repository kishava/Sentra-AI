"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Code2, Mail, ShieldCheck } from "lucide-react";
import { AiOrb } from "@/components/shared/ai-orb";
import { ParticleField } from "@/components/shared/particle-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuthShellProps = {
  mode: "sign-in" | "sign-up";
};

export function AuthShell({ mode }: AuthShellProps) {
  const isSignUp = mode === "sign-up";

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
            Authenticate into a premium command surface for AI chat, live signals,
            risk alerts, and voice briefings.
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
                {isSignUp
                  ? "Spin up your autonomous intelligence workspace in seconds."
                  : "Continue to your intelligence command center."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="ghost" className="rounded-2xl">
                <Code2 className="h-4 w-4" /> GitHub
              </Button>
              <Button variant="ghost" className="rounded-2xl">
                <Mail className="h-4 w-4" /> Google
              </Button>
            </div>
            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs uppercase tracking-[0.24em] text-white/35">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <form className="grid gap-4">
              {isSignUp && <Input placeholder="Company name" />}
              <Input placeholder="Work email" type="email" />
              <Input placeholder="Password" type="password" />
              <Button variant="neon" size="lg" className="mt-2">
                {isSignUp ? "Create intelligence workspace" : "Enter Sentra OS"}
              </Button>
            </form>
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
