"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type IntegrationStatus = {
  supabase: boolean;
  supabaseSchema: boolean;
  openai: boolean;
  elevenlabs: boolean;
  brightData: {
    apiKey: boolean;
    serpZone: boolean;
    unlockerZone: boolean;
    ready: boolean;
    message: string;
  };
};

export default function SettingsPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);

  useEffect(() => {
    fetch("/api/health/integrations")
      .then((response) => response.json())
      .then((data: IntegrationStatus) => setStatus(data))
      .catch(() => setStatus(null));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Badge variant="cyan">Workspace settings</Badge>
        <h1 className="mt-4 text-4xl font-semibold text-white">Integrations</h1>
        <p className="mt-3 text-white/55">
          Server-side keys stay private. Bright Data zones must be created in your control panel.
        </p>
      </div>

      <Card className="p-6" glow>
        <h2 className="text-lg font-semibold text-white">Connection status</h2>
        <ul className="mt-5 space-y-4">
          <StatusRow label="Supabase credentials" ok={status?.supabase} />
          <StatusRow label="Supabase workspace schema" ok={status?.supabaseSchema} />
          <StatusRow label="OpenAI" ok={status?.openai} />
          <StatusRow label="ElevenLabs" ok={status?.elevenlabs} />
          <StatusRow label="Bright Data API key" ok={status?.brightData?.apiKey} />
          <StatusRow label="Bright Data SERP zone" ok={status?.brightData?.serpZone} />
          <StatusRow label="Bright Data Unlocker zone" ok={status?.brightData?.unlockerZone} />
        </ul>
        {status?.brightData?.message && (
          <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/60">
            {status.brightData.message}
          </p>
        )}
        {status?.supabase && !status.supabaseSchema && (
          <p className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">
            Authentication is connected, but workspace tables are missing. Run
            {" "}<code className="font-mono text-xs">supabase/migrations/001_initial_schema.sql</code>{" "}
            in the Supabase SQL Editor to enable regular accounts and saved data.
          </p>
        )}
        <Link
          href="https://brightdata.com/cp/zones"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-sm text-sentra-cyan hover:text-white"
        >
          Open Bright Data control panel <ExternalLink className="h-4 w-4" />
        </Link>
      </Card>
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <span className="text-sm text-white/70">{label}</span>
      {ok ? (
        <span className="flex items-center gap-1 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> Ready
        </span>
      ) : (
        <span className="flex items-center gap-1 text-xs text-amber-200">
          <XCircle className="h-4 w-4" /> Not configured
        </span>
      )}
    </li>
  );
}
