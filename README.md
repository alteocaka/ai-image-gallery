# AI Image Gallery

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
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Auth, Gallery, etc.
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Supabase client, API helpers
│   │   └── ...
│   └── package.json
├── server/                 # Node.js backend (Express)
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── services/      # AI, storage, business logic
│   │   ├── jobs/          # Background AI processing
│   │   └── lib/           # Supabase admin, config
│   └── package.json
├── supabase/
│   └── migrations/        # SQL schema & RLS
├── .env.example
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
cd server && npm run dev

# Terminal 2 - Frontend
cd client && npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## API Keys Needed

- **Supabase:** Project URL and anon key (frontend), service role key (backend, server-side only)
- **AI service:** To be chosen; document in `docs/ai-service-comparison.md`

## Architecture Decisions

- **React + Vite:** Fast dev experience and builds.
- **Express backend:** Handles AI API calls and background jobs; keeps API keys server-side.
- **Supabase Auth:** Email/password only; RLS for per-user data.
- **Background processing:** Images upload immediately; AI analysis runs async so uploads are not blocked.

## AI Service Comparison

See `docs/ai-service-comparison.md` for:

- Comparison of at least 2 AI options
- Chosen service and justification (cost, features, ease of use)
- Trade-offs and cost awareness

## Potential Improvements

- Deploy to Vercel (frontend) + Railway/Render (backend)
- Image download, tag editing, dark mode
- Export search results as JSON
- Unit tests for core functions
