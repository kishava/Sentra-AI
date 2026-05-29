#!/usr/bin/env node
/**
 * Copy .env.example → .env.local for new collaborators.
 * Usage: npm run env:setup
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const examplePath = path.join(root, ".env.example");
const localPath = path.join(root, ".env.local");

if (!fs.existsSync(examplePath)) {
  console.error("Missing .env.example in the repo root.");
  process.exit(1);
}

if (fs.existsSync(localPath)) {
  console.log(".env.local already exists — not overwriting.");
  console.log("Run: npm run env:check");
  process.exit(0);
}

fs.copyFileSync(examplePath, localPath);
console.log("Created .env.local from .env.example.");
console.log("");
console.log("Next steps:");
console.log("  1. Ask the project owner for Supabase keys (secure chat), OR");
console.log("     open docs/SUPABASE_SETUP.md and copy keys from the Supabase dashboard.");
console.log("  2. Fill these in .env.local:");
console.log("     - NEXT_PUBLIC_SUPABASE_URL");
console.log("     - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or ANON_KEY)");
console.log("     - SUPABASE_SECRET_KEY (or SERVICE_ROLE_KEY)");
console.log("  3. npm run env:check");
console.log("  4. npm run dev");
console.log("");
console.log("Full guide: docs/COLLABORATOR_SETUP.md");
