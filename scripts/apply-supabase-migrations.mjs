#!/usr/bin/env node
/**
 * Applies SQL migrations using DATABASE_URL (direct Postgres).
 * Usage: set DATABASE_URL in env, then: node scripts/apply-supabase-migrations.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error("Set DATABASE_URL to your Supabase direct connection string.");
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "supabase", "migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log(`Connected. Applying ${files.length} migration(s)...`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`→ ${file}`);
    await client.query(sql);
  }

  const { rows } = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('profiles', 'chat_threads', 'monitors', 'bd_cache')
    order by table_name
  `);
  console.log("Tables present:", rows.map((row) => row.table_name).join(", ") || "(none)");
  console.log("Migrations applied successfully.");
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
