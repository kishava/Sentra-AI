"use client";

import { useEffect, useRef, useState } from "react";
import { Lightbulb, X } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function apply(selection: MonitorPromptSelection) {
    onChange(selection.requirement);
    onPickSuggestion?.(selection);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        placeholder="Describe what to watch in plain English…"
        className="min-h-[128px] text-base"
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      {!value.trim() && !open && (
        <p className="mt-2 flex items-center gap-2 text-xs text-white/40">
          <Lightbulb className="h-3.5 w-3.5 text-sentra-cyan" />
          Click the box for ready-made monitor ideas
        </p>
      )}

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-cyan-200/25 bg-sentra-panel shadow-2xl shadow-black/50"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <p className="text-sm font-medium text-white">Try one of these</p>
            <button
              type="button"
              className="sentra-focus rounded-lg p-1 text-white/50 hover:text-white"
              onClick={() => setOpen(false)}
              aria-label="Close suggestions"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[min(22rem,55vh)] overflow-y-auto p-3">
            <p className="px-1 pb-2 text-xs uppercase tracking-wide text-white/35">Quick starts</p>
            <div className="grid gap-2">
              {quickSuggestions.map((item) => (
                <button
                  key={item.requirement}
                  type="button"
                  role="option"
                  className={cn(
                    "sentra-focus rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-sm leading-6 text-white/75",
                    "transition hover:border-cyan-200/30 hover:bg-cyan-300/10 hover:text-white",
                  )}
                  onClick={() => apply(item)}
                >
                  {item.requirement}
                </button>
              ))}
            </div>
            <p className="mt-4 px-1 pb-2 text-xs uppercase tracking-wide text-white/35">Templates</p>
            <div className="grid gap-2">
              {gtmMonitorTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  role="option"
                  className={cn(
                    "sentra-focus rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition",
                    "hover:border-cyan-200/30 hover:bg-cyan-300/10",
                  )}
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
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
