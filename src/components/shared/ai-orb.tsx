"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type AiOrbProps = {
  speaking?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "h-16 w-16",
  md: "h-28 w-28",
  lg: "h-52 w-52 md:h-72 md:w-72",
};

export function AiOrb({ speaking = false, size = "md", className }: AiOrbProps) {
  return (
    <motion.div
      className={cn("relative grid place-items-center", sizes[size], className)}
      animate={{ scale: speaking ? [1, 1.05, 1] : [1, 1.025, 1] }}
      transition={{ repeat: Infinity, duration: speaking ? 1.1 : 3.4, ease: "easeInOut" }}
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sentra-cyan via-sentra-blue to-sentra-violet opacity-70 blur-2xl" />
      <div className="absolute inset-[9%] rounded-full border border-white/20 bg-white/10 backdrop-blur-2xl" />
      <motion.div
        className="absolute inset-[18%] rounded-full bg-[conic-gradient(from_90deg,rgba(83,244,255,0.95),rgba(168,85,247,0.8),rgba(255,79,216,0.8),rgba(83,244,255,0.95))]"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: speaking ? 3.2 : 8, ease: "linear" }}
      />
      <div className="absolute inset-[24%] rounded-full bg-sentra-ink shadow-inner shadow-black" />
      <div className="absolute inset-[34%] rounded-full bg-cyan-200/80 blur-xl" />
      {[0, 1, 2].map((ring) => (
        <motion.div
          key={ring}
          className="absolute rounded-full border border-cyan-200/20"
          style={{ inset: `${ring * 10}%` }}
          animate={{ opacity: [0.1, 0.55, 0.1], scale: [0.86, 1.02, 0.86] }}
          transition={{ repeat: Infinity, duration: 2.4 + ring, delay: ring * 0.35 }}
        />
      ))}
    </motion.div>
  );
}
