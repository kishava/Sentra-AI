# Sentra — setup only you can do

Everything else (code, cron route, GTM router, MCP client, monitor templates) is in the repo. Complete these steps in your accounts.

## 1. Bright Data control panel

1. Sign in at [brightdata.com/cp](https://brightdata.com/cp/zones) (hackathon promo: `unlocked`).
2. Create zones and copy **zone names** into `.env.local`:

| Product | Env variable |
|---------|----------------|
| SERP API | `BRIGHT_DATA_SERP_ZONE` |
| Web Unlocker | `BRIGHT_DATA_WEB_UNLOCKER_ZONE` |
| Web Scraper (optional) | `BRIGHT_DATA_SCRAPER_ZONE` |
| Scraping Browser (optional) | `BRIGHT_DATA_BROWSER_ZONE` |

3. Optional: **Scraper Studio** — build a collector, set `BRIGHT_DATA_STUDIO_COLLECTOR_ID`.
4. MCP uses the same `BRIGHT_DATA_API_KEY` (hosted `mcp.brightdata.com`). Disable with `BRIGHT_DATA_MCP_ENABLED=false` if needed.

## 2. Sync secrets to Supabase vault

```bash
# .env.local must include AIML, Bright Data, Speechmatics keys + zone names
npm run secrets:sync
npm run secrets:verify
```

## 3. Rotate exposed keys

If any API key was pasted in chat or committed, rotate in the provider dashboard and re-run `secrets:sync`.

## 4. Supabase

- Run migrations: `supabase db push` or apply `supabase/migrations/*.sql`.
- Optional judge account: create user in Auth for demo login.

## 5. Vercel production

Full steps: [DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md) (Hobby-safe daily cron in `vercel.json`).

Set in Vercel project settings:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SENTRA_APP_URL=https://your-app.vercel.app
CRON_SECRET=<long random string>
```

Provider keys stay in Supabase vault after `secrets:sync` — do not duplicate AIML/BD keys on Vercel unless vault is unused.

Add Supabase **redirect URL** for your Vercel domain (`/auth/callback`).

## 6. Hackathon submission (lablab)

When ready: 5‑min video, PDF slides, cover image, live URL, judge credentials — see [HACKATHON_GTM_SUBMISSION.md](./HACKATHON_GTM_SUBMISSION.md).

## 7. Smoke test (after deploy)

1. **Settings** → Bright Data control center: SERP + Unlocker green; probe SERP/MCP.
2. **Dashboard** → briefing shows **Live · Bright Data**.
3. **Chat** → paste competitor `https://…` → evidence in reply.
4. **Alerts** → GTM template → Check now → `provider: bright-data` in network tab.
