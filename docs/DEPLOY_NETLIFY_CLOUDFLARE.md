# Deploy Sentra on Netlify and Cloudflare

Sentra is a **Next.js 15** app with Node.js API routes, middleware, and SSE. This guide covers:

1. **Netlify** — recommended host (config in repo root).
2. **Cloudflare** — DNS/CDN in front of Netlify, plus an optional **cron Worker** when you are not using Vercel/Netlify scheduled jobs.

For **Vercel**, use `vercel.json` (built-in cron, daily on Hobby). See [DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md).

---

## Prerequisites (all hosts)

1. **Supabase** — run `supabase/migrations/*.sql`, enable auth providers.
2. **Redirect URL** in Supabase → Authentication → URL configuration:
   - `https://YOUR-DOMAIN/auth/callback`
3. **Secrets vault** (recommended):
   ```bash
   npm run secrets:sync
   npm run secrets:verify
   ```
4. **Production env** (minimum):

   | Variable | Notes |
   |----------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Required |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required |
   | `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Required |
   | `SENTRA_APP_URL` | Public URL, no trailing slash |
   | `CRON_SECRET` | Long random string; same value for cron callers |

5. Local sanity check: `npm run build` and `npm run env:check`.

---

## Netlify (primary)

### One-time setup

1. Push this repo to GitHub/GitLab.
2. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**.
3. Netlify reads **`netlify.toml`** automatically:
   - Build: `npm run build`
   - Plugin: `@netlify/plugin-nextjs`
   - Node 20

4. **Site configuration → Environment variables** — add the table above plus any model tuning vars from `.env.example`. Provider API keys can stay in the Supabase vault after `secrets:sync`.

5. Set:
   ```env
   SENTRA_APP_URL=https://your-site-name.netlify.app
   CRON_SECRET=<openssl rand -hex 32 or similar>
   ```

6. **Deploy site**.

### Scheduled monitors (included)

`netlify/functions/cron-monitors.mjs` runs **every 30 minutes** and calls:

`GET {SENTRA_APP_URL}/api/cron/monitors` with `Authorization: Bearer {CRON_SECRET}`.

Uses `SENTRA_APP_URL` if set; otherwise Netlify’s `URL` / `DEPLOY_PRIME_URL`.

After first deploy, confirm in **Functions** → `cron-monitors` logs (or trigger a deploy and wait 30m).

### Custom domain

1. Netlify → **Domain management** → add domain.
2. Point DNS to Netlify (or use Cloudflare DNS below).
3. Update `SENTRA_APP_URL` and Supabase redirect URL to the custom domain.

### Limits

- Some API routes use **long runtimes** (up to 300s on cron). Use a **Netlify plan** that supports your needed function timeout if monitor batches fail.
- Do not commit `.env.local`.

---

## Cloudflare

### A) DNS + CDN in front of Netlify (recommended)

Use Cloudflare only for **DNS, SSL, and caching**; keep the app on Netlify.

1. Add site in [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Update nameservers at your registrar.
3. **DNS** → `CNAME` `www` → `your-site.netlify.app` (Proxied).
4. Netlify → add the same custom domain; enable HTTPS.
5. Supabase redirect: `https://yourdomain.com/auth/callback`.
6. `SENTRA_APP_URL=https://yourdomain.com`.

SSL mode: **Full (strict)** once Netlify has a certificate.

### B) Cron Worker (optional)

Use when the app is hosted somewhere **without** built-in cron (or as a backup).

```bash
cd cloudflare/cron-worker
npm install
npx wrangler login
npx wrangler secret put CRON_SECRET
npx wrangler secret put SENTRA_APP_URL   # e.g. https://your-app.netlify.app
npm run deploy
```

Or from repo root: `npm run deploy:cf-cron` (after `npm install` in `cloudflare/cron-worker`).

Cron schedule: every **30 minutes** (`wrangler.toml`). Manual test: `GET https://<worker>.workers.dev/run`.

### C) Cloudflare Pages (advanced)

Hosting the full Next.js app on **Cloudflare Pages** requires an adapter (e.g. OpenNext) and testing every API route (Node APIs, SSE, `pdf-parse`, long `maxDuration`). **Not configured in this repo.** Prefer Netlify + Cloudflare DNS unless you plan a dedicated migration.

---

## Smoke test (after deploy)

1. **Settings** → Bright Data + AIML + Speechmatics **Ready**.
2. **Dashboard** → briefing **Live · Bright Data** (not Sample).
3. **Chat** → competitor `https://` URL → Bright Data evidence.
4. **Alerts** → monitor → **Check now**.
5. Cron: check Netlify function logs or Worker tail (`npm run tail` in `cloudflare/cron-worker`).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| **Plugin: publish = base directory** | Set **Publish directory** to `.next` in Netlify UI (or use `netlify.toml` in repo). Do not leave publish blank. |
| **Secrets scanning failed** | Repo sets `SECRETS_SCAN_ENABLED=false` (Next.js embeds public env in bundles). Do not put real keys in `.env.example`. |
| **Build failed (exit code 2)** | Remove `NODE_ENV=production` from site env vars. Redeploy. |
| Auth redirect loop | Add exact production URL `/auth/callback` in Supabase |
| Cron 401 | `CRON_SECRET` must match on host and cron caller |
| Cron 503 Supabase | Set all three Supabase env vars on Netlify |
| Sample data in prod | Bright Data zones missing; run `secrets:sync` or set zones in env |
| Build fails locally | Node 20+; `npm run build` |

---

## File reference

| Path | Purpose |
|------|---------|
| `netlify.toml` | Netlify build + Next plugin |
| `netlify/functions/cron-monitors.mjs` | Scheduled monitor ping |
| `cloudflare/cron-worker/` | Optional Cloudflare cron Worker |
| `vercel.json` | Vercel cron — daily on Hobby (`0 9 * * *`) |
