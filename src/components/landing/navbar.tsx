import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import { SENTRA_HOME, signInFor } from "@/lib/landing/auth-links";

export function Navbar() {
  const links = [
    { label: "Platform", href: "#platform" },
    { label: "Our Services", href: "/services" },
    { label: "Intelligence", href: "#intelligence" },
    { label: "Integrations", href: "#integrations" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-sentra-ink/55 backdrop-blur-2xl">
      <div className="container flex h-20 items-center justify-between">
        <Link href="/" className="group flex items-center" aria-label="Santra home">
          <BrandLogo className="h-[68px] w-[102px]" />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-white/60 md:flex">
          {links.map((link) =>
            link.href.startsWith("/") ? (
              <Link key={link.label} href={link.href} className="transition">
                {link.label}
              </Link>
            ) : (
              <a key={link.label} href={link.href} className="transition">
                {link.label}
              </a>
            ),
          )}
        </nav>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href={signInFor(SENTRA_HOME)}>Sign in</Link>
          </Button>
          <Button asChild variant="neon">
            <Link href={signInFor(SENTRA_HOME)}>Launch OS</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
