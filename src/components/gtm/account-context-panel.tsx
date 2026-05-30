"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getWorkspaceContext,
  saveWorkspaceContext,
  type WorkspaceContext,
} from "@/lib/gtm/workspace-context";

export function AccountContextPanel({ compact = false }: { compact?: boolean }) {
  const [context, setContext] = useState<WorkspaceContext>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setContext(getWorkspaceContext()), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function saveContext() {
    setSaving(true);
    try {
      saveWorkspaceContext(context);
      toast.success("Account context saved", {
        description: "Monitors, chat, and briefings will use this GTM profile.",
      });
    } finally {
      window.setTimeout(() => setSaving(false), 300);
    }
  }

  const hasContext = Boolean(
    context.companyName?.trim() ||
      context.industry?.trim() ||
      context.competitors?.trim() ||
      context.markets?.trim(),
  );

  return (
    <Card className={compact ? "p-4" : "p-5 md:p-6"} glow>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="violet">Account enrichment</Badge>
          <h2 className={`mt-3 font-semibold text-white ${compact ? "text-lg" : "text-xl"}`}>
            GTM account context
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Company profile injected into chat, monitors, briefings, and CRM exports.
          </p>
        </div>
        <Building2 className="h-5 w-5 shrink-0 text-sentra-cyan" />
      </div>

      {!hasContext && (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white/45">
          No account context yet.{" "}
          <Link href="/onboarding" className="text-sentra-cyan underline underline-offset-2">
            Run onboarding
          </Link>{" "}
          or fill the fields below.
        </p>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Input
          placeholder="Company name"
          value={context.companyName ?? ""}
          onChange={(event) => setContext((current) => ({ ...current, companyName: event.target.value }))}
        />
        <Input
          placeholder="Industry"
          value={context.industry ?? ""}
          onChange={(event) => setContext((current) => ({ ...current, industry: event.target.value }))}
        />
        <Textarea
          placeholder="Competitors to watch (comma or line separated)"
          value={context.competitors ?? ""}
          onChange={(event) => setContext((current) => ({ ...current, competitors: event.target.value }))}
          className="min-h-20 md:col-span-2"
        />
        <Input
          placeholder="Priority markets / regions"
          value={context.markets ?? ""}
          onChange={(event) => setContext((current) => ({ ...current, markets: event.target.value }))}
          className="md:col-span-2"
        />
      </div>

      <Button variant="neon" size="sm" className="mt-4" onClick={saveContext} disabled={saving}>
        <Save className="h-4 w-4" />
        {saving ? "Saving…" : "Save account context"}
      </Button>
    </Card>
  );
}
