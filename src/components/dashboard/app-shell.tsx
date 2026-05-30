"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BellRing,
  Bot,
  BriefcaseBusiness,
  ScanSearch,
  FileCheck2,
  LayoutDashboard,
  Radar,
  Settings,
} from "lucide-react";
import { CommandPalette } from "@/components/shared/command-palette";
import { BrandLogo } from "@/components/shared/brand-mark";
import { GtmBrightDataBanner } from "@/components/shared/gtm-bright-data-banner";
import { LocalDevBanner } from "@/components/shared/local-dev-banner";
import { ParticleField } from "@/components/shared/particle-field";
import { NewUserGuideModal } from "@/components/dashboard/new-user-guide-modal";
import { UserMenu } from "@/components/dashboard/user-menu";
import { getLocalSession, repairLocalSessionFromCookie, repairLocalStorageQuota } from "@/lib/local-auth";
import { isBrowserSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Intelligence", icon: Bot },
  { href: "/alerts", label: "Monitors", icon: Radar },
  { href: "/reports", label: "Reports", icon: FileCheck2 },
  { href: "/analyst", label: "Analyst", icon: ScanSearch },
  { href: "/workspace/services", label: "Services", icon: BriefcaseBusiness },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const analystMode = searchParams.get("mode");
  const [locationHash, setLocationHash] = useState("");
  const prefetchedRoutesRef = useRef(new Set<string>());

  const prefetchRoute = useCallback(
    (href: string) => {
      if (href.includes("#") || prefetchedRoutesRef.current.has(href)) return;
      prefetchedRoutesRef.current.add(href);
      router.prefetch(href);
    },
    [router],
  );

  useEffect(() => {
    repairLocalStorageQuota();
    repairLocalSessionFromCookie();
  }, []);

  useEffect(() => {
    const preloadWorkspaceRoutes = () => nav.forEach((item) => prefetchRoute(item.href));
    const idleCallback =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(preloadWorkspaceRoutes, { timeout: 1200 })
        : globalThis.setTimeout(preloadWorkspaceRoutes, 250);

    return () => {
      if ("cancelIdleCallback" in window && typeof idleCallback === "number") {
        window.cancelIdleCallback(idleCallback);
      } else {
        globalThis.clearTimeout(idleCallback);
      }
    };
  }, [prefetchRoute]);

  useEffect(() => {
    const syncHash = () => setLocationHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  const isActive = (href: string) => {
    const [path, hash] = href.split("#");
    if (hash && path === pathname) {
      return locationHash === `#${hash}`;
    }
    if (href === "/analyst") return pathname === "/analyst" && analystMode !== "vision";
    if (href === "/analyst?mode=vision") return pathname === "/analyst" && analystMode === "vision";
    return pathname === path;
  };

  useEffect(() => {
    if (isBrowserSupabaseConfigured()) return;
    if (getLocalSession()) return;

    const next = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    router.replace(`/sign-in?next=${encodeURIComponent(next)}`);
  }, [pathname, router, searchParams]);

  return (
    <main className="min-h-screen">
      <ParticleField lite />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-white/10 bg-sentra-ink/92 p-5 lg:flex">
        <Link href="/" className="group flex shrink-0 justify-center px-2 pb-5 pt-2 text-white" aria-label="Sentra home">
          <BrandLogo className="h-[112px] w-[168px]" />
        </Link>
        <nav className="mt-8 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto overscroll-contain pr-1">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              prefetch
              onFocus={() => prefetchRoute(item.href)}
              onPointerEnter={() => prefetchRoute(item.href)}
              onTouchStart={() => prefetchRoute(item.href)}
              className={cn(
                "nav-glow-link flex min-w-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white/58 transition",
                isActive(item.href) && "bg-white/[0.08] text-white",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0 text-sentra-cyan" />
              <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          ))}
        </nav>
        <Link
          href="/workspace/services"
          className="nav-glow-link mt-5 shrink-0 rounded-3xl border border-white/10 bg-white/[0.05] p-4 transition"
        >
          <p className="text-sm font-medium text-white">Live intelligence pipeline</p>
          <p className="mt-1 text-xs leading-5 text-white/45">
            Explore Sentra services for monitors, reports, analyst workspaces, and live data pipelines.
          </p>
        </Link>
      </aside>
      <section className="pb-24 lg:pb-0 lg:pl-72">
        <LocalDevBanner />
        <GtmBrightDataBanner />
        <header className="sticky top-0 z-30 border-b border-white/10 bg-sentra-ink/92 px-4 py-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3 md:gap-4">
            <CommandPalette className="min-w-0 flex-1" />
            <Link
              href="/alerts"
              className="nav-glow-link hidden rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-white/60 transition md:block"
              aria-label="Open alerts"
            >
              <BellRing className="h-5 w-5" />
            </Link>
            <UserMenu />
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">{children}</div>
      </section>
      <nav className="fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-white/10 bg-sentra-ink/95 p-2 shadow-2xl shadow-black/40 lg:hidden">
        <div className="flex gap-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              prefetch
              onFocus={() => prefetchRoute(item.href)}
              onPointerEnter={() => prefetchRoute(item.href)}
              onTouchStart={() => prefetchRoute(item.href)}
              className={cn(
                "sentra-focus nav-glow-link flex min-w-[4.5rem] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-2.5 py-2.5 text-[10px] font-medium text-white/55 transition",
                isActive(item.href) && "bg-white/[0.08] text-white",
              )}
            >
              <item.icon className="h-4 w-4 text-sentra-cyan" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      <NewUserGuideModal />
    </main>
  );
}
