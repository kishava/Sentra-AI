"use client";

import { useId, useRef, useState } from "react";
import { ChevronDown, Lightbulb, Sparkles } from "lucide-react";
import { gtmMonitorTemplates } from "@/data/gtm-monitor-templates";
import type { MonitorPromptSelection } from "@/lib/monitor-history";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type { MonitorPromptSelection };

type MonitorPromptFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onPickSuggestion?: (selection: MonitorPromptSelection) => void;
  suggestions: MonitorPromptSelection[];
  suggestionsTitle?: string;
};

export function MonitorPromptField({
  value,
  onChange,
  onPickSuggestion,
  suggestions,
  suggestionsTitle = "Quick examples",
}: MonitorPromptFieldProps) {
  const listId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const trimmed = value.trim();
  const showIdeas = ideasOpen && trimmed.length < 80;

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
        onChange={(event) => onChange(event.target.value)}
        placeholder="Describe in simple words — e.g. watch keels stock for price or news changes"
        className="min-h-[112px] text-base"
        aria-describedby={showIdeas ? listId : undefined}
      />

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
          {suggestionsTitle.includes("your") ? (
            <Sparkles className="h-3.5 w-3.5" />
          ) : (
            <Lightbulb className="h-3.5 w-3.5" />
          )}
          {ideasOpen ? "Hide suggestions" : suggestionsTitle.includes("your") ? "Suggestions for you" : "Need an idea?"}
          <ChevronDown className={cn("h-3.5 w-3.5 transition", ideasOpen && "rotate-180")} />
        </button>
        {!ideasOpen && (
          <span className="text-xs text-white/35">Plain language works best</span>
        )}
      </div>

      {showIdeas && (
        <div
          id={listId}
          className="rounded-2xl border border-white/10 bg-black/20 p-4"
          role="region"
          aria-label="Monitor suggestions"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-white/40">{suggestionsTitle}</p>
          <ul className="mt-3 grid gap-2">
            {suggestions.map((item) => (
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
            {templatesOpen ? "Hide starter templates" : "Starter templates"}
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
