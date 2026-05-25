"use client";

import { motion } from "framer-motion";

const particles = Array.from({ length: 34 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  top: `${(index * 53) % 100}%`,
  delay: (index % 8) * 0.45,
  duration: 6 + (index % 7),
}));

export function ParticleField() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-aurora opacity-80" />
      <div className="absolute inset-0 bg-radial-grid bg-[length:48px_48px] opacity-45 [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]" />
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute h-1 w-1 rounded-full bg-cyan-200/60 shadow-[0_0_18px_rgba(83,244,255,0.9)]"
          style={{ left: particle.left, top: particle.top }}
          animate={{
            y: [-8, -34, -8],
            opacity: [0.15, 0.9, 0.15],
            scale: [0.8, 1.35, 0.8],
          }}
          transition={{
            repeat: Infinity,
            duration: particle.duration,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
