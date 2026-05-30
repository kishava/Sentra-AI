#!/usr/bin/env node
/**
 * One-time vault restore: merges provider keys into Supabase storage vault.
 * Reads secrets from .env.restore.local (gitignored) or .env.local.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { ALL_PLATFORM_ENV_KEYS } from "../src/lib/secrets/keys.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const STORAGE_BUCKET = "sentra-platform-secrets";
const STORAGE_OBJECT = "platform-env.json";

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
  ...loadEnvFile(path.join(root, ".env.restore.local")),
  ...loadEnvFile(path.join(root, ".env.local")),
};

const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey =
  env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("Missing Supabase URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let existing = {};
try {
  const { data, error } = await admin.storage.from(STORAGE_BUCKET).download(STORAGE_OBJECT);
  if (!error && data) {
    existing = JSON.parse(await data.text());
  }
} catch {
  existing = {};
}

const incoming = {};
for (const key of ALL_PLATFORM_ENV_KEYS) {
  const value = env[key]?.trim();
  if (value) incoming[key] = value;
}

const merged = { ...existing, ...incoming };
const secretCount = Object.keys(incoming).filter((k) =>
  ["AIML_API_KEY", "FEATHERLESS_API_KEY", "BRIGHT_DATA_API_KEY", "SPEECHMATICS_API_KEY"].includes(k),
).length;

if (!Object.keys(incoming).length) {
  console.error("No provider keys found. Create .env.restore.local with AIML_API_KEY, etc.");
  process.exit(1);
}

await admin.storage.createBucket(STORAGE_BUCKET, { public: false, fileSizeLimit: 102_400 });
const { error: uploadError } = await admin.storage
  .from(STORAGE_BUCKET)
  .upload(STORAGE_OBJECT, JSON.stringify(merged, null, 2), {
    upsert: true,
    contentType: "application/json",
  });

if (uploadError) {
  console.error("Restore failed:", uploadError.message);
  process.exit(1);
}

console.log(`Vault restored — ${Object.keys(merged).length} total keys (${secretCount} secrets updated).`);
for (const key of Object.keys(merged).sort()) {
  console.log("  •", key);
}
