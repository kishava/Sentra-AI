# Sentra AI

Sentra AI is a production-style enterprise AI intelligence platform built with
Next.js 15, TypeScript, Tailwind CSS, ShadCN-style UI primitives, Framer Motion,
GSAP, Three.js / React Three Fiber, AI/ML API, Bright Data, Speechmatics, Lucide
icons, and Recharts.

The app presents a futuristic operating system for autonomous business
intelligence: landing page, authentication screens, AI dashboard, live alert
center, enterprise chat, voice playback, charts, command palette, and typed API
routes.

## Features

- Premium dark glassmorphism UI with animated gradients, particles, glowing AI
  orb, smooth reveal animations, and responsive layouts.
- Dashboard for competitor monitoring, market intelligence, live signals,
  sentiment/risk analysis, company tracking, trend visualization, and AI
  recommendations.
- AI chat interface with markdown responses, typing animation, prompt shortcuts,
  thinking state, contextual follow-up questions, retrieval labels, and voice
  playback controls.
- AI World Engine with a WebGL intelligence globe, adaptive visualizations,
  relationship graph, predictive timelines, scenario simulations, narrated
  briefings, and cinematic World Pulse presentation mode.
- Real-time AI Activity Console backed by server-sent events, with measured
  collection/API lifecycle logs, virtualized terminal output, live source
  tracking, system health telemetry, and safe summarized thought-stream cards.
- Visual-forensics analyst workspace for prompt-directed image investigations,
  comparison review, verdict scoring, report history, and PDF export.
- Backend API routes for Bright Data intelligence collection (SERP + Web Unlocker),
  AI/ML API analysis, and Speechmatics voice synthesis.
- Demo-safe fallbacks in **local dev** when provider keys are absent; **production**
  requires live Bright Data for GTM collection paths.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) (dev server default port).

## Collaborators (missing `.env.local`)

`.env.local` is gitignored — it is **not** pushed to GitHub. New developers:

```bash
npm run env:setup    # creates .env.local from .env.example
# add Supabase keys (see docs/COLLABORATOR_SETUP.md)
npm run env:check
npm run dev
```

Get keys from the project owner (secure message) or a Supabase team invite. Full guide:
**[docs/COLLABORATOR_SETUP.md](docs/COLLABORATOR_SETUP.md)** and **[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)**.

## Local development (GitHub collab, no deploy yet)

You can run Sentra **without Supabase**. Leave `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` empty in `.env.local`.

1. `npm run env:setup` then sync provider keys to Supabase vault (`npm run secrets:sync`)
   or add **AIML_API_KEY**, **Bright Data**, and **SPEECHMATICS_API_KEY** locally.
2. `npm run dev` → open [http://localhost:3001](http://localhost:3001) → **Enter workspace (local mode)**.
3. Monitors are stored in **browser localStorage** per machine; chat history is
   session-only until you add Supabase for deploy.

When you deploy, create a Supabase project, run `supabase/migrations/001_initial_schema.sql`,
add the three Supabase env vars, and real auth + cloud persistence turn on automatically.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the provider keys you want to
enable:

```bash
# Optional until production deploy
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

AIML_API_KEY=
AIML_BASE_URL=https://api.aimlapi.com/v1
AIML_MODEL_ANALYSIS=gpt-4o-mini
AIML_MODEL_CHAT=gpt-4o
AIML_MODEL_SEARCH=gpt-4o-search-preview
AIML_MODEL_INTENT=gpt-4o-mini
AIML_MODEL_WORLD=gpt-4o
AIML_MODEL_VISION=gpt-4o
AIML_MODEL_TRANSCRIBE=whisper-1
SENTRA_TIMEZONE=Asia/Colombo

# Optional direct OpenAI fallback
OPENAI_API_KEY=

BRIGHT_DATA_API_KEY=
BRIGHT_DATA_CACHE_TTL_SECONDS=900
BRIGHT_DATA_SERP_ENDPOINT=https://api.brightdata.com/request
BRIGHT_DATA_SERP_ZONE=
BRIGHT_DATA_WEB_UNLOCKER_ENDPOINT=https://api.brightdata.com/request
BRIGHT_DATA_WEB_UNLOCKER_ZONE=
BRIGHT_DATA_SCRAPER_ENDPOINT=

SPEECHMATICS_API_KEY=
```

Without keys, Sentra AI uses polished demo intelligence so the UI and API routes
remain functional.

## Routes

- `/` - cinematic landing page
- `/sign-in` - Supabase auth (email, magic link, Google, GitHub)
- `/sign-up` - create workspace
- `/onboarding` - first-run setup checklist
- `/settings` - integration status (Bright Data zones, AI/ML API, Speechmatics)
- `/dashboard` - intelligence operating system with live briefing refresh
- `/chat` - AI analyst chat with microphone transcription and voice playback
- `/analyst` - AI World Engine and visual-forensics investigation workspaces
- `/alerts` - enterprise alert center

## API Routes

- `POST /api/chat` - answers general chat questions using AI/ML API live web search;
  monitoring, competitor, pricing, and URL prompts use Bright Data collection first,
  then AIML analysis with citations
- `POST /api/transcribe` - transcribes microphone recordings (AIML Whisper)
- `GET|POST /api/intelligence` - returns risks, opportunities, recommendations,
  confidence score, and live signals
- `POST /api/world-engine` - creates visualization-ready global intelligence
  models with live-search verification and Bright Data evidence when configured
- `POST /api/world-engine/stream` - streams real collection, web-search,
  synthesis, visualization, and completion activity events over SSE while
  returning the completed World Engine model
- `POST /api/image-analysis` - analyzes uploaded visual evidence after an
  investigator submits a prompt
- `POST /api/bright-data` - reusable Bright Data collection endpoint (auth required)
- `POST /api/voice` - Speechmatics text-to-speech (WAV)
- `GET /api/cron/monitors` - scheduled GTM monitor checks (Vercel Cron + `CRON_SECRET`)
- `GET /api/signals` - latest signals for the signed-in user
- `GET|POST /api/monitors` - CRUD custom monitors
- `POST /api/monitors/[id]/check` - Bright Data + AIML monitor check (manual or cron)
- `GET /api/health/integrations` - integration readiness for settings/onboarding

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL in `supabase/migrations/001_initial_schema.sql` in the SQL editor.
3. Enable Email, Magic Link, Google, and GitHub providers in Authentication.
4. Set redirect URL: `http://localhost:3001/auth/callback` (and your production URL).

## Hackathon — GTM Intelligence (Web Data UNLOCKED)

**Track:** [GTM Intelligence](https://lablab.ai/ai-hackathons/brightdata-ai-agents-web-data-hackathon)  
**Full submission guide:** [docs/HACKATHON_GTM_SUBMISSION.md](docs/HACKATHON_GTM_SUBMISSION.md)  
**Operator setup (zones, Vercel, vault):** [docs/USER_SETUP.md](docs/USER_SETUP.md)

**Stack:** Bright Data (SERP + Web Unlocker) → AI/ML API → Supabase → Vercel. Voice via Speechmatics.

### Judge demo (5 min)

1. `npm run secrets:sync` — AIML, Bright Data zones, Speechmatics in Supabase vault.
2. Deploy to Vercel with Supabase env vars + `CRON_SECRET` (see hackathon doc).
3. **Settings** → AI/ML API + Bright Data + Speechmatics **Ready**.
4. **Dashboard** → **Refresh briefing** → **Live · Bright Data** (not Sample).
5. **Chat** → paste competitor `https://` URL → badge **Bright Data + AIML**.
6. **Alerts** → monitor → **Check now** → executive report.
7. Optional: **World Engine**, document upload (Featherless), voice play.

Bright Data promo: `unlocked` on [brightdata.com](https://brightdata.com).

### Production GTM rules

- On Vercel/production, **sample Bright Data fallback is disabled** unless `SENTRA_ALLOW_DEMO_FALLBACK=true`.
- Active monitors are checked every **30 minutes** via `/api/cron/monitors` (see `vercel.json`).

## Production Notes

- Deploys cleanly on Vercel.
- Provider calls run in Node.js API routes and keep secrets server-side.
- Chat uses Bright Data only when configured and a collection-oriented prompt
  is detected; otherwise it uses AI/ML API search-capable models.
- Demo fallbacks are intentionally typed and isolated in `src/data` and
  `src/services` so they can be swapped for real data pipelines.
