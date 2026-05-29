#!/usr/bin/env node
/**
 * Rotate a single vault key in Supabase (no app redeploy needed; cache refreshes in ~2 min).
 * Usage: npm run secrets:rotate -- AIML_API_KEY your_new_key
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

const [, , keyArg, ...valueParts] = process.argv;
const value = valueParts.join(" ").trim();
const key = keyArg?.trim();

if (!key || !value) {
  console.error("Usage: npm run secrets:rotate -- AIML_API_KEY your_new_key");
  process.exit(1);
}

if (!ALL_PLATFORM_ENV_KEYS.includes(key)) {
  console.error(`Unknown key "${key}". Allowed: ${ALL_PLATFORM_ENV_KEYS.join(", ")}`);
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
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
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const kind = PLATFORM_SECRET_KEYS.includes(key) ? "secret" : "config";
const { error } = await admin.from("platform_env").upsert(
  { key, value, kind, updated_at: new Date().toISOString() },
  { onConflict: "key" },
);

if (error) {
  console.error("Rotate failed:", error.message);
  process.exit(1);
}

console.log(`Rotated ${key} in Supabase vault. Live servers pick it up within ~2 minutes.`);
