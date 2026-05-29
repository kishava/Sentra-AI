#!/usr/bin/env node
/**
 * Verify .env.local has what Sentra needs for Supabase (and optional providers).
 * Usage: npm run env:check
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const localPath = path.join(root, ".env.local");

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    if (key) env[key] = value;
  }
  return env;
}

function has(env, key) {
  return Boolean(env[key]?.trim());
}

const env = loadEnvFile(localPath);

if (!fs.existsSync(localPath)) {
  console.error("No .env.local found. Run: npm run env:setup");
  process.exit(1);
}

const supabaseUrl = has(env, "NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnon =
  has(env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || has(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
const supabaseSecret =
  has(env, "SUPABASE_SECRET_KEY") || has(env, "SUPABASE_SERVICE_ROLE_KEY");

const supabaseReady = supabaseUrl && supabaseAnon && supabaseSecret;
const supabasePartial = supabaseUrl || supabaseAnon || supabaseSecret;

const providerKeys = [
  "AIML_API_KEY",
  "FEATHERLESS_API_KEY",
  "BRIGHT_DATA_API_KEY",
  "SPEECHMATICS_API_KEY",
];
const anyProvider = providerKeys.some((key) => has(env, key));

function status(ok) {
  return ok ? "OK" : "MISSING";
}

console.log("Sentra env check (.env.local)\n");
console.log(`  Supabase URL:              ${status(supabaseUrl)}`);
console.log(`  Supabase publishable/anon: ${status(supabaseAnon)}`);
console.log(`  Supabase secret (server):  ${status(supabaseSecret)}`);

if (supabaseReady) {
  console.log("\n  Supabase: ready — auth + DB should work after npm run dev");
} else if (supabasePartial) {
  console.log("\n  Supabase: incomplete — fill all three vars (see docs/SUPABASE_SETUP.md)");
} else {
  console.log("\n  Supabase: not configured — local-only mode OR add keys from docs/SUPABASE_SETUP.md");
}

console.log(`\n  Provider API keys in file: ${anyProvider ? "yes" : "no (may live in Supabase vault)"}`);
if (!anyProvider && supabaseReady) {
  console.log("  If the team uses the vault, run npm run secrets:verify after the owner runs secrets:sync");
}

console.log("");
if (!supabaseReady && supabasePartial) {
  process.exit(1);
}
