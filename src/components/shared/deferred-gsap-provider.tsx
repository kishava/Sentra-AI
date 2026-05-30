"use client";

import dynamic from "next/dynamic";

const GsapProvider = dynamic(
  () => import("@/animations/gsap-provider").then((module) => module.GsapProvider),
  { ssr: false },
);

export function DeferredGsapProvider() {
  return <GsapProvider />;
}
