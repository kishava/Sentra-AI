import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="container flex flex-col justify-between gap-4 text-sm text-white/45 md:flex-row">
        <p>Sentra AI. Autonomous enterprise intelligence for the live web.</p>
        <div className="flex gap-5">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/chat">AI Chat</Link>
          <Link href="/alerts">Alerts</Link>
        </div>
      </div>
    </footer>
  );
}
