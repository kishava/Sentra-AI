"use client";

import { useEffect } from "react";
import gsap from "gsap";

export function GsapProvider() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to("[data-float]", {
        y: -14,
        duration: 2.8,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: 0.18,
      });

      gsap.to("[data-glow-sweep]", {
        backgroundPosition: "200% center",
        duration: 7,
        ease: "none",
        repeat: -1,
      });
    });

    return () => ctx.revert();
  }, []);

  return null;
}
