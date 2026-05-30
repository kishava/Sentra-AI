import { schedule } from "@netlify/functions";

/**
 * Netlify scheduled function — pings Next.js cron route every 30 minutes.
 * Set CRON_SECRET and SENTRA_APP_URL (or rely on Netlify URL) in site env vars.
 */
async function runMonitorCron() {
  const secret = process.env.CRON_SECRET?.trim();
  const base = (process.env.SENTRA_APP_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || "")
    .trim()
    .replace(/\/$/, "");

  if (!secret) {
    console.error("[cron-monitors] CRON_SECRET is not set");
    return { statusCode: 503, body: "CRON_SECRET missing" };
  }
  if (!base) {
    console.error("[cron-monitors] SENTRA_APP_URL or URL is not set");
    return { statusCode: 503, body: "SENTRA_APP_URL or URL missing" };
  }

  const target = `${base}/api/cron/monitors`;
  const res = await fetch(target, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log(`[cron-monitors] ${res.status} ${target}`, body.slice(0, 400));

  return { statusCode: res.status, body };
}

export const handler = schedule("*/30 * * * *", runMonitorCron);
