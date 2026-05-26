"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BellRing,
  Bot,
  BrainCircuit,
  Camera,
  ScanSearch,
  LayoutDashboard,
  LineChart,
  Radar,
  Settings,
} from "lucide-react";
import { CommandPalette } from "@/components/shared/command-palette";
import { LocalDevBanner } from "@/components/shared/local-dev-banner";
import { ParticleField } from "@/components/shared/particle-field";
import { UserMenu } from "@/components/dashboard/user-menu";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "AI Chat", icon: Bot },
  { href: "/analyst", label: "AI Analyst", icon: ScanSearch },
  { href: "/analyst?mode=vision", label: "Visual Forensics", icon: Camera },
  { href: "/alerts", label: "Alerts", icon: BellRing },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/dashboard#market", label: "Market Intel", icon: LineChart },
  { href: "/dashboard#signals", label: "Live Signals", icon: Radar },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const analystMode = searchParams.get("mode");
  const isActive = (href: string) => {
    if (href === "/analyst") return pathname === "/analyst" && analystMode !== "vision";
    if (href === "/analyst?mode=vision") return pathname === "/analyst" && analystMode === "vision";
    return pathname === href;
  };

  return (
    <main className="min-h-screen">
      <ParticleField />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/10 bg-sentra-ink/70 p-5 backdrop-blur-2xl lg:block">
        <Link href="/" className="flex items-center gap-3 px-2 py-3 text-white">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sentra-cyan to-sentra-violet shadow-glow">
            <BrainCircuit className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-semibold">Sentra AI</span>
            <span className="text-xs text-white/40">Enterprise OS</span>
          </span>
        </Link>
        <nav className="mt-10 grid gap-2">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white/58 transition hover:bg-white/[0.07] hover:text-white",
                isActive(item.href) && "bg-white/[0.08] text-white",
              )}
            >
              <item.icon className="h-4 w-4 text-sentra-cyan" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute inset-x-5 bottom-5 rounded-3xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-sm font-medium text-white">Bright Data pipeline</p>
          <p className="mt-1 text-xs leading-5 text-white/45">
            SERP + Web Unlocker feed live briefings, chat, and monitor checks.
          </p>
        </div>
      </aside>
      <section className="pb-24 lg:pb-0 lg:pl-72">
        <LocalDevBanner />
        <header className="sticky top-0 z-30 border-b border-white/10 bg-sentra-ink/55 px-4 py-4 backdrop-blur-2xl md:px-8">
          <div className="flex min-w-0 items-center gap-3 md:gap-4">
            <CommandPalette className="min-w-0 flex-1" />
            <Link
              href="/alerts"
              className="hidden rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-white/60 transition hover:text-white md:block"
              aria-label="Open alerts"
            >
              <BellRing className="h-5 w-5" />
            </Link>
            <Link
              href="/settings"
              className="hidden rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-white/60 transition hover:text-white md:block"
              aria-label="Open settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <UserMenu />
          </div>
        </header>
        <div className="px-4 py-8 md:px-8">{children}</div>
      </section>
      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-sentra-ink/85 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl lg:hidden">
        {nav.slice(0, 3).map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "sentra-focus flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-medium text-white/55 transition hover:bg-white/[0.07] hover:text-white",
              isActive(item.href) && "bg-white/[0.08] text-white",
            )}
          >
            <item.icon className="h-4 w-4 text-sentra-cyan" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
