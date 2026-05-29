"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type IntegrationPayload = {
  brightData?: { ready?: boolean; message?: string };
  hackathon?: { demoFallbackAllowed?: boolean; production?: boolean };
};

export function GtmBrightDataBanner() {
  const [status, setStatus] = useState<IntegrationPayload | null>(null);

  useEffect(() => {
    fetch("/api/health/integrations")
      .then((response) => response.json())
      .then((data: IntegrationPayload) => setStatus(data))
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;
  if (status.brightData?.ready) return null;

  const production = status.hackathon?.production ?? false;
  const demoAllowed = status.hackathon?.demoFallbackAllowed ?? true;

  return (
    <div
      className={
        production
          ? "border-b border-rose-400/30 bg-rose-500/15 px-4 py-2.5 text-center text-xs text-rose-50 md:px-8"
          : "border-b border-amber-300/20 bg-amber-400/10 px-4 py-2.5 text-center text-xs text-amber-100 md:px-8"
      }
    >
      <span className="font-semibold">
        {production ? "Bright Data required for live GTM intelligence" : "Bright Data not ready"}
      </span>
      <span className={production ? "text-rose-50/85" : "text-amber-100/80"}>
        {" "}
        — {status.brightData?.message ?? "Configure SERP and Web Unlocker zones."}
        {production && !demoAllowed
          ? " Sample/demo evidence is disabled in production."
          : " Briefings and monitors may show sample data until zones are configured."}
      </span>{" "}
      <Link href="/settings" className="underline underline-offset-2">
        Open Settings
      </Link>
    </div>
  );
}
