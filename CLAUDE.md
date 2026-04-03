# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

No test framework is configured in this project.

## Architecture

**MemoAI** is a fully serverless AI-powered flashcard/study app. There is no custom backend server — only a React SPA, Supabase (database + auth + edge functions), and direct calls to the Anthropic API.

### Frontend (React SPA)

- **Entry:** `src/main.jsx` → `src/App.jsx` (React Router, protected routes)
- **Global state:** Two React contexts — `useAuth` (user + Supabase session) and `useLang` (EN/SV)
- **Data layer:** `useSets` hook fetches/saves study sets from Supabase; all writes are optimistic (UI updates immediately, DB syncs in background)
- **Styling:** No CSS files — all styles are inline React style objects using CSS custom properties (`--bg`, `--tx`, `--ac`, etc.) defined on `:root`
- **i18n:** Custom translation object in `src/i18n/translations.js`; language stored in `localStorage` as `memoai_lang`

### Study Modes (`src/pages/study/`)

Six modes, all fed from `study_sets` rows: Flashcards, Learn (spaced repetition), Quiz, PracticeTest, MagicNotes, Tutor (AI chat). The SM-2 spaced repetition algorithm lives in `src/lib/ai.js`.

### AI Integration (`src/lib/ai.js`)

Direct HTTPS calls to `https://api.anthropic.com/v1/messages` — no SDK. Model: `claude-sonnet-4-20250514`. Functions: generate flashcards, quiz questions, magic notes, titles, study plans, and SM-2 scheduling. The API key is exposed client-side via `VITE_ANTHROPIC_API_KEY`.

### Backend (Supabase)

- **Schema:** `supabase/setup.sql` — `profiles` table (quota, pro status) and `study_sets` table (all generated content stored as JSON columns). RLS enforces user-owns-data on both tables.
- **Auth trigger:** Automatically creates a `profiles` row on signup.
- **Edge functions** (`supabase/functions/`, Deno runtime):
  - `stripe-webhook` — validates Stripe signature, sets `is_pro = true` on subscription events
  - `create-portal-session` — creates Stripe billing portal URL
  - `reset-weekly-uploads` — resets `uploads_this_week` counter (runs Monday 00:00 UTC)

### Payments

Stripe checkout is initiated client-side (`src/lib/stripe.js`). On success, the `stripe-webhook` edge function updates the user's `profiles` row. Upload quota: 3/week free, unlimited for Pro users.

## Environment Variables

Frontend (via `import.meta.env.VITE_*`, see `.env.example`):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_STRIPE_PRO_PRICE_ID`
- `VITE_ANTHROPIC_API_KEY`

Edge function secrets (set via `supabase secrets set`):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

## Deployment

- **Frontend:** Vercel (SPA rewrites all routes to `index.html` via `vercel.json`)
- **Database + Auth + Functions:** Supabase project
