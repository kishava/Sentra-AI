# Sentra AI

Sentra AI is a production-style enterprise AI intelligence platform built with
Next.js 15, TypeScript, Tailwind CSS, ShadCN-style UI primitives, Framer Motion,
GSAP, OpenAI, Bright Data, ElevenLabs, Lucide icons, and Recharts.

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
- `/alerts` - enterprise alert center

## API Routes

- `POST /api/chat` - answers general chat questions using OpenAI live web search;
  monitoring, competitor, pricing, extraction, and URL prompts use Bright Data
  collection first when configured, then OpenAI analysis with citations
- `POST /api/transcribe` - transcribes microphone recordings with OpenAI speech-to-text
- `GET|POST /api/intelligence` - returns risks, opportunities, recommendations,
  confidence score, and live signals
- `POST /api/bright-data` - reusable Bright Data collection endpoint
- `POST /api/voice` - ElevenLabs text-to-speech with demo fallback

## Production Notes

- Deploys cleanly on Vercel.
- Provider calls run in Node.js API routes and keep secrets server-side.
- Chat uses Bright Data only when configured and a collection-oriented prompt
  is detected; otherwise it remains on OpenAI live web search.
- Demo fallbacks are intentionally typed and isolated in `src/data` and
  `src/services` so they can be swapped for real data pipelines.
