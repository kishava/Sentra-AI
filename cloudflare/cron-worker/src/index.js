/**
 * Calls Sentra GET /api/cron/monitors with CRON_SECRET every 30 minutes.
 * Bind secrets: wrangler secret put CRON_SECRET && wrangler secret put SENTRA_APP_URL
 */
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runCron(env));
  },

  async fetch(request, env) {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }
    const url = new URL(request.url);
    if (url.pathname !== "/run") {
      return new Response("Sentra monitor cron worker. POST not supported; cron runs on schedule.", {
        status: 200,
      });
    }
    const status = await runCron(env);
    return new Response(JSON.stringify({ ok: status >= 200 && status < 300, status }), {
      status,
      headers: { "content-type": "application/json" },
    });
  },
};

async function runCron(env) {
  const secret = env.CRON_SECRET?.trim();
  const base = env.SENTRA_APP_URL?.trim().replace(/\/$/, "");

  if (!secret || !base) {
    console.error("Missing CRON_SECRET or SENTRA_APP_URL");
    return 503;
  }

  const target = `${base}/api/cron/monitors`;
  const res = await fetch(target, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  console.log(`[sentra-cron] ${res.status} ${target}`, text.slice(0, 400));
  return res.status;
}
