"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BellRing, Bot, CheckCircle2, LayoutDashboard, Radar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  closeNewUserGuide,
  completeNewUserGuide,
  shouldShowNewUserGuide,
  skipNewUserGuide,
  wasNewUserGuideClosedThisSession,
} from "@/lib/local-auth";

const guideSteps = [
  {
    icon: LayoutDashboard,
    title: "Start on Dashboard",
    description: "Review live signals, market velocity, and the latest intelligence cards.",
    detail:
      "The dashboard is your morning briefing. Watch signal velocity, active alerts, market movement, and AI recommendations before diving deeper.",
    href: "/dashboard",
  },
  {
    icon: Bot,
    title: "Ask Sentra",
    description: "Use chat for live research, competitor checks, summaries, and voice responses.",
    detail:
      "Ask direct questions like competitor pricing changes, market risks, or leadership briefings. Sentra can answer with sources and read responses aloud.",
    href: "/chat?prompt=Summarize%20current%20market%20risks",
  },
  {
    icon: BellRing,
    title: "Create Alerts",
    description: "Tell Sentra what to monitor in plain language and let AI configure the rule.",
    detail:
      "Describe the signal you care about. Sentra interprets the requirement, tracks matches, and opens detailed alert reports with AI analysis.",
    href: "/alerts",
  },
];

export function NewUserGuideModal() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = guideSteps[stepIndex];
  const isLastStep = stepIndex === guideSteps.length - 1;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setOpen(shouldShowNewUserGuide() && !wasNewUserGuideClosedThisSession());
    }, 250);

    return () => window.clearTimeout(timeout);
  }, []);

  function closeGuide() {
    closeNewUserGuide();
    setOpen(false);
  }

  function skipGuide() {
    skipNewUserGuide();
    setOpen(false);
  }

  function finishGuide() {
    completeNewUserGuide();
    setOpen(false);
  }

  function nextStep() {
    if (isLastStep) return;
    setStepIndex((current) => Math.min(current + 1, guideSteps.length - 1));
  }

  function previousStep() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-sentra-ink/82 px-4 py-8 backdrop-blur-xl">
      <Card className="w-full max-w-4xl overflow-hidden p-0" glow>
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
              <Radar className="h-3.5 w-3.5" />
              New user guide
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">Welcome to Sentra AI</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Follow these steps to get from a new account to useful intelligence.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={closeGuide} aria-label="Close guide">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-4 border-b border-white/10 px-5 py-4 md:grid-cols-3 md:px-6">
          {guideSteps.map((step, index) => (
            <button
              key={step.title}
              type="button"
              onClick={() => setStepIndex(index)}
              className={cn(
                "sentra-focus flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition",
                stepIndex === index && "border-cyan-200/30 bg-cyan-300/10",
              )}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-cyan-300/10 text-sentra-cyan">
                <step.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] uppercase tracking-[0.18em] text-white/35">Step {index + 1}</span>
                <span className="block truncate text-sm font-medium text-white">{step.title}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="p-5 md:p-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-cyan-300/10 text-sentra-cyan">
                <currentStep.icon className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.22em] text-white/35">
                  Step {stepIndex + 1} of {guideSteps.length}
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{currentStep.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/62">{currentStep.description}</p>
                <p className="mt-4 text-sm leading-7 text-white/50">{currentStep.detail}</p>
              </div>
            </div>
          </div>

          {isLastStep && (
            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                <div>
                  <p className="font-medium text-white">Recommended first action</p>
                  <p className="mt-1 text-sm leading-6 text-white/55">
                    Create one monitor in Alerts, then open the generated report when a match appears.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={skipGuide}>
              Skip guide
            </Button>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={previousStep} disabled={stepIndex === 0}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              {isLastStep ? (
                <Button variant="neon" asChild>
                  <Link href="/alerts" onClick={finishGuide}>
                    Create first monitor
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button variant="neon" onClick={nextStep}>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
