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
OPENAI_API_KEY=
OPENAI_WORLD_MODEL=gpt-5.5
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-transcribe
SENTRA_TIMEZONE=Asia/Colombo

BRIGHT_DATA_API_KEY=
BRIGHT_DATA_SERP_ENDPOINT=
BRIGHT_DATA_SERP_ZONE=
BRIGHT_DATA_WEB_UNLOCKER_ENDPOINT=
BRIGHT_DATA_WEB_UNLOCKER_ZONE=
BRIGHT_DATA_SCRAPER_ENDPOINT=

ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
```

Without keys, Sentra AI uses polished demo intelligence so the UI and API routes
remain functional.

## Routes

- `/` - cinematic landing page
- `/sign-in` - animated sign-in
- `/sign-up` - animated sign-up
- `/dashboard` - intelligence operating system
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
- `POST /api/bright-data` - reusable Bright Data collection endpoint
- `POST /api/voice` - ElevenLabs text-to-speech with demo fallback

## Production Notes

- Deploys cleanly on Vercel.
- Provider calls run in Node.js API routes and keep secrets server-side.
- Chat uses Bright Data only when configured and a collection-oriented prompt
  is detected; otherwise it remains on OpenAI live web search.
- Demo fallbacks are intentionally typed and isolated in `src/data` and
  `src/services` so they can be swapped for real data pipelines.
