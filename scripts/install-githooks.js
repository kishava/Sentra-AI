#!/usr/bin/env node
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

if (process.env.VERCEL === "1" || process.env.CI === "true") {
  process.exit(0);
}

const root = path.join(__dirname, "..");
const hookPath = path.join(root, ".githooks", "prepare-commit-msg");

if (!fs.existsSync(hookPath)) {
  console.warn("[sentra] prepare-commit-msg hook missing, skip install");
  process.exit(0);
}

try {
  execSync("git config core.hooksPath .githooks", { cwd: root, stdio: "pipe" });
  console.log("[sentra] Git hooks installed (.githooks → strips Cursor co-author trailers)");
} catch {
  console.warn("[sentra] Could not set core.hooksPath (not a git repo?)");
}
