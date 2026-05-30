#!/usr/bin/env node
/** Patch missing Featherless + Scraper zone in Supabase vault (merge only). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const STORAGE_BUCKET = "sentra-platform-secrets";
const STORAGE_OBJECT = "platform-env.json";
const TRANSCRIPT = path.join(
  process.env.USERPROFILE || "",
  ".cursor/projects/d-Sentra-AI-Sentra-AI/agent-transcripts/0f00d66a-0a3d-4fd5-9676-a5dc153fb22f/0f00d66a-0a3d-4fd5-9676-a5dc153fb22f.jsonl",
);

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

const env = loadEnvFile(path.join(root, ".env.local"));
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data, error } = await admin.storage.from(STORAGE_BUCKET).download(STORAGE_OBJECT);
if (error) {
  console.error("Vault download failed:", error.message);
  process.exit(1);
}

const vault = JSON.parse(await data.text());
const patches = {};

if (!vault.FEATHERLESS_API_KEY?.trim() && fs.existsSync(TRANSCRIPT)) {
  const transcript = fs.readFileSync(TRANSCRIPT, "utf8");
  const match = transcript.match(/FEATHERLESS_API_KEY=([A-Za-z0-9_.-]+)/);
  if (match?.[1]) {
    patches.FEATHERLESS_API_KEY = match[1];
    patches.FEATHERLESS_BASE_URL = "https://api.featherless.ai/v1";
  }
}

// No dedicated Web Scraper zone on account — reuse Web Unlocker for structured page fetch.
if (!vault.BRIGHT_DATA_SCRAPER_ZONE?.trim() && vault.BRIGHT_DATA_WEB_UNLOCKER_ZONE?.trim()) {
  patches.BRIGHT_DATA_SCRAPER_ZONE = vault.BRIGHT_DATA_WEB_UNLOCKER_ZONE;
}

if (!Object.keys(patches).length) {
  console.log("Nothing to patch — Featherless key and Scraper zone already set.");
  process.exit(0);
}

const merged = { ...vault, ...patches };
const { error: uploadError } = await admin.storage
  .from(STORAGE_BUCKET)
  .upload(STORAGE_OBJECT, JSON.stringify(merged, null, 2), {
    upsert: true,
    contentType: "application/json",
  });

if (uploadError) {
  console.error("Vault upload failed:", uploadError.message);
  process.exit(1);
}

console.log("Vault patched:");
for (const key of Object.keys(patches)) {
  console.log("  •", key);
}
