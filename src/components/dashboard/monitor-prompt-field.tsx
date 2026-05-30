"use client";

import { useId, useRef, useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";
import { gtmMonitorTemplates } from "@/data/gtm-monitor-templates";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type MonitorPromptSelection = {
  requirement: string;
  category?: "any" | "competitor" | "market" | "risk" | "pricing" | "hiring" | "sentiment";
};

const quickSuggestions: MonitorPromptSelection[] = [
  {
    requirement: "Alert me when a competitor changes pricing on their public plans page.",
    category: "pricing",
  },
  {
    requirement: "Tell me if a rival launches a new product in our category.",
    category: "competitor",
  },
  {
    requirement: "Watch for negative sentiment or complaints about our brand online.",
    category: "sentiment",
  },
  {
    requirement: "Monitor hiring spikes for enterprise sales roles at key competitors.",
    category: "hiring",
  },
];

type MonitorPromptFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onPickSuggestion?: (selection: MonitorPromptSelection) => void;
};

export function MonitorPromptField({ value, onChange, onPickSuggestion }: MonitorPromptFieldProps) {
  const listId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const trimmed = value.trim();
  const showIdeas = ideasOpen && trimmed.length < 12;

  function apply(selection: MonitorPromptSelection) {
    onChange(selection.requirement);
    onPickSuggestion?.(selection);
    setIdeasOpen(false);
    setTemplatesOpen(false);
    textareaRef.current?.focus();
  }

  return (
    <div className="space-y-3">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          if (event.target.value.trim().length >= 12) {
            setIdeasOpen(false);
          }
        }}
        placeholder="e.g. Alert me when Acme changes enterprise pricing or launches a new SKU"
        className="min-h-[112px] text-base"
        aria-describedby={showIdeas ? listId : undefined}
      />

      {trimmed.length < 12 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={cn(
              "sentra-focus inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              ideasOpen
                ? "border-cyan-200/40 bg-cyan-300/15 text-cyan-100"
                : "border-white/10 bg-white/[0.04] text-white/55 hover:border-cyan-200/25 hover:text-white/80",
            )}
            onClick={() => setIdeasOpen((open) => !open)}
            aria-expanded={ideasOpen}
            aria-controls={listId}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            {ideasOpen ? "Hide ideas" : "Need an idea?"}
            <ChevronDown className={cn("h-3.5 w-3.5 transition", ideasOpen && "rotate-180")} />
          </button>
          {!ideasOpen && (
            <span className="text-xs text-white/35">Type your own, or browse examples</span>
          )}
        </div>
      )}

      {showIdeas && (
        <div
          id={listId}
          className="rounded-2xl border border-white/10 bg-black/20 p-4"
          role="region"
          aria-label="Monitor examples"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-white/40">Quick examples</p>
          <ul className="mt-3 grid gap-2">
            {quickSuggestions.map((item) => (
              <li key={item.requirement}>
                <button
                  type="button"
                  className="sentra-focus w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-sm leading-6 text-white/75 transition hover:border-cyan-200/30 hover:bg-cyan-300/10 hover:text-white"
                  onClick={() => apply(item)}
                >
                  {item.requirement}
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="sentra-focus mt-4 text-xs font-medium text-cyan-100/80 hover:text-cyan-100"
            onClick={() => setTemplatesOpen((open) => !open)}
            aria-expanded={templatesOpen}
          >
            {templatesOpen ? "Hide templates" : "More templates"}
          </button>

          {templatesOpen && (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {gtmMonitorTemplates.map((template) => (
                <li key={template.id}>
                  <button
                    type="button"
                    className="sentra-focus h-full w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-left transition hover:border-cyan-200/30 hover:bg-cyan-300/10"
                    onClick={() =>
                      apply({
                        requirement: template.requirement,
                        category: template.category,
                      })
                    }
                  >
                    <span className="block text-sm font-medium text-white">{template.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-white/45 line-clamp-2">
                      {template.requirement}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
