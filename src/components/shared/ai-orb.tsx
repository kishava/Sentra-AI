"use client";

import { motion } from "framer-motion";
import { useRef, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type AiOrbProps = {
  speaking?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** CSS-only orb — much lighter for dashboard / lists. */
  static?: boolean;
};

const sizes = {
  sm: "h-16 w-16",
  md: "h-28 w-28",
  lg: "h-52 w-52 md:h-72 md:w-72",
};

function subscribeReducedMotion(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function StaticOrb({ size, className, speaking }: { size: keyof typeof sizes; className?: string; speaking: boolean }) {
  return (
    <div className={cn("relative grid place-items-center", sizes[size], className)} aria-hidden>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sentra-cyan via-sentra-blue to-sentra-violet opacity-60 blur-xl" />
      <div className="absolute inset-[9%] rounded-full border border-white/20 bg-white/10" />
      <div
        className={cn(
          "absolute inset-[18%] rounded-full bg-[conic-gradient(from_90deg,rgba(83,244,255,0.95),rgba(168,85,247,0.8),rgba(255,79,216,0.8),rgba(83,244,255,0.95))]",
          !speaking && "ai-orb-spin-slow",
          speaking && "ai-orb-spin-fast",
        )}
      />
      <div className="absolute inset-[24%] rounded-full bg-sentra-ink shadow-inner shadow-black" />
      <div className="absolute inset-[34%] rounded-full bg-cyan-200/70 blur-lg" />
    </div>
  );
}

export function AiOrb({ speaking = false, size = "md", className, static: useStatic = false }: AiOrbProps) {
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => true);
  const orbRef = useRef<HTMLDivElement | null>(null);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const element = orbRef.current;
    if (!element || reducedMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const rect = element.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 14;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 14;
    element.style.setProperty("--orb-x", `${x}px`);
    element.style.setProperty("--orb-y", `${y}px`);
  }

  function handleMouseLeave() {
    const element = orbRef.current;
    if (!element) return;
    element.style.setProperty("--orb-x", "0px");
    element.style.setProperty("--orb-y", "0px");
  }

  if (useStatic || reducedMotion) {
    return <StaticOrb size={size} className={cn("premium-ai-orb", className)} speaking={speaking} />;
  }

  return (
    <motion.div
      ref={orbRef}
      className={cn("premium-ai-orb relative grid place-items-center", sizes[size], className)}
      animate={{ scale: speaking ? [1, 1.05, 1] : [1, 1.02, 1] }}
      whileHover={{ scale: speaking ? 1.08 : 1.045 }}
      transition={{ repeat: Infinity, duration: speaking ? 1.1 : 4.5, ease: "easeInOut" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sentra-cyan via-sentra-blue to-sentra-violet opacity-70 blur-xl" />
      <div className="absolute inset-[9%] rounded-full border border-white/20 bg-white/10" />
      <motion.div
        className="absolute inset-[18%] rounded-full bg-[conic-gradient(from_90deg,rgba(83,244,255,0.95),rgba(168,85,247,0.8),rgba(255,79,216,0.8),rgba(83,244,255,0.95))]"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: speaking ? 4 : 10, ease: "linear" }}
      />
      <div className="absolute inset-[24%] rounded-full bg-sentra-ink shadow-inner shadow-black" />
      <div className="absolute inset-[34%] rounded-full bg-cyan-200/80 blur-lg" />
    </motion.div>
  );
}
