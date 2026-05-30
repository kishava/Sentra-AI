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
    <section className="relative overflow-hidden pb-16 pt-28 md:pb-24 md:pt-36 lg:pb-20 lg:pt-40">
      <div className="container flex flex-col gap-12 lg:gap-14 xl:gap-16">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[0.92fr_1.08fr] xl:gap-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-start text-left lg:max-w-[34rem] xl:max-w-[36rem]"
          >
            <Badge variant="cyan" className="mb-6">
              Autonomous intelligence command center
            </Badge>

            <h1 className="max-w-[18ch] text-balance font-display text-[clamp(2.85rem,5.2vw,5.75rem)] font-bold leading-[1.04] tracking-[-0.025em] text-white xl:max-w-[20ch]">
              <span className="premium-gradient-text">
                Monitor competitors, verify evidence, and brief leaders automatically
              </span>
            </h1>

            <p className="type-body-lg mt-5 max-w-[48ch] text-pretty text-white/62 lg:mt-6">
              Sentra AI turns live web signals into verified intelligence reports with risk scoring,
              source evidence, action plans, and executive briefings for fast-moving teams.
            </p>

            <div className="mt-7 flex w-full flex-col gap-3 sm:mt-8 sm:w-auto sm:flex-row sm:items-center">
              <Button asChild size="lg" variant="neon" className="w-full sm:w-auto">
                <LandingAuthLink href={SENTRA_HOME}>
                  Launch workspace <ArrowRight className="h-5 w-5" />
                </LandingAuthLink>
              </Button>
              <Button asChild size="lg" variant="ghost" className="w-full sm:w-auto">
                <LandingAuthLink href="/reports">View reports</LandingAuthLink>
              </Button>
            </div>
          </motion.div>

          <motion.div
            className="relative mx-auto aspect-[5/6] w-full max-w-[400px] overflow-hidden rounded-[1.5rem] sm:aspect-[4/5] sm:max-w-[440px] lg:mx-0 lg:max-w-[420px] lg:justify-self-end xl:aspect-square xl:max-h-[440px] xl:max-w-[460px]"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.1 }}
          >
            <HeroVisual />
            <Card
              className="absolute left-2 top-6 w-[min(13.5rem,74%)] p-3 sm:left-4 sm:top-8 sm:w-52 sm:p-4"
              data-float
              glow
            >
              <p className="text-[0.6rem] uppercase tracking-[0.26em] text-cyan-100/60 sm:text-[0.65rem]">
                Monitor workflow
              </p>
              <p className="mt-1.5 text-lg font-semibold text-white sm:mt-2 sm:text-xl">Live watch</p>
              <p className="mt-0.5 text-[0.65rem] leading-4 text-white/50 sm:text-xs">
                competitors, pricing, hiring, sentiment
              </p>
            </Card>
            <Card
              className="absolute right-2 top-11 w-[min(10rem,58%)] p-3 sm:right-4 sm:top-12 sm:w-44 sm:p-4"
              data-float
            >
              <p className="text-[0.65rem] text-white/60 sm:text-xs">Evidence</p>
              <p className="mt-1 text-base font-semibold leading-snug text-white sm:text-lg">
                SERP + Unlocker
              </p>
              <p className="mt-0.5 text-[0.6rem] leading-4 text-white/45 sm:text-[0.65rem]">
                Live vs Sample labeled in the product
              </p>
            </Card>
            <Card
              className="absolute bottom-4 left-2 right-2 p-3 sm:bottom-6 sm:left-auto sm:right-4 sm:w-[min(18rem,84%)] sm:p-4"
              data-float
              glow
            >
              <p className="text-[0.6rem] uppercase tracking-[0.26em] text-violet-100/60 sm:text-[0.65rem]">
                Executive report
              </p>
              <p className="mt-1.5 text-[0.65rem] leading-5 text-white/70 sm:mt-2 sm:text-xs">
                Pricing pressure verified. Recommended action: brief strategic accounts and prepare
                retention offers.
              </p>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="grid gap-3 sm:grid-cols-3 sm:gap-4"
        >
          {cards.map((card) => (
            <Card key={card.label} className="flex h-full flex-col p-4 sm:p-5" data-float>
              <card.icon className="mb-3 h-5 w-5 text-sentra-cyan sm:mb-4" />
              <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/35 sm:text-xs">{card.label}</p>
              <p className="mt-2 text-xl font-semibold text-white sm:text-2xl">{card.value}</p>
              <p className="mt-1 text-sm leading-6 text-white/50">{card.detail}</p>
            </Card>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
