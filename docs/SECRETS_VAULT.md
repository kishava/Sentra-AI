# API keys in Supabase vault

Sentra stores provider API keys in **Supabase** (`platform_env` table), not in your deploy host. Only Supabase credentials go on Vercel.

## Setup (once)

1. Run migration in Supabase SQL Editor:
   - `supabase/migrations/003_platform_secrets.sql`

2. Put keys in `.env.local` locally (for sync only).

3. Upload to vault:
   ```bash
   npm run secrets:sync
   ```

4. Settings → **API keys vault (supabase)** should show Ready.

## Deploy (Vercel / production)

Set **only** these environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SENTRA_APP_URL=https://your-domain.com
SENTRA_TIMEZONE=Asia/Colombo
```

Do **not** add `AIML_API_KEY`, `FEATHERLESS_API_KEY`, or `BRIGHT_DATA_*` to Vercel after sync.

## Rotate a key

1. Generate a new key at the provider (AIML, Featherless, Bright Data).
2. Update vault (no redeploy needed; cache refreshes in ~2 min):
   ```bash
   npm run secrets:rotate -- AIML_API_KEY your_new_key_here
   ```

## Local development

- **With vault:** keep only Supabase keys in `.env.local`; run `secrets:sync` once.
- **Without vault:** provider keys in `.env.local` still work (env fallback).

## Security

- `platform_env` has **no RLS policies** — only the service role can read it.
- Never expose `SUPABASE_SECRET_KEY` to the browser.
- Rotate any keys that were pasted in chat or committed by mistake.
