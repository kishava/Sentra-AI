"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useWorkspaceSession } from "@/lib/hooks/use-workspace-session";
import { signInFor } from "@/lib/landing/auth-links";

type LandingAuthLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

/** Sends guests to sign-in; signed-in users go straight to the workspace route. */
export function LandingAuthLink({ href, ...props }: LandingAuthLinkProps) {
  const { ready, signedIn } = useWorkspaceSession();
  const destination = ready && signedIn ? href : signInFor(href);

  return <Link href={destination} {...props} />;
}
