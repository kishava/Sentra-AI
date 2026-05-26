"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, MessageSquare, Radar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ParticleField } from "@/components/shared/particle-field";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const [brightDataReady, setBrightDataReady] = useState(false);

  useEffect(() => {
    fetch("/api/health/integrations")
      .then((response) => response.json())
      .then((data) => setBrightDataReady(Boolean(data?.brightData?.ready)))
      .catch(() => setBrightDataReady(false));
  }, []);

  async function completeOnboarding() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen">
      <ParticleField />
      <div className="container mx-auto max-w-2xl space-y-8 py-16">
        <div>
          <Badge variant="violet">Welcome to Sentra</Badge>
          <h1 className="mt-4 text-4xl font-semibold text-white">Set up in three steps</h1>
          <p className="mt-3 text-white/55">Get the most from Bright Data and your intelligence workspace.</p>
        </div>

        <Card className="p-6" glow>
          <Step
            done={brightDataReady}
            title="1. Connect Bright Data"
            description="Create SERP and/or Web Unlocker zones, add zone names to .env.local, redeem hackathon credits with promo unlocked."
          />
          <Step
            title="2. Try live chat"
            description='Ask: "Track competitor pricing changes" or paste a competitor URL.'
            action={
              <Link href="/chat?prompt=Track%20competitor%20pricing%20changes" className="text-sm text-sentra-cyan hover:text-white">
                Open chat <ArrowRight className="ml-1 inline h-4 w-4" />
              </Link>
            }
          />
          <Step
            title="3. Create a monitor"
            description="Alerts → describe what to watch → Check now runs Bright Data + AI matching."
            action={
              <Link href="/alerts" className="text-sm text-sentra-cyan hover:text-white">
                Open alerts <ArrowRight className="ml-1 inline h-4 w-4" />
              </Link>
            }
          />
        </Card>

        <Button variant="neon" size="lg" className="w-full" onClick={completeOnboarding}>
          Enter dashboard
        </Button>
      </div>
    </main>
  );
}

function Step({
  done,
  title,
  description,
  action,
}: {
  done?: boolean;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-b border-white/10 py-5 last:border-0">
      <div className="flex gap-3">
        {done ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
        ) : title.startsWith("2") ? (
          <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-sentra-cyan" />
        ) : (
          <Radar className="mt-0.5 h-5 w-5 shrink-0 text-sentra-cyan" />
        )}
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-white/55">{description}</p>
          {action && <div className="mt-2">{action}</div>}
        </div>
      </div>
    </div>
  );
}
