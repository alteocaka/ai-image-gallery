# 🖼️ AI Image Gallery

A web application where users can upload images, get automatic AI-generated tags and descriptions, and search through their images using text or find similar images. Supports **multiple AI providers** (Google Gemini and OpenAI); users choose provider and model in the profile menu; preferences are stored in the browser (localStorage).

## Live application

**[AI Image Gallery](https://ai-image-gallery-delta.vercel.app/)** — frontend on Vercel, API on Render.

**Note (Render free tier):** The backend spins down after inactivity. If the app is slow or requests fail, open the backend URL first ([https://ai-image-gallery-b1g4.onrender.com](https://ai-image-gallery-b1g4.onrender.com)), wait a moment for it to wake up, then use the app again.

## Tech Stack

- **Frontend:** React (Vite)
- **Backend:** Node.js (Express)
- **Auth & Database:** Supabase
- **Storage:** Supabase Storage
- **AI:** Pluggable providers — Google Gemini (default) or OpenAI (GPT-4o vision)

## Project Structure

```
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # AuthLayout, ImageGrid, ImageModal, UploadZone, UserMenu, etc.
│   │   ├── contexts/       # AuthContext, ThemeContext, AISettingsContext
│   │   ├── hooks/          # useAuth (re-exports from context)
│   │   ├── lib/            # Supabase client, API helpers
│   │   ├── pages/          # Login, Signup, Gallery
│   │   ├── test/           # Vitest setup (setup.js)
│   │   ├── constants.js    # AI_PROVIDERS, AI_MODELS, etc.
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/                 # Node.js backend (Express)
│   ├── src/
│   │   ├── routes/         # auth, images, search
│   │   ├── services/       # ai (factory + providers), storage
│   │   │   └── ai/         # factory.js, providers/gemini.js, providers/openai.js
│   │   ├── jobs/           # Background AI processing (processImage)
│   │   ├── middleware/     # JWT auth
│   │   └── lib/            # Supabase admin, config
│   └── package.json
├── supabase/
│   └── migrations/        # SQL schema & RLS (images, image_metadata)
├── client/.env.example, server/.env.example
└── README.md
```

## Setup

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account

### 1. Clone and install

```bash
cd "AI Image Gallery"
npm run install:all
```

Or manually:

```bash
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Environment variables

Copy `client/.env.example` to `client/.env` and `server/.env.example` to `server/.env`, then fill in:

- **Client:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Server:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, and at least one AI provider:
  - **Gemini (default):** `AI_API_KEY` or `GEMINI_API_KEY`; optional `GEMINI_MODEL` (e.g. `gemini-2.5-flash`)
  - **OpenAI:** `OPENAI_API_KEY`; optional `OPENAI_MODEL` (e.g. `gpt-4o`)

Users pick provider and model in the app (profile menu); choices are stored in the browser (localStorage) and sent with each upload. No database table is required for AI settings.

### 3. Database

Run the SQL in `supabase/migrations/` in your Supabase SQL Editor (or use Supabase CLI) to create tables and RLS policies.

### 4. Run locally

```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev:client
```

Or from each folder: `cd server && npm run dev` and `cd client && npm run dev`.

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### 5. Run tests

Only the **client** is set up for tests (Vitest + React Testing Library). From the repo root:

```bash
# Run client tests once
npm test

# Client tests in watch mode
npm run test:watch
```

- **Client:** `client/src/**/*.{test,spec}.{js,jsx}` — Vitest, React Testing Library, jsdom
- **Setup:** `client/src/test/setup.js` (jest-dom matchers, RTL cleanup)
- **Server:** No test runner or tests in this repo.

### 6. Format code

```bash
npm run format
```

Runs Prettier on README, server source, and client source.

## API Keys Needed

- **Supabase:** Project URL and anon key (frontend), service role key and JWT secret (backend).
- **AI:** At least one provider so image analysis works:
  - **Gemini:** [Google AI Studio](https://aistudio.google.com/apikey) → `AI_API_KEY` or `GEMINI_API_KEY`
  - **OpenAI:** [OpenAI API keys](https://platform.openai.com/api-keys) → `OPENAI_API_KEY`

## Features

- **Auth:** Email/password via Supabase; protected and public routes; auth state in React context
- **Gallery:** Paginated grid, text search, color filter, upload with progress
- **AI providers:** Choose **Google Gemini** or **OpenAI** (and model) in the profile dropdown; selection stored in localStorage and used for new uploads
- **Image modal:** View full image, description, tags, colors; edit description/tags; find similar; download; delete. If AI analysis fails (e.g. quota), a message prompts you to add description and tags manually
- **Dark mode:** Toggle in navbar (persisted in localStorage)
- **Export as JSON:** In the profile menu, export all your gallery images (metadata: description, tags, colors, URLs) as a JSON file for backup or use elsewhere
- **Code:** Path alias `@/`, shared AuthLayout, AISettingsContext, constants (including AI provider/model lists), Prettier

## Architecture Decisions

- **React + Vite:** Fast dev experience and builds.
- **Express backend:** Handles AI API calls and background jobs; keeps API keys server-side. Image download is proxied through the server (`GET /api/images/:id/download`) so the browser gets `Content-Disposition: attachment`.
- **Supabase Auth:** Email/password; RLS for per-user data.
- **Background processing:** Images upload immediately; AI analysis runs async so uploads are not blocked. Provider and model are sent with each upload (from the client’s localStorage); the server uses them in the job.
- **AI factory:** Server-side factory picks Gemini or OpenAI based on the request; both return the same shape (tags, description, colors). Add more providers by implementing the same interface under `server/src/services/ai/providers/`.
- **Theme:** Single `ThemeProvider` and `data-theme` on `<html>`; dark styles in CSS.

## Potential Improvements

- More client unit tests
