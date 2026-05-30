"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getServiceById, sentraServices, type SentraService } from "@/data/our-services";
import { useWorkspaceSession } from "@/lib/hooks/use-workspace-session";
import { cn } from "@/lib/utils";
import { WorkspacePage, WorkspacePageHeader, WorkspaceSection } from "@/components/workspace/workspace-page";

function signUpUrl(next: string) {
  return `/sign-in?next=${encodeURIComponent(next)}`;
}

export function OurServicesPage({ basePath = "/services" }: { basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, signedIn } = useWorkspaceSession();
  const [selectedService, setSelectedService] = useState<SentraService | null>(null);

  const guideId = searchParams.get("guide");

  useEffect(() => {
    if (!ready || !signedIn || !guideId) return;
    const service = getServiceById(guideId);
    if (!service) return;
    const timeout = window.setTimeout(() => setSelectedService(service), 0);
    return () => window.clearTimeout(timeout);
  }, [ready, signedIn, guideId]);

  function requireRegistration(next: string) {
    router.push(signUpUrl(next));
  }

  function openGuide(service: SentraService) {
    if (!signedIn) {
      requireRegistration(`${basePath}?guide=${service.id}`);
      return;
    }
    setSelectedService(service);
    router.replace(`${basePath}?guide=${service.id}`, { scroll: false });
  }

  function closeGuide() {
    setSelectedService(null);
    router.replace(basePath, { scroll: false });
  }

  function openWorkspace(service: SentraService) {
    if (!signedIn) {
      requireRegistration(service.href);
      return;
    }
    router.push(service.href);
  }

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        badge="Our services"
        title="Enterprise intelligence, end to end"
        description="Browse every Sentra capability below — no account needed. Tap Guide on any card for a walkthrough; register when you are ready to use the live workspace."
        aside={
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-sentra-cyan" />
              <p className="font-medium text-white">{signedIn ? "Workspace active" : "Browse freely"}</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-white/55">
              {signedIn
                ? "Each Guide walks you through the service and opens the workspace when you finish."
                : "Summaries are always visible. Register to unlock interactive guides."}
            </p>
          </div>
        }
      />

      <WorkspaceSection title="Capabilities">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {sentraServices.map((service) => (
          <Card key={service.id} className="flex min-w-0 flex-col p-5" glow>
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-300/10 text-sentra-cyan">
                <service.icon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-white/35">{service.tagline}</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{service.title}</h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/58">{service.summary}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {service.highlights.map((highlight) => (
                <span
                  key={highlight}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/50"
                >
                  {highlight}
                </span>
              ))}
            </div>
            <div className="mt-6">
              <Button variant="neon" onClick={() => openGuide(service)}>
                <BookOpen className="h-4 w-4" />
                Guide
              </Button>
            </div>
          </Card>
        ))}
      </div>
      </WorkspaceSection>

      {selectedService && signedIn && (
        <ServiceGuideModal service={selectedService} onClose={closeGuide} onOpenWorkspace={openWorkspace} />
      )}
    </WorkspacePage>
  );
}

function ServiceGuideModal({
  service,
  onClose,
  onOpenWorkspace,
}: {
  service: SentraService;
  onClose: () => void;
  onOpenWorkspace: (service: SentraService) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = service.steps[stepIndex];
  const isLastStep = stepIndex === service.steps.length - 1;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-sentra-ink/82 px-4 py-8 backdrop-blur-xl">
      <Card className="w-full max-w-4xl overflow-hidden p-0" glow>
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
              <service.icon className="h-3.5 w-3.5" />
              {service.tagline}
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">{service.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{service.description}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close guide">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-4 border-b border-white/10 px-5 py-4 md:grid-cols-4 md:px-6">
          {service.steps.map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => setStepIndex(index)}
              className={cn(
                "sentra-focus rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition",
                stepIndex === index && "border-cyan-200/30 bg-cyan-300/10",
              )}
            >
              <span className="block text-[10px] uppercase tracking-[0.18em] text-white/35">Step {index + 1}</span>
              <span className="mt-1 line-clamp-2 block text-xs leading-5 text-white/65">{step}</span>
            </button>
          ))}
        </div>

        <div className="p-5 md:p-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-white/35">
              Step {stepIndex + 1} of {service.steps.length}
            </p>
            <p className="mt-4 text-xl font-semibold leading-8 text-white">{currentStep}</p>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
                disabled={stepIndex === 0}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              {isLastStep ? (
                <Button variant="neon" onClick={() => onOpenWorkspace(service)}>
                  Open {service.title}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="neon"
                  onClick={() => setStepIndex((current) => Math.min(current + 1, service.steps.length - 1))}
                >
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
