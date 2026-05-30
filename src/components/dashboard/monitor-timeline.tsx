"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BellRing,
  CheckCircle2,
  Clock3,
  FileText,
  GitCompareArrows,
  Webhook,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MonitorTimelineEvent, Severity } from "@/types/intelligence";

const severityTone: Record<Severity, string> = {
  low: "text-emerald-200",
  medium: "text-amber-200",
  high: "text-orange-200",
  critical: "text-rose-200",
};

const eventIcon = {
  change_detected: GitCompareArrows,
  check_complete: CheckCircle2,
  report_generated: FileText,
  workflow_triggered: Webhook,
  signal_matched: BellRing,
} as const;

const eventLabel = {
  change_detected: "Change detected",
  check_complete: "Check complete",
  report_generated: "Report generated",
  workflow_triggered: "Workflow triggered",
  signal_matched: "Signal matched",
} as const;

type MonitorTimelineProps = {
  monitorId?: string;
  limit?: number;
  className?: string;
};

export function MonitorTimeline({ monitorId, limit = 12, className }: MonitorTimelineProps) {
  const [events, setEvents] = useState<MonitorTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/timeline", { credentials: "include" });
        const text = await response.text();
        const data = (text.trim() ? JSON.parse(text) : {}) as { events?: MonitorTimelineEvent[] };
        if (!cancelled) {
          const serverEvents = response.ok ? data.events ?? [] : [];
          const filtered = monitorId
            ? serverEvents.filter((event) => !event.monitorId || event.monitorId === monitorId)
            : serverEvents;
          setEvents(filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit));
        }
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const interval = window.setInterval(load, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [monitorId, limit]);

  if (loading) {
    return (
      <Card className={cn("p-5 md:p-6", className)} glow>
        <p className="text-sm text-white/50">Loading operational timeline...</p>
      </Card>
    );
  }

  if (!events.length) {
    return (
      <Card className={cn("p-5 md:p-6", className)} glow>
        <p className="text-sm uppercase tracking-[0.24em] text-white/35">Event timeline</p>
        <p className="mt-4 text-sm leading-6 text-white/45">
          Run a monitor check to populate detected changes, signals, reports, and timeline events.
        </p>
      </Card>
    );
  }

  return (
    <Card className={cn("p-5 md:p-6", className)} glow>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-white/35">Event timeline</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Monitor operations</h3>
        </div>
        <Badge variant="cyan">{events.length} events</Badge>
      </div>

      <div className="mt-5 grid gap-3">
        {events.map((event) => {
          const Icon = eventIcon[event.type];
          return (
            <div key={event.id} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-cyan-300/10 text-sentra-cyan">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default">{eventLabel[event.type]}</Badge>
                    {event.severity && (
                      <span className={cn("text-xs font-medium uppercase", severityTone[event.severity])}>
                        {event.severity}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-white/38">
                      <Clock3 className="h-3 w-3" />
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-white/85">{event.summary}</p>
                  {event.metadata?.sourceUrl && (
                    <a
                      href={event.metadata.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block truncate text-xs text-cyan-100/70 hover:text-cyan-100"
                    >
                      {event.metadata.sourceUrl}
                    </a>
                  )}
                  {event.metadata?.oldValue && event.metadata?.newValue && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-white/55">
                        {event.metadata.oldValue}
                      </span>
                      <ArrowUpRight className="h-3 w-3 text-white/35" />
                      <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2 py-1 text-cyan-100">
                        {event.metadata.newValue}
                      </span>
                    </div>
                  )}
                  {event.affectedAccounts?.length ? (
                    <p className="mt-2 text-xs leading-5 text-white/42">
                      Accounts: {event.affectedAccounts.join(", ")}
                    </p>
                  ) : null}
                  {event.monitorRequirement && (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/38">{event.monitorRequirement}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
