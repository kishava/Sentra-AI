"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowRight, FileCheck2, Radar, ShieldAlert } from "lucide-react";
import { LandingAuthLink } from "@/components/landing/landing-auth-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SENTRA_HOME } from "@/lib/landing/auth-links";

const HeroVisual = dynamic(
  () => import("@/components/landing/hero-visual").then((module) => module.HeroVisual),
  { ssr: false },
);

const cards = [
  { icon: Radar, label: "Monitor", value: "Scheduled", detail: "cron checks + manual Check now" },
  { icon: ShieldAlert, label: "Verify", value: "Source", detail: "claim-level evidence checks" },
  { icon: FileCheck2, label: "Report", value: "Board", detail: "executive action briefings" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-32 md:pb-28 md:pt-40">
      <div className="container grid items-start gap-12 xl:grid-cols-[1.02fr_0.98fr] xl:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-4xl xl:mx-0"
        >
          <Badge variant="cyan" className="mb-5">Autonomous intelligence command center</Badge>
          <h1 className="max-w-[18ch] text-balance font-display text-[clamp(2.9rem,4.9vw,5.6rem)] font-bold leading-[1.02] tracking-tight text-white">
            <span className="premium-gradient-text">
              Monitor competitors, verify evidence, and brief leaders automatically
            </span>
          </h1>
          <p className="type-body-lg mt-6 max-w-[58ch] text-white/65">
            Sentra AI turns live web signals into verified intelligence reports with risk
            scoring, source evidence, action plans, and executive briefings for fast-moving teams.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" variant="neon">
              <LandingAuthLink href={SENTRA_HOME}>
                Launch workspace <ArrowRight className="h-5 w-5" />
              </LandingAuthLink>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <LandingAuthLink href="/reports">View reports</LandingAuthLink>
            </Button>
          </div>
          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            {cards.map((card) => (
              <Card key={card.label} className="p-4" data-float>
                <card.icon className="mb-4 h-5 w-5 text-sentra-cyan" />
                <p className="text-xs uppercase tracking-[0.3em] text-white/35">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
                <p className="text-sm text-white/50">{card.detail}</p>
              </Card>
            ))}
          </div>
        </motion.div>
        <motion.div
          className="relative mx-auto min-h-[520px] w-full max-w-[680px] overflow-hidden rounded-[2rem] xl:mx-0"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.1 }}
        >
          <HeroVisual />
          <Card className="absolute left-2 top-10 w-64 p-5 md:left-6 xl:left-0" data-float glow>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/60">Monitor workflow</p>
            <p className="mt-3 text-2xl font-semibold text-white">Live watch</p>
            <p className="text-sm text-white/50">competitors, pricing, hiring, sentiment</p>
          </Card>
          <Card className="absolute bottom-6 right-2 w-[min(22rem,92vw)] p-5 md:bottom-10 md:right-6 xl:bottom-8 xl:right-0" data-float glow>
            <p className="text-xs uppercase tracking-[0.3em] text-violet-100/60">Executive report</p>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Pricing pressure verified. Recommended action: brief strategic accounts and
              prepare retention offers.
            </p>
          </Card>
          <Card className="absolute right-3 top-16 w-52 p-5 md:right-10 xl:right-7" data-float>
            <p className="text-sm text-white/60">Evidence</p>
            <p className="mt-2 text-xl font-semibold leading-snug text-white">SERP + Unlocker</p>
            <p className="mt-2 text-xs text-white/45">Live vs Sample labeled in the product</p>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
