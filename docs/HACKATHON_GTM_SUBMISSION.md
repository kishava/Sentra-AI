# Web Data UNLOCKED — GTM Intelligence submission (Sentra AI)

Hackathon: [Bright Data AI Agents + Web Data](https://lablab.ai/ai-hackathons/brightdata-ai-agents-web-data-hackathon)  
**Track:** GTM Intelligence

## One-line pitch (≤255 chars)

Sentra AI is a GTM intelligence OS: Bright Data collects live competitor and market evidence, AI/ML API reasons over it, and monitors deliver executive briefs, alerts, and Speechmatics voice playback.

## Long description (template)

Enterprise GTM and strategy teams spend dozens of hours stitching competitor sites, SERPs, pricing pages, and hiring signals across disconnected tools. Sentra AI unifies that workflow into one command center.

Users describe what to watch in plain language; Sentra interprets monitor intent, collects evidence through **Bright Data SERP API** and **Web Unlocker**, and synthesizes risks, opportunities, and recommendations with **AI/ML API** (live search and analysis models). The **Dashboard** refreshes live briefings; **Chat** answers GTM questions with provider badges showing Bright Data + AIML when collection runs; **Alerts** run manual or **scheduled monitor checks** (Vercel cron every 30 minutes) and optional webhooks. **World Engine** and **Visual Forensics** extend investigations for macro and image-based cases.

Sentra is built on Next.js 15, Supabase (auth + persistence + API key vault), and deploys to Vercel. Production disables sample Bright Data fallback so judges always see live web evidence when zones are configured.

## Bright Data products used

| Product | Usage |
|---------|--------|
| **SERP API** | Monitor checks without URL, dashboard briefing, competitor keyword chat |
| **Web Unlocker** | HTTPS competitor URLs in chat and monitors |

Promo code: `unlocked` on [brightdata.com](https://brightdata.com).

## Technology tags (lablab)

- GTM Intelligence
- Bright Data
- AI/ML API
- Next.js
- Supabase
- Featherless AI (document chat — optional demo)
- Speechmatics (voice TTS)

## Judge demo URL & credentials

```
DEMO URL: https://YOUR_APP.vercel.app

TEST ACCOUNT (recommended):
  Email: judge@YOUR_DOMAIN.com
  Password: [provide in lablab "Additional information"]

OR: Sign up at /sign-up (instant workspace access).

GTM DEMO PATH (5 minutes):
1. Sign in → Settings → Bright Data + AI/ML API + Speechmatics = Ready
2. Dashboard → Refresh briefing → badge "Live · Bright Data" (not Sample)
3. Chat → paste https://[competitor-url] → provider "Bright Data + AIML"
4. Alerts → create monitor → Check now → open report
5. Optional: World Engine query + voice play on chat reply

If any step shows Sample data, Bright Data zones are missing — see Settings message.
```

## 5-minute video script

| Time | Content |
|------|---------|
| 0:00–0:30 | Problem: fragmented GTM research; Sentra as GTM OS |
| 0:30–1:00 | Architecture: Bright Data → AIML → Monitors/Reports |
| 1:00–2:00 | Settings green + Dashboard live briefing |
| 2:00–3:00 | Chat with competitor URL |
| 3:00–4:00 | Alerts monitor + Check now + report |
| 4:00–4:30 | Voice or World Engine (optional wow) |
| 4:30–5:00 | Business value, GitHub, live URL |

## Submission checklist (lablab)

- [ ] Project title
- [ ] Short + long descriptions
- [ ] Technology & **GTM Intelligence** track tag
- [ ] Cover image 16:9
- [ ] Video MP4 (&lt;5 min)
- [ ] Slides PDF
- [ ] Public GitHub repo
- [ ] Live Vercel URL
- [ ] Judge instructions (above)

## Production deploy (Vercel)

**Environment variables on Vercel:**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SENTRA_APP_URL=https://your-app.vercel.app
SENTRA_TIMEZONE=Asia/Colombo
CRON_SECRET=[random long secret]
```

Provider keys: `npm run secrets:sync` from machine with keys in `.env.local` (do not add AIML/BD to Vercel after sync).

**Cron:** `vercel.json` runs `GET /api/cron/monitors` every 30 minutes. Vercel sends `Authorization: Bearer $CRON_SECRET`.

**Bright Data in production:** Sample fallback is **off** when `NODE_ENV=production` or `VERCEL=1`. Set `SENTRA_ALLOW_DEMO_FALLBACK=true` only for emergency demos.

## Pre-submit smoke test

```bash
npm run build
npm run secrets:verify
```

Then on production:

1. Settings → Bright Data Ready (API + SERP + Unlocker)
2. Dashboard refresh → Live
3. Chat + URL → Bright Data + AIML
4. Monitor check → `provider: bright-data` in network response

## Slide outline (PDF)

1. Title + team  
2. Problem (GTM research fragmentation)  
3. Solution (Sentra pipeline)  
4. Architecture diagram (Bright Data + AIML + Supabase)  
5. Screenshots: Dashboard, Chat, Alerts  
6. Bright Data integration (SERP + Unlocker, live vs sample)  
7. Business model & market  
8. Roadmap (MCP, CRM export)  
9. Live URL + GitHub  

## Partner prizes (optional)

- **AI/ML API:** Central LLM gateway — mention in video  
- **Featherless:** Demo PDF upload in Chat with Featherless badge  
