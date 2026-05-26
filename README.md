# Sentra AI

Sentra AI is a production-style enterprise AI intelligence platform built with
Next.js 15, TypeScript, Tailwind CSS, ShadCN-style UI primitives, Framer Motion,
GSAP, Three.js / React Three Fiber, OpenAI, Bright Data, ElevenLabs, Lucide
icons, and Recharts.

The app presents a futuristic operating system for autonomous business
intelligence: landing page, authentication screens, AI dashboard, live alert
center, enterprise chat, voice playback, charts, command palette, and typed API
routes.

## Features

- Premium dark glassmorphism UI with animated gradients, particles, glowing AI
  orb, hover motion, smooth reveal animations, and responsive layouts.
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
- Backend API routes for Bright Data intelligence collection, OpenAI analysis,
  and ElevenLabs speech synthesis.
- Demo-safe fallbacks when provider keys are absent, so the project runs
  immediately for demos and hackathons.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the provider keys you want to
enable:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-4o
OPENAI_WORLD_MODEL=gpt-5.5
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-transcribe
SENTRA_TIMEZONE=Asia/Colombo

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
- `/settings` - integration status (Bright Data zones, OpenAI, ElevenLabs)
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
4. Set redirect URL: `http://localhost:3000/auth/callback` (and your production URL).

## Hackathon demo script (Bright Data)

1. **Dashboard** → **Refresh briefing** (SERP via Bright Data when zones are set).
2. **Chat** → `Track competitor pricing changes` or paste a competitor `https://` URL (Unlocker).
3. **Alerts** → create a monitor → **Check now** (SERP/Unlocker + structured signals).

Promo code for credits: `unlocked` on [brightdata.com](https://brightdata.com).

## Production Notes

- Deploys cleanly on Vercel.
- Provider calls run in Node.js API routes and keep secrets server-side.
- Chat uses Bright Data only when configured and a collection-oriented prompt
  is detected; otherwise it remains on OpenAI live web search.
- Demo fallbacks are intentionally typed and isolated in `src/data` and
  `src/services` so they can be swapped for real data pipelines.
