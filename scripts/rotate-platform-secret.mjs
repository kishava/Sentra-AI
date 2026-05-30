#!/usr/bin/env node
/**
 * Rotate a single vault key in Supabase.
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
  "SPEECHMATICS_API_KEY",
];

const PLATFORM_CONFIG_KEYS = [
  "BRIGHT_DATA_SERP_ZONE",
  "BRIGHT_DATA_WEB_UNLOCKER_ZONE",
  "BRIGHT_DATA_SCRAPER_ZONE",
  "BRIGHT_DATA_BROWSER_ZONE",
  "BRIGHT_DATA_SERP_ENDPOINT",
  "BRIGHT_DATA_WEB_UNLOCKER_ENDPOINT",
  "BRIGHT_DATA_SCRAPER_ENDPOINT",
  "BRIGHT_DATA_BROWSER_ENDPOINT",
  "BRIGHT_DATA_STUDIO_COLLECTOR_ID",
  "BRIGHT_DATA_MCP_URL",
  "BRIGHT_DATA_MCP_GROUPS",
  "BRIGHT_DATA_CACHE_TTL_SECONDS",
  "AIML_BASE_URL",
  "FEATHERLESS_BASE_URL",
  "SPEECHMATICS_TTS_URL",
  "SPEECHMATICS_TTS_VOICE",
];

const ALL_PLATFORM_ENV_KEYS = [...PLATFORM_SECRET_KEYS, ...PLATFORM_CONFIG_KEYS];
const STORAGE_BUCKET = "sentra-platform-secrets";
const STORAGE_OBJECT = "platform-env.json";

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

async function rotateInTable() {
  const { error } = await admin.from("platform_env").upsert(
    { key, value, kind, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) throw error;
  return "platform_env table";
}

async function rotateInStorage() {
  let map = {};
  const { data, error: downloadError } = await admin.storage
    .from(STORAGE_BUCKET)
    .download(STORAGE_OBJECT);

  if (!downloadError && data) {
    map = JSON.parse(await data.text());
  } else if (!/not found|does not exist/i.test(downloadError?.message ?? "")) {
    throw downloadError;
  }

  map[key] = value;
  const body = JSON.stringify(map, null, 2);
  const { error: uploadError } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(STORAGE_OBJECT, body, { upsert: true, contentType: "application/json" });
  if (uploadError) throw uploadError;
  return `storage bucket ${STORAGE_BUCKET}/${STORAGE_OBJECT}`;
}

try {
  let backend;
  try {
    backend = await rotateInTable();
  } catch (tableError) {
    if (!/does not exist|platform_env|schema cache/i.test(tableError.message)) {
      throw tableError;
    }
    backend = await rotateInStorage();
  }
  console.log(`Rotated ${key} in Supabase (${backend}). Live servers refresh within ~2 minutes.`);
} catch (error) {
  console.error("Rotate failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
