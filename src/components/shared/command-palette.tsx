"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Command } from "cmdk";
import { Bot, LineChart, Radar, Search, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
  { icon: Bot, label: "Ask Sentra to analyze Tesla competitors", hint: "AI chat" },
  { icon: Radar, label: "Track AI startups in Singapore", hint: "Monitor" },
  { icon: ShieldAlert, label: "Open critical risk alerts", hint: "Alerts" },
  { icon: LineChart, label: "Summarize current market trends", hint: "Briefing" },
  { icon: Sparkles, label: "Generate daily intelligence briefing", hint: "AI" },
];

export function CommandPalette({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        className={cn(
          "sentra-focus flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/60 backdrop-blur-xl transition hover:border-cyan-200/30 hover:text-white",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        Search signals, companies, risks...
        <kbd className="ml-auto rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-[10px] text-white/50">
          Ctrl K
        </kbd>
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 grid place-items-start bg-sentra-ink/70 px-4 pt-24 backdrop-blur-md"
            onClick={() => setOpen(false)}
          >
            <Command
              className="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-sentra-panel shadow-2xl shadow-black/30"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-white/10 px-5">
                <Search className="h-4 w-4 text-sentra-cyan" />
                <Command.Input
                  autoFocus
                  placeholder="Command Sentra AI..."
                  className="h-14 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                />
              </div>
              <Command.List className="max-h-96 overflow-y-auto p-3">
                <Command.Empty className="p-4 text-sm text-white/50">No signal found.</Command.Empty>
                <Command.Group heading="Autonomous Actions" className="text-xs text-white/40">
                  {actions.map((action) => (
                    <Command.Item
                      key={action.label}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/80 data-[selected=true]:bg-white/10 data-[selected=true]:text-white"
                      onSelect={() => setOpen(false)}
                    >
                      <action.icon className="h-4 w-4 text-sentra-cyan" />
                      <span>{action.label}</span>
                      <span className="ml-auto text-xs text-white/40">{action.hint}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </div>,
          document.body,
        )}
    </>
  );
}
