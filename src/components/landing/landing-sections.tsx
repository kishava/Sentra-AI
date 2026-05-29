"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  Bot,
  Building2,
  Globe2,
  Mic2,
  Radar,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { MotionSection } from "@/components/shared/motion-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { sentraServices } from "@/data/our-services";

const workflowSteps = [
  { icon: Radar, label: "Collect live web evidence" },
  { icon: Sparkles, label: "Analyze with enterprise prompts" },
  { icon: ShieldCheck, label: "Score risk and confidence" },
  { icon: Workflow, label: "Trigger recommendations and alerts" },
];

const features = [
  {
    icon: Globe2,
    title: "Live web operating layer",
    body: "Bright Data-powered collection monitors SERPs, competitor sites, pricing pages, hiring signals, and market chatter.",
  },
  {
    icon: Bot,
    title: "AI analyst workflows",
    body: "OpenAI summarizes weak signals into risks, opportunities, recommendations, and confidence-scored action plans.",
  },
  {
    icon: BellRing,
    title: "Autonomous alert center",
    body: "Animated severity queues surface launches, sentiment shifts, pricing changes, and strategic movements as they happen.",
  },
  {
    icon: Mic2,
    title: "Voice intelligence",
    body: "ElevenLabs voice playback turns enterprise briefings into a cinematic AI analyst experience.",
  },
];

const stats = [
  ["8.2k", "sources scanned / hour"],
  ["94%", "analysis confidence"],
  ["3.8x", "faster executive briefings"],
  ["24/7", "autonomous monitoring"],
];

const partners = ["Apex Cloud", "Northstar Capital", "VantaGrid", "Ion Labs", "HelioWorks"];

export function LandingSections() {
  return (
    <>
      <MotionSection id="platform" className="container py-20">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <Badge variant="violet">Enterprise intelligence OS</Badge>
            <h2 className="type-display-lg mt-4 max-w-4xl text-white">
              A command center for the signals your market tries to hide.
            </h2>
          </div>
          <p className="max-w-md text-white/55">
            Sentra turns messy web evidence into decision-ready enterprise intelligence.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
            >
              <Card className="group h-full p-6 transition duration-300" glow>
                <feature.icon className="h-8 w-8 text-sentra-cyan transition" />
                <h3 className="mt-8 text-xl font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/55">{feature.body}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </MotionSection>

      <MotionSection id="intelligence" className="container py-20">
        <Card className="overflow-hidden p-8 md:p-10" glow>
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <Badge variant="cyan">Autonomous workflow</Badge>
              <h2 className="type-heading-lg mt-4 text-white">
                From live web evidence to boardroom-ready recommendations.
              </h2>
              <p className="mt-5 text-white/55">
                Monitor, enrich, analyze, narrate, and alert from one futuristic command surface.
              </p>
            </div>
            <div className="grid gap-4">
              {workflowSteps.map((step, index) => (
                <div key={step.label} className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-4">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300/10 text-sentra-cyan">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="font-medium text-white">{step.label}</span>
                  <span className="ml-auto text-sm text-white/35">0{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </MotionSection>

      <MotionSection id="services-preview" className="container py-20">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <Badge variant="cyan">Our services</Badge>
            <h2 className="type-heading-lg mt-4 max-w-3xl text-white">
              Professional intelligence services built into one workspace.
            </h2>
          </div>
          <Button asChild variant="ghost">
            <a href="/services">
              View all services
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {sentraServices.slice(0, 4).map((service) => (
            <Card key={service.id} className="p-6" glow>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300/10 text-sentra-cyan">
                <service.icon className="h-6 w-6" />
              </span>
              <p className="mt-6 text-xs uppercase tracking-[0.22em] text-white/35">{service.tagline}</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{service.title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/55">{service.summary}</p>
            </Card>
          ))}
        </div>
      </MotionSection>

      <MotionSection className="container py-20">
        <div className="grid gap-5 md:grid-cols-4">
          {stats.map(([value, label]) => (
            <Card key={label} className="p-6 text-center">
              <p className="text-4xl font-semibold text-white">{value}</p>
              <p className="mt-2 text-sm uppercase tracking-[0.24em] text-white/40">{label}</p>
            </Card>
          ))}
        </div>
      </MotionSection>

      <MotionSection id="voice-ai" className="container py-20">
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-8 md:p-10" glow>
            <Building2 className="h-9 w-9 text-sentra-cyan" />
            <h2 className="type-heading-lg mt-8 text-white">
              Trusted by teams that move before the market does.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/55">
              “Sentra feels less like a dashboard and more like a strategic analyst that never
              sleeps. It surfaced a pricing move our team would have missed for days.”
            </p>
            <p className="mt-7 text-sm font-semibold text-white">Maya Chen, VP Strategy at Apex Cloud</p>
          </Card>
          <Card className="p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-white/40">Enterprise partners</p>
            <div className="mt-8 grid gap-4">
              {partners.map((partner) => (
                <div key={partner} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white/65">
                  {partner}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </MotionSection>

      <MotionSection className="container pb-24 pt-12">
        <Card className="relative overflow-hidden p-10 text-center md:p-16" glow>
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-violet-500/10 to-pink-400/10" />
          <div className="relative">
            <Badge variant="success">Hackathon ready</Badge>
            <h2 className="type-display-lg mx-auto mt-5 max-w-4xl text-white">
              Build the enterprise intelligence muscle your competitors cannot see.
            </h2>
            <Button asChild size="lg" variant="neon" className="mt-9">
              <a href="/dashboard">Launch the live demo</a>
            </Button>
          </div>
        </Card>
      </MotionSection>
    </>
  );
}
