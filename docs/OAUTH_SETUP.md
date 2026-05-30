# GitHub & Google login (Supabase OAuth)

Sentra uses Supabase Auth. Social buttons stay disabled until providers are enabled in Supabase.

**Automate (after you have OAuth client IDs):**

```bash
# 1. Add to .env.local (see section 4)
# 2. Run:
npm run auth:configure
```

---

## 1. Supabase callback URL (use in GitHub + Google)

```text
https://rgvjmtpimjvgusrqrldj.supabase.co/auth/v1/callback
```

Copy from: **Supabase → Authentication → Providers → GitHub** (Callback URL field).

---

## 2. GitHub OAuth app

1. [GitHub → Settings → Developer settings → OAuth Apps](https://github.com/settings/developers) → **New OAuth App**
2. **Application name:** `Sentra AI`
3. **Homepage URL:** `http://localhost:3001` (add production URL later)
4. **Authorization callback URL:** `https://rgvjmtpimjvgusrqrldj.supabase.co/auth/v1/callback`
5. Create → copy **Client ID** and generate **Client secret**

---

## 3. Google (Gmail) OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) → project → **APIs & Services**
2. **OAuth consent screen** → External → add your email as test user (while Testing)
3. **Credentials** → **Create OAuth client ID** → **Web application**
4. **Authorized redirect URIs:**  
   `https://rgvjmtpimjvgusrqrldj.supabase.co/auth/v1/callback`
5. Copy **Client ID** and **Client secret**

Guide: [Supabase — Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)

---

## 4. Add secrets to `.env.local` (never commit)

```env
# https://supabase.com/dashboard/account/tokens
SUPABASE_ACCESS_TOKEN=sbp_your_personal_access_token

# From GitHub OAuth app
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=

# From Google Cloud OAuth client
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=

# Production (optional)
NETLIFY_SITE_URL=https://aisantra.netlify.app
SENTRA_APP_URL=http://localhost:3001
```

Then:

```bash
npm run auth:configure
npm run dev
```

Open `/sign-in` — **GitHub** and **Google** should redirect and return to `/dashboard`.

---

## 5. Manual alternative (Supabase UI)

**Authentication → Providers:**

| Provider | Action |
|----------|--------|
| Email | Enable, optional: disable “Confirm email” |
| GitHub | Enable, paste Client ID + Secret |
| Google | Enable, paste Client ID + Secret |

**Authentication → URL configuration:**

| Setting | Values |
|---------|--------|
| Site URL | `http://localhost:3001` or Netlify URL |
| Redirect URLs | `http://localhost:3001/auth/callback`, `https://YOUR-SITE.netlify.app/auth/callback` |

---

## 6. Netlify production

Add the same vars in **Netlify → Environment variables** (not the OAuth secrets in git).  
Run `auth:configure` locally once with `SENTRA_APP_URL` / `NETLIFY_SITE_URL` set, or paste redirect URLs in Supabase UI.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Buttons grey / message about Providers | Run `npm run auth:configure` or enable in Supabase UI |
| Redirect error after Google/GitHub | Add exact `/auth/callback` URLs in Supabase URL configuration |
| `redirect_uri_mismatch` (Google) | Redirect URI must be Supabase callback, not localhost |
| Workspace amber banner | Run `npm run db:migrate` or SQL migrations |
