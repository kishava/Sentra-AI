#!/usr/bin/env node
/**
 * Upload API keys from .env.local into Supabase platform_env vault.
 * Usage: npm run secrets:sync
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const PLATFORM_SECRET_KEYS = [
  "AIML_API_KEY",
  "FEATHERLESS_API_KEY",
  "BRIGHT_DATA_API_KEY",
  "BRIGHT_DATA_MANAGEMENT_KEY",
  "ELEVENLABS_API_KEY",
];

const PLATFORM_CONFIG_KEYS = [
  "BRIGHT_DATA_SERP_ZONE",
  "BRIGHT_DATA_WEB_UNLOCKER_ZONE",
  "BRIGHT_DATA_SERP_ENDPOINT",
  "BRIGHT_DATA_WEB_UNLOCKER_ENDPOINT",
  "BRIGHT_DATA_SCRAPER_ENDPOINT",
  "BRIGHT_DATA_CACHE_TTL_SECONDS",
  "AIML_BASE_URL",
  "FEATHERLESS_BASE_URL",
];

const ALL_PLATFORM_ENV_KEYS = [...PLATFORM_SECRET_KEYS, ...PLATFORM_CONFIG_KEYS];

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = {
  ...loadEnvFile(path.join(root, ".env")),
  ...loadEnvFile(path.join(root, ".env.local")),
};

const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey =
  env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  process.exit(1);
}

const entries = ALL_PLATFORM_ENV_KEYS.map((key) => ({
  key,
  value: env[key]?.trim(),
  kind: PLATFORM_SECRET_KEYS.includes(key) ? "secret" : "config",
})).filter((entry) => entry.value);

if (!entries.length) {
  console.error("No provider keys found in .env.local to sync.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const rows = entries.map((entry) => ({
  key: entry.key,
  value: entry.value,
  kind: entry.kind,
  updated_at: new Date().toISOString(),
}));

const { error } = await admin.from("platform_env").upsert(rows, { onConflict: "key" });

if (error) {
  if (/does not exist|platform_env/i.test(error.message)) {
    console.error(
      "platform_env table missing. Run supabase/migrations/003_platform_secrets.sql in the SQL Editor first.",
    );
  } else {
    console.error("Sync failed:", error.message);
  }
  process.exit(1);
}

console.log(`Synced ${rows.length} key(s) to Supabase platform_env:`);
for (const row of rows) {
  console.log(`  • ${row.key} (${row.kind})`);
}
console.log("\nFor deploy: remove provider keys from Vercel/host env — keep only Supabase + SENTRA_APP_URL.");
console.log("Rotate keys at providers, update vault: npm run secrets:rotate -- KEY NEW_VALUE");
