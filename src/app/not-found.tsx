import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-sentra-ink px-6">
      <div className="max-w-md text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-sentra-cyan">Sentra AI</p>
        <h1 className="mt-4 text-5xl font-semibold text-white">404</h1>
        <p className="mt-4 text-white/60">This page could not be found.</p>
        <p className="mt-2 text-sm text-white/40">
          The route may be wrong, or the dev server was still compiling. Try again or return home.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="neon">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
