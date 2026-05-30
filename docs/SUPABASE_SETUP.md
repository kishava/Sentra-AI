# Supabase setup (Sentra AI)

Project: `rgvjmtpimjvgusrqrldj`  
Dashboard: https://supabase.com/dashboard/project/rgvjmtpimjvgusrqrldj

## 1. Environment variables (`.env.local`)

New collaborators: run `npm run env:setup`, then follow **[COLLABORATOR_SETUP.md](./COLLABORATOR_SETUP.md)**.
The owner should share keys via a **private channel** or invite you under **Project Settings → Team** — never commit `.env.local`.

| Variable | Where to get it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | API Keys → Publishable (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | API Keys → Secret (`sb_secret_…`) — **server only, never expose** |

You can also use legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` (JWT format).

## 2. Apply database schema

**Option A — npm (direct Postgres)**

```bash
# Encode special characters in the DB password (@ → %40, $ → %24)
set DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.rgvjmtpimjvgusrqrldj.supabase.co:5432/postgres
npm install
npm run db:migrate
```

**Option B — Supabase SQL Editor**

Run in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_intelligence_reports.sql` (safe if 001 already created reports)

**Option C — Supabase CLI**

```bash
npx supabase login
npx supabase link --project-ref rgvjmtpimjvgusrqrldj
npx supabase db push
```

## 3. Auth redirect URLs

In **Authentication → URL configuration**:

| Setting | Value |
|---------|--------|
| Site URL | `http://localhost:3001` |
| Redirect URLs | `http://localhost:3001/auth/callback` |

For production, add your Vercel domain the same way.

### Registration without email confirmation

Sentra signs users in immediately after sign-up (no inbox step). In Supabase:

1. **Authentication → Providers → Email** — turn **off** “Confirm email” (recommended), or leave it on; Sentra auto-confirms accounts on create so login still works.
2. **Authentication → Rate Limits** — raise or disable email rate limits if you hit “too many requests” when testing profile verification.

Enable providers under **Authentication → Providers** (Email, Google, GitHub as needed).

**GitHub + Google (automated):** see **[OAUTH_SETUP.md](./OAUTH_SETUP.md)** → add OAuth keys to `.env.local` → `npm run auth:configure`.

Email verification is **optional** from the profile menu (top-right avatar) when a user wants it later.

## 4. Verify in Sentra

1. Restart `npm run dev`
2. Open **Settings** → Supabase credentials + workspace schema should show **Ready**
3. Sign up at `/sign-up` with email/password (cloud account, not local-only)

## 5. Security

- Rotate DB password if it was shared in chat.
- Rotate AIML, Featherless, and Bright Data keys if they were exposed.
- Never commit `.env.local` or paste `SUPABASE_SECRET_KEY` in the repo.
