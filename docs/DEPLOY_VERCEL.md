# Deploy Sentra on Vercel (Hobby)

Sentra is a **Next.js 15** app. Vercel is the recommended host. The repo includes `vercel.json` with a **once-daily** cron so deploys succeed on the **Hobby** plan (Pro allows more frequent schedules).

## 1. Import the project

1. [vercel.com/new](https://vercel.com/new) → import your Git repo.
2. Framework: **Next.js** (auto-detected).
3. Build command: `npm run build` (default).
4. Install command: `npm install` (default).
5. Node: **20.x** or **22.x** (matches `package.json` `engines`).

## 2. Environment variables

In **Project → Settings → Environment Variables** (Production + Preview as needed):

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Or `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SECRET_KEY` | Yes | Server-only; or `SUPABASE_SERVICE_ROLE_KEY` |
| `SENTRA_APP_URL` | Yes | `https://<your-project>.vercel.app` (no trailing slash) |
| `CRON_SECRET` | Yes | Long random string; Vercel cron sends `Authorization: Bearer <CRON_SECRET>` |

Provider keys (**AIML**, **Bright Data**, **Speechmatics**, etc.) should live in the **Supabase vault** after `npm run secrets:sync` — do not duplicate on Vercel unless you skip the vault. See [SECRETS_VAULT.md](./SECRETS_VAULT.md).

Optional (only if needed):

- `FEATHERLESS_API_KEY` — if not using vault and you want chat fallback
- `SENTRA_ALLOW_DEMO_FALLBACK=true` — emergency demo only (not for judges)

## 3. Supabase

1. Apply migrations: `supabase db push` or run `supabase/migrations/*.sql`.
2. **Authentication → URL configuration** → add redirect:  
   `https://<your-vercel-domain>/auth/callback`
3. From a machine with `.env.local` filled: `npm run secrets:sync` then `npm run secrets:verify`.

## 4. Cron (monitors)

`vercel.json` schedules:

```text
GET /api/cron/monitors
0 9 * * *   (09:00 UTC daily)
```

- **Hobby:** Vercel only allows cron expressions that run **at most once per day**. This schedule satisfies that limit.
- **Pro:** You can change the schedule in `vercel.json` to `*/30 * * * *` for checks every 30 minutes.
- **Manual checks:** **Alerts → Check now** works without cron.
- **External 30m cron:** Remove or comment out `crons` in `vercel.json`, deploy, then use [Netlify cron](./DEPLOY_NETLIFY_CLOUDFLARE.md) or [Cloudflare cron worker](../cloudflare/cron-worker/) calling the same URL with the same `CRON_SECRET`.

Ensure `CRON_SECRET` in Vercel matches what the route expects (`src/app/api/cron/monitors/route.ts`).

## 5. Deploy

Push to the connected branch or click **Deploy** in the Vercel dashboard. If you previously saw:

> Hobby accounts are limited to daily cron jobs… `*/30 * * * *`

that error is resolved by the daily schedule in `vercel.json`.

## 6. Smoke test

1. Open the production URL → sign in.
2. **Settings** → provider / Bright Data status.
3. **Dashboard** → refresh briefing.
4. **Chat** → send a message (vault must have valid AIML or Featherless key).
5. **Alerts** → **Check now** on a monitor.
6. After 09:00 UTC (or trigger cron manually in Vercel dashboard on Pro), confirm cron logs if monitors are active.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Cron deploy error on Hobby | Schedule must be once per day (see `vercel.json`) |
| Cron 401 | Set `CRON_SECRET` on Vercel; redeploy |
| Cron 503 Supabase | Set all three Supabase env vars |
| Chat 401 / provider errors | Run `secrets:sync`; verify AIML key in vault |
| Auth redirect fails | Add Vercel URL to Supabase redirect URLs |

See also [USER_SETUP.md](./USER_SETUP.md).
