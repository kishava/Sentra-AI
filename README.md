# Sentra AI

Sentra AI is a production-style enterprise AI intelligence platform built with
Next.js 15, TypeScript, Tailwind CSS, ShadCN-style UI primitives, Framer Motion,
GSAP, Three.js / React Three Fiber, AI/ML API, Bright Data, ElevenLabs, Lucide
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
- Backend API routes for Bright Data intelligence collection, AI/ML API (OpenAI-compatible) analysis,
  and ElevenLabs speech synthesis.
- Demo-safe fallbacks when provider keys are absent, so the project runs
  immediately for demos and hackathons.

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

1. `npm run env:setup` then add **AIML_API_KEY**, **Bright Data**, and
   **ElevenLabs** keys if not using the Supabase vault (see hackathon demo below).
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

ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
```

Without keys, Sentra AI uses polished demo intelligence so the UI and API routes
remain functional.

## Routes

- `/` - cinematic landing page
- `/sign-in` - Supabase auth (email, magic link, Google, GitHub)
- `/sign-up` - create workspace
- `/onboarding` - first-run setup checklist
- `/settings` - integration status (Bright Data zones, AI/ML API, ElevenLabs)
- `/dashboard` - intelligence operating system with live briefing refresh
- `/chat` - AI analyst chat with microphone transcription and voice playback
- `/analyst` - AI World Engine and visual-forensics investigation workspaces
- `/alerts` - enterprise alert center

## API Routes

- `POST /api/chat` - answers general chat questions using OpenAI live web search;
  monitoring, competitor, pricing, extraction, and URL prompts use Bright Data
  collection first when configured, then OpenAI analysis with citations
- `POST /api/transcribe` - transcribes microphone recordings with OpenAI speech-to-text
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
- `POST /api/voice` - ElevenLabs text-to-speech with demo fallback
- `GET /api/signals` - latest signals for the signed-in user
- `GET|POST /api/monitors` - CRUD custom monitors
- `POST /api/monitors/[id]/check` - Bright Data + OpenAI monitor check (manual, credit-safe)
- `GET /api/health/integrations` - integration readiness for settings/onboarding

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL in `supabase/migrations/001_initial_schema.sql` in the SQL editor.
3. Enable Email, Magic Link, Google, and GitHub providers in Authentication.
4. Set redirect URL: `http://localhost:3001/auth/callback` (and your production URL).

## Hackathon demo script

**Bright Data** collects live web evidence; **AI/ML API** routes each task to the right model through one key.

1. Add `AIML_API_KEY` from [aimlapi.com](https://aimlapi.com) and Bright Data keys to `.env.local`.
2. **Settings** → confirm **AI/ML API** and **Bright Data** show Ready.
3. **Dashboard** → **Refresh briefing** (SERP via Bright Data + AIML analysis).
4. **Chat** → generic question (AIML search model) or paste a competitor `https://` URL (Bright Data + AIML).
5. **Alerts** → create a monitor → **Check now** (SERP/Unlocker + structured signals).
6. **World Engine** / **Visual forensics** → one query each to verify AIML paths.

Bright Data promo: `unlocked` on [brightdata.com](https://brightdata.com).

## Production Notes

- Deploys cleanly on Vercel.
- Provider calls run in Node.js API routes and keep secrets server-side.
- Chat uses Bright Data only when configured and a collection-oriented prompt
  is detected; otherwise it uses AI/ML API search-capable models.
- Demo fallbacks are intentionally typed and isolated in `src/data` and
  `src/services` so they can be swapped for real data pipelines.
