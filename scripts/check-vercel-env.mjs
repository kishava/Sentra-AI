#!/usr/bin/env node
/**
 * Print which env vars must be set on Vercel (does not read .env.local).
 * Usage: npm run env:check:vercel
 */
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY",
  "SENTRA_APP_URL",
  "CRON_SECRET",
];

console.log("Vercel production — set these in Project → Environment Variables:\n");
for (const line of required) {
  const keys = line.split("|");
  console.log(`  ${keys.length > 1 ? `(${keys.join(" OR ")})` : keys[0]}`);
}
console.log("\nProvider keys: use Supabase vault (npm run secrets:sync), not Vercel, unless vault is unused.");
console.log("Supabase redirect: https://<your-domain>/auth/callback");
console.log("Deploy guide: docs/DEPLOY_VERCEL.md\n");
