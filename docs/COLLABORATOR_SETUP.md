# Collaborator setup (env + Supabase)

`.env.local` is **never** in Git (see `.gitignore`). After you clone the repo, use one of the flows below.

## Quick start

```bash
git pull
npm install
npm run env:setup
```

Then add Supabase credentials (next section), verify, and run the app:

```bash
npm run env:check
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

---

## How to get Supabase keys (pick one)

### Option A — Project owner shares securely (fastest)

Ask the repo owner to send you a copy of their `.env.local` **only** via a private channel (1Password share, Signal, Discord DM, etc.). **Never** commit it or paste keys in GitHub issues/PRs.

Paste the values into your `.env.local` (create it with `npm run env:setup` first if needed).

### Option B — You are invited to the Supabase project (best long-term)

1. Owner: Supabase dashboard → **Project Settings → Team** → invite your email.
2. You: open [docs/SUPABASE_SETUP.md](./SUPABASE_SETUP.md) and copy keys from **Project Settings → API** into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy anon JWT)
   - `SUPABASE_SECRET_KEY` (or legacy `service_role` JWT) — **server only, never commit**

### Option C — Local-only (no Supabase)

Leave Supabase vars empty in `.env.local`. Use **Enter workspace (local mode)** on the landing page. Data stays in the browser until Supabase is configured.

---

## Required variables for full backend (auth + DB)

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Yes (API routes / vault) |

Optional: `DATABASE_URL` only for `npm run db:migrate` (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)).

---

## AI provider keys (AIML, Bright Data, etc.)

If the team uses the **Supabase vault**:

1. Owner runs `npm run secrets:sync` once (keys stored in Supabase, not Git).
2. You only need the three Supabase vars above in `.env.local`.
3. Check vault: `npm run secrets:verify`

If there is no vault yet, the owner shares provider keys the same way as `.env.local` (secure channel), or you add them locally for dev only.

See [SECRETS_VAULT.md](./SECRETS_VAULT.md).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Sign-in fails / “Supabase not configured” | Run `npm run env:check`, fill missing Supabase vars, restart `npm run dev` |
| Settings shows Supabase not Ready | Same as above; confirm project ref matches [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) |
| Chat works but no cloud monitors | Expected in local-only mode; add Supabase keys |
| `env:check` passes but APIs fail | Owner may need to run SQL migrations — [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) §2 |

---

## Security

- Do not commit `.env.local`.
- Rotate keys if they were posted in Slack, email, or a PR by mistake.
- Prefer Supabase team invite (Option B) over sharing the service role key in chat when possible.
