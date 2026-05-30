#!/usr/bin/env node
/**
 * Upload API keys from .env.local into Supabase vault (platform_env table or private storage).
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

let map = Object.fromEntries(entries.map((entry) => [entry.key, entry.value]));

async function loadExistingVaultMap() {
  try {
    const { data, error } = await admin.storage.from(STORAGE_BUCKET).download(STORAGE_OBJECT);
    if (error || !data) return {};
    const parsed = JSON.parse(await data.text());
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

async function syncToTable() {
  const { error } = await admin.from("platform_env").upsert(rows, { onConflict: "key" });
  if (error) throw error;
  return "platform_env table";
}

async function syncToStorage() {
  const { error: bucketError } = await admin.storage.createBucket(STORAGE_BUCKET, {
    public: false,
    fileSizeLimit: 102_400,
  });
  if (bucketError && !/already exists/i.test(bucketError.message)) {
    throw bucketError;
  }

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
    backend = await syncToTable();
  } catch (tableError) {
    if (!/does not exist|platform_env|schema cache/i.test(tableError.message)) {
      throw tableError;
    }
    console.log("platform_env table not found — using private Supabase Storage vault.");
    backend = await syncToStorage();
  }

  console.log(`Synced ${rows.length} key(s) to Supabase (${backend}); vault now has ${Object.keys(map).length} key(s):`);
  for (const row of rows) {
    console.log(`  • ${row.key} (${row.kind})`);
  }
  console.log("\nDeploy with only Supabase keys + SENTRA_APP_URL on Vercel.");
  console.log("Rotate: npm run secrets:rotate -- KEY NEW_VALUE");
} catch (error) {
  console.error("Sync failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
