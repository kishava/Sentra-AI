#!/usr/bin/env node
/**
 * Configure Supabase Auth (redirect URLs + optional GitHub/Google OAuth).
 *
 * Prerequisites:
 *   1. Personal access token: https://supabase.com/dashboard/account/tokens
 *      → add SUPABASE_ACCESS_TOKEN to .env.local
 *   2. OAuth apps (see docs/OAUTH_SETUP.md) → add client id/secret to .env.local
 *
 * Usage: npm run auth:configure
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const localPath = path.join(root, ".env.local");

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    if (key) env[key] = value;
  }
  return env;
}

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname;
    const match = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return match?.[1] ?? "";
  } catch {
    return "";
  }
}

const env = loadEnvFile(localPath);
const token = env.SUPABASE_ACCESS_TOKEN?.trim();
const projectRef =
  env.SUPABASE_PROJECT_REF?.trim() ||
  projectRefFromUrl(env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "") ||
  "rgvjmtpimjvgusrqrldj";

const appUrl = (env.SENTRA_APP_URL?.trim() || "http://localhost:3001").replace(/\/$/, "");
const netlifyUrl = env.NETLIFY_SITE_URL?.trim().replace(/\/$/, "");

const redirectUrls = new Set([
  `${appUrl}/auth/callback`,
  "http://localhost:3001/auth/callback",
  "http://localhost:3000/auth/callback",
]);
if (netlifyUrl) redirectUrls.add(`${netlifyUrl}/auth/callback`);

const payload = {
  site_url: appUrl,
  uri_allow_list: [...redirectUrls].join(","),
  external_email_enabled: true,
  mailer_autoconfirm: true,
};

const githubId = env.GITHUB_OAUTH_CLIENT_ID?.trim();
const githubSecret = env.GITHUB_OAUTH_CLIENT_SECRET?.trim();
if (githubId && githubSecret) {
  payload.external_github_enabled = true;
  payload.external_github_client_id = githubId;
  payload.external_github_secret = githubSecret;
}

const googleId = env.GOOGLE_OAUTH_CLIENT_ID?.trim();
const googleSecret = env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
if (googleId && googleSecret) {
  payload.external_google_enabled = true;
  payload.external_google_client_id = googleId;
  payload.external_google_secret = googleSecret;
  payload.external_google_skip_nonce_check = true;
}

console.log("Sentra — configure Supabase Auth\n");
console.log(`  Project ref: ${projectRef}`);
console.log(`  Site URL:    ${payload.site_url}`);
console.log(`  Redirects:   ${payload.uri_allow_list}\n`);

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in .env.local");
  console.error("  1. https://supabase.com/dashboard/account/tokens → Generate token");
  console.error("  2. Add to .env.local: SUPABASE_ACCESS_TOKEN=sbp_...");
  console.error("  3. Optional OAuth keys — see docs/OAUTH_SETUP.md");
  console.error("  4. Re-run: npm run auth:configure\n");
  process.exit(1);
}

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const body = await response.text();
if (!response.ok) {
  console.error(`Supabase API error (${response.status}):`, body.slice(0, 500));
  process.exit(1);
}

console.log("Auth config updated.\n");
if (githubId && githubSecret) console.log("  GitHub OAuth: enabled");
else console.log("  GitHub OAuth: skipped (add GITHUB_OAUTH_CLIENT_ID + GITHUB_OAUTH_CLIENT_SECRET)");
if (googleId && googleSecret) console.log("  Google OAuth: enabled");
else console.log("  Google OAuth: skipped (add GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET)");
console.log("\nRestart npm run dev, then open /sign-in and test GitHub / Google.");
