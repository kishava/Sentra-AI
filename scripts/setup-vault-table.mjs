#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return env;
}

const env = { ...loadEnvFile(path.join(root, ".env")), ...loadEnvFile(path.join(root, ".env.local")) };
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const projectRef = "rgvjmtpimjvgusrqrldj";
const password = "12628Av%40%24hik";

const poolerHosts = [
  `postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`,
  env.DATABASE_URL?.trim(),
].filter(Boolean);

async function tryMigrate(connectionString) {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const sql003 = fs.readFileSync(path.join(root, "supabase/migrations/003_platform_secrets.sql"), "utf8");
  await client.query(sql003);
  const { rows } = await client.query(`select to_regclass('public.platform_env') as reg`);
  await client.end();
  return rows[0]?.reg;
}

async function main() {
  console.log("Testing Supabase REST...");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: profiles, error: profileError } = await admin.from("profiles").select("id").limit(1);
  if (profileError) {
    console.log("profiles check:", profileError.message);
  } else {
    console.log("profiles table OK, sample count:", profiles?.length ?? 0);
  }

  const { error: vaultError } = await admin.from("platform_env").select("key").limit(1);
  if (!vaultError) {
    console.log("platform_env already exists.");
    return;
  }
  console.log("platform_env missing:", vaultError.message);

  for (const cs of poolerHosts) {
    const host = cs.replace(/:[^:@]+@/, ":***@");
    try {
      console.log("Trying", host);
      const reg = await tryMigrate(cs);
      if (reg) {
        console.log("Created platform_env via", host);
        return;
      }
    } catch (error) {
      console.log("  failed:", error instanceof Error ? error.message : error);
    }
  }

  console.error("Could not apply migration via Postgres. Run 003_platform_secrets.sql in Supabase SQL Editor.");
  process.exit(1);
}

await main();
