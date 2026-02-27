# 🖼️ AI Image Gallery

A web application where users can upload images, get automatic AI-generated tags and descriptions, and search through their images using text or find similar images.

## Tech Stack

- **Frontend:** React (Vite)
- **Backend:** Node.js (Express)
- **Auth & Database:** Supabase
- **Storage:** Supabase Storage

## Project Structure

```
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # UI components (AuthLayout, ImageGrid, ImageModal, etc.)
│   │   ├── contexts/       # AuthContext, ThemeContext
│   │   ├── hooks/          # useAuth (re-exports from context)
│   │   ├── lib/            # Supabase client, API helpers
│   │   ├── pages/          # Login, Signup, Gallery
│   │   ├── test/           # Vitest setup (setup.js)
│   │   ├── constants.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/                 # Node.js backend (Express)
│   ├── src/
│   │   ├── routes/         # auth, images, search
│   │   ├── services/       # AI, storage
│   │   ├── jobs/           # Background AI processing (processImage)
│   │   ├── middleware/     # JWT auth
│   │   └── lib/            # Supabase admin, config
│   └── package.json
├── supabase/
│   └── migrations/         # SQL schema & RLS
├── .env.example (and client/.env.example, server/.env.example)
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

Copy `.env.example` to `.env` in both `client/` and `server/`, then fill in:

- **Client:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Server:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, AI service API key(s)

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

- **Supabase:** Project URL and anon key (frontend), service role key (backend, server-side only)
- **AI service:** To be chosen; document in `docs/ai-service-comparison.md`

## Features

- **Auth:** Email/password via Supabase; protected and public routes; auth state in React context
- **Gallery:** Paginated grid, text search, color filter, upload with progress
- **Image modal:** View full image, description, tags, colors; edit description/tags; find similar; **download** (forced via API); delete
- **Dark mode:** Toggle in navbar (persisted in localStorage)
- **Code:** Path alias `@/`, shared AuthLayout for Login/Signup, constants file, Prettier

## Architecture Decisions

- **React + Vite:** Fast dev experience and builds.
- **Express backend:** Handles AI API calls and background jobs; keeps API keys server-side. Image download is proxied through the server (`GET /api/images/:id/download`) so the browser gets `Content-Disposition: attachment`.
- **Supabase Auth:** Email/password; RLS for per-user data.
- **Background processing:** Images upload immediately; AI analysis runs async so uploads are not blocked.
- **Theme:** Single `ThemeProvider` and `data-theme` on `<html>`; dark styles in CSS.

## AI Service Comparison

See `docs/ai-service-comparison.md` for:

- Comparison of at least 2 AI options
- Chosen service and justification (cost, features, ease of use)
- Trade-offs and cost awareness

## Potential Improvements

- Deploy to Vercel (frontend) + Railway/Render (backend)
- Export search results as JSON
- More client unit tests
