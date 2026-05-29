"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const PARTICLE_COUNT = 12;

function subscribeReducedMotion(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeVisibility(onStoreChange: () => void) {
  document.addEventListener("visibilitychange", onStoreChange);
  return () => document.removeEventListener("visibilitychange", onStoreChange);
}

function getPageHidden() {
  return document.hidden;
}

type ParticleFieldProps = {
  /** Skip animated dots — static background only (workspace pages). */
  lite?: boolean;
};

export function ParticleField({ lite = false }: ParticleFieldProps) {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => true,
  );
  const pageHidden = useSyncExternalStore(subscribeVisibility, getPageHidden, () => false);

  const showParticles = !lite && !reducedMotion && !pageHidden;

  return (
    <div
      className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", pageHidden && "opacity-90")}
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_circle_at_50%_20%,rgba(83,244,255,.055),transparent_48%)] transition-opacity duration-500" />
      <div className="absolute inset-0 bg-aurora opacity-80" />
      <div className="particle-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]" />
      {showParticles &&
        Array.from({ length: PARTICLE_COUNT }, (_, index) => (
          <span
            key={index}
            className="particle-dot absolute h-1 w-1 rounded-full bg-cyan-200/55 shadow-[0_0_12px_rgba(83,244,255,0.65)]"
            style={{
              left: `${(index * 37) % 100}%`,
              top: `${(index * 53) % 100}%`,
              animationDelay: `${(index % 6) * 0.5}s`,
              animationDuration: `${7 + (index % 5)}s`,
            }}
          />
        ))}
    </div>
  );
}
