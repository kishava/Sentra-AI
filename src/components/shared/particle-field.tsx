"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

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
  const pageHidden = useSyncExternalStore(subscribeVisibility, getPageHidden, () => false);

  return (
    <div
      className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", pageHidden && "opacity-90")}
      aria-hidden
    >
      <div className="sentra-ambient-glow pointer-events-none absolute inset-[-10%] transition-opacity duration-500" />
      <div className={cn("absolute inset-0 bg-aurora opacity-55", lite && "opacity-35")} />
      <div className="sentra-soft-depth absolute inset-0" />
    </div>
  );
}
