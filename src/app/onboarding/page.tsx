"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BellRing,
  Bot,
  CheckCircle2,
  DatabaseZap,
  LayoutDashboard,
  Radar,
  ScanSearch,
  Settings,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ParticleField } from "@/components/shared/particle-field";
import { toast } from "sonner";
import { getBrowserClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";

const guideSections = [
  {
    icon: LayoutDashboard,
    title: "Read the dashboard",
    description: "Start with live signal velocity, market movement, current risk, and active briefings.",
    href: "/dashboard",
  },
  {
    icon: Bot,
    title: "Ask Sentra",
    description: "Use chat for live-web research, competitor analysis, summaries, and voice responses.",
    href: "/chat?prompt=Summarize%20current%20market%20risks",
  },
  {
    icon: BellRing,
    title: "Create monitors",
    description: "Describe what you care about in plain language. AI turns it into watch rules and alerts.",
    href: "/alerts",
  },
  {
    icon: ScanSearch,
    title: "Investigate evidence",
    description: "Use AI Analyst and Visual Forensics when a signal needs deeper review or image-based context.",
    href: "/analyst",
  },
];

const quickStart = [
  "Add company context so Sentra knows what to watch.",
  "Generate starter monitors for competitors, pricing, market risks, and sentiment.",
  "Run the first monitor check and open a verified report.",
  "Enable browser or webhook alerts for action delivery.",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [brightDataReady, setBrightDataReady] = useState(false);
  const [openAiReady, setOpenAiReady] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [markets, setMarkets] = useState("");
  const [alertPreference, setAlertPreference] = useState("high");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/health/integrations")
      .then((response) => response.json())
      .then((data) => {
        setBrightDataReady(Boolean(data?.brightData?.ready));
        setOpenAiReady(Boolean(data?.openai?.ready ?? data?.openAI?.ready));
      })
      .catch(() => {
        setBrightDataReady(false);
        setOpenAiReady(false);
      });
  }, []);

  function starterMonitorRequirements() {
    const company = companyName.trim() || "our company";
    const competitorList = competitors
      .split(/[,\n]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4);
    const marketText = markets.trim() || "our priority markets";
    const industryText = industry.trim() || "our industry";
    const severity = alertPreference === "critical" ? "critical" : alertPreference === "medium" ? "medium" : "high";

    return [
      competitorList.length
        ? `Alert me when ${competitorList.join(", ")} launch products, change pricing, or publish strategic announcements that affect ${company}.`
        : `Alert me when direct competitors launch products, change pricing, or publish strategic announcements that affect ${company}.`,
      `Monitor pricing, procurement, and customer sentiment shifts in ${industryText}.`,
      `Watch ${marketText} for regulatory, market, and demand risks that could affect ${company}.`,
    ].map((requirement) => ({ requirement, minimumSeverity: severity }));
  }

  async function createStarterMonitors() {
    const requirements = starterMonitorRequirements();
    const responses = await Promise.all(
      requirements.map(async (monitor) => {
        const response = await fetch("/api/monitors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requirement: monitor.requirement,
            category: "any",
            minimumSeverity: monitor.minimumSeverity,
            active: true,
          }),
        });
        return response.json() as Promise<{ monitor?: unknown; localMode?: boolean }>;
      }),
    );
    const localMonitors = responses
      .filter((item) => item.localMode && item.monitor)
      .map((item) => item.monitor as {
        id: string;
        requirement: string;
        category: string;
        minimum_severity: string;
        keywords?: string[];
        active: boolean;
      })
      .map((monitor) => ({
        id: monitor.id,
        requirement: monitor.requirement,
        category: monitor.category,
        minimumSeverity: monitor.minimum_severity,
        active: monitor.active,
        createdAt: new Date().toISOString(),
        keywords: monitor.keywords ?? [],
        alertedSignalIds: [],
      }));
    if (localMonitors.length) {
      const existing = JSON.parse(window.localStorage.getItem("sentra-monitors") || "[]") as unknown[];
      window.localStorage.setItem("sentra-monitors", JSON.stringify([...localMonitors, ...existing]));
    }
  }

  async function completeOnboarding() {
    setSaving(true);
    if (isBrowserSupabaseConfigured()) {
      const supabase = getBrowserClient();
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from("profiles")
            .update({
              onboarding_completed: true,
              company_name: companyName.trim() || null,
            })
            .eq("id", user.id);
          if (error) {
            toast.message("Cloud profile not ready", { description: "Continuing with local workspace setup." });
          }
        }
      }
    }

    window.localStorage.setItem(
      "sentra-workspace-profile",
      JSON.stringify({
        companyName,
        industry,
        competitors,
        markets,
        alertPreference,
        completedAt: new Date().toISOString(),
      }),
    );

    try {
      await createStarterMonitors();
      toast.success("Workspace prepared", { description: "Starter monitors were created from your company context." });
    } catch {
      toast.message("Profile saved", { description: "You can create starter monitors from Alerts." });
    }

    setSaving(false);
    router.push("/alerts");
    router.refresh();
  }

  return (
    <main className="min-h-screen">
      <ParticleField />
      <div className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="p-6 md:p-8" glow>
            <Badge variant="violet">New user guide</Badge>
            <h1 className="type-display-lg mt-4 max-w-4xl text-white">
              Welcome to Sentra AI
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/58">
              Add your company context once. Sentra will create starter monitors for
              competitors, pricing, risk, and priority markets.
            </p>
            <div className="mt-7 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Company name" />
                <Input value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="Industry, e.g. AI infrastructure" />
              </div>
              <Textarea
                value={competitors}
                onChange={(event) => setCompetitors(event.target.value)}
                placeholder="Competitors to monitor, comma separated"
                className="min-h-20"
              />
              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                <Input value={markets} onChange={(event) => setMarkets(event.target.value)} placeholder="Priority markets or regions" />
                <select
                  value={alertPreference}
                  onChange={(event) => setAlertPreference(event.target.value)}
                  className="sentra-focus h-12 rounded-2xl border border-white/10 bg-sentra-panel px-4 text-sm text-white"
                  aria-label="Alert threshold"
                >
                  <option value="medium">Medium+ alerts</option>
                  <option value="high">High+ alerts</option>
                  <option value="critical">Critical only</option>
                </select>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="neon" size="lg" onClick={completeOnboarding} disabled={saving}>
                  {saving ? "Preparing workspace" : "Create starter monitors"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="lg" asChild>
                  <Link href="/settings">
                    <Settings className="h-4 w-4" />
                    Configure integrations
                  </Link>
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6" glow>
            <p className="text-sm uppercase tracking-[0.24em] text-white/35">Setup status</p>
            <div className="mt-5 grid gap-3">
              <StatusRow ready={brightDataReady} label="Bright Data" description="Live web evidence and signal collection" />
              <StatusRow ready={openAiReady} label="OpenAI" description="Chat, monitor intent, and alert summaries" />
              <StatusRow ready label="Workspace" description="Dashboard, chat, alerts, and analyst tools" />
            </div>
          </Card>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {guideSections.map((section) => (
            <Card key={section.title} className="p-5" glow>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-300/10 text-sentra-cyan">
                <section.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-xl font-semibold text-white">{section.title}</h2>
              <p className="mt-2 min-h-20 text-sm leading-6 text-white/55">{section.description}</p>
              <Link href={section.href} className="mt-4 inline-flex items-center gap-2 text-sm text-sentra-cyan hover:text-white">
                Open
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
          ))}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-6" glow>
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-sentra-cyan" />
              <h2 className="text-xl font-semibold text-white">First 10 minutes</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {quickStart.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold text-cyan-100">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-white/62">{item}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6" glow>
            <div className="flex items-center gap-3">
              <Radar className="h-5 w-5 text-sentra-cyan" />
              <h2 className="text-xl font-semibold text-white">Example monitor prompts</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {[
                "Alert me when Tesla pricing incentives change.",
                "Tell me if a competitor launches an autonomous procurement product.",
                "Watch for negative sentiment about enterprise cloud billing.",
                "Monitor AI infrastructure hiring spikes in Singapore.",
              ].map((prompt) => (
                <Link
                  key={prompt}
                  href={`/alerts?guidePrompt=${encodeURIComponent(prompt)}`}
                  className="sentra-focus rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-sm leading-6 text-white/62 transition hover:border-cyan-200/30 hover:text-white"
                >
                  {prompt}
                </Link>
              ))}
            </div>
          </Card>
        </section>

        <div className="mt-8 flex justify-center">
          <Button variant="neon" size="lg" onClick={completeOnboarding}>
            Finish guide and create monitors
          </Button>
        </div>
      </div>
    </main>
  );
}

function StatusRow({
  ready,
  label,
  description,
}: {
  ready: boolean;
  label: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      {ready ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
      ) : (
        <DatabaseZap className="mt-0.5 h-5 w-5 shrink-0 text-sentra-cyan" />
      )}
      <div className="min-w-0">
        <p className="font-medium text-white">{label}</p>
        <p className="mt-1 text-sm leading-5 text-white/45">{description}</p>
      </div>
    </div>
  );
}
