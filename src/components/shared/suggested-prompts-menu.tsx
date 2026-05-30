"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SuggestedPromptsMenuProps = {
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  menuId?: string;
  buttonLabel?: string;
  menuTitle?: string;
  menuSubtitle?: string;
};

export function SuggestedPromptsMenu({
  prompts: items,
  onSelect,
  disabled,
  menuId = "suggested-prompts-menu",
  buttonLabel = "Suggested questions",
  menuTitle = "Quick prompts",
  menuSubtitle = "Pick one to continue.",
}: SuggestedPromptsMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 288 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(352, Math.max(rect.width, 288));
    const maxLeft = window.innerWidth - width - 16;
    setMenuPosition({
      top: rect.bottom + 8,
      left: Math.max(16, Math.min(rect.left, maxLeft)),
      width,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const handlePointer = (event: MouseEvent) => {
      if (triggerRef.current?.contains(event.target as Node)) return;
      const menu = document.getElementById(menuId);
      if (menu?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const handleLayout = () => updateMenuPosition();
    document.addEventListener("mousedown", handlePointer);
    window.addEventListener("resize", handleLayout);
    window.addEventListener("scroll", handleLayout, true);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("resize", handleLayout);
      window.removeEventListener("scroll", handleLayout, true);
    };
  }, [open, updateMenuPosition, menuId]);

  const menu =
    typeof document !== "undefined"
      ? createPortal(
          <AnimatePresence>
            {open ? (
              <motion.div
                key="suggested-menu"
                id={menuId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                style={{
                  position: "fixed",
                  top: menuPosition.top,
                  left: menuPosition.left,
                  width: menuPosition.width,
                  zIndex: 200,
                }}
                className="overflow-hidden rounded-2xl border border-white/10 bg-sentra-ink shadow-2xl ring-1 ring-white/10"
                role="listbox"
                aria-label={buttonLabel}
              >
                <div className="border-b border-white/8 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/38">{menuTitle}</p>
                  <p className="mt-1 text-xs text-white/48">{menuSubtitle}</p>
                </div>
                <ul className="max-h-64 overflow-y-auto py-1">
                  {items.map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button"
                        role="option"
                        className="sentra-focus w-full px-4 py-3 text-left text-sm leading-6 text-white/72 transition hover:bg-cyan-300/10 hover:text-cyan-50"
                        onClick={() => {
                          setOpen(false);
                          onSelect(suggestion);
                        }}
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <div ref={triggerRef} className="relative z-10">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => {
          setOpen((value) => {
            const next = !value;
            if (next) window.requestAnimationFrame(updateMenuPosition);
            return next;
          });
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Sparkles className="h-4 w-4 text-sentra-cyan" />
        {buttonLabel}
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </Button>
      {menu}
    </div>
  );
}
