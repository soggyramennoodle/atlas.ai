# Atlas

A smart study assistant for students. Upload a lecture recording and Atlas
returns thorough, structured notes — a summary, fully detailed sections, and
key concepts — saved to your personal library.

Built with **Next.js (App Router)**, **Tailwind CSS**, **Framer Motion**,
**shadcn/ui**, **Supabase** (auth + Postgres + Storage) and the **Gemini API**
(audio understanding via the Files API).

## How it works

1. You sign in and upload an audio recording on `/upload`.
2. The file goes straight to a private Supabase Storage bucket (scoped to you).
3. A server route (`/api/notes`) downloads it, sends it to Gemini's Files API,
   and asks for thorough structured notes via a JSON response schema.
4. The notes are saved to Postgres and shown at `/notes/[id]`; your whole
   library lives at `/dashboard`.

Your secrets never reach the browser: the Gemini key and Supabase service-role
key are server-only, and all data access is protected by Postgres Row Level
Security.

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

1. Make a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
   `notes` table, the private `lectures` storage bucket, and all RLS policies.
3. **Auth redirect URLs.** Under **Authentication → URL Configuration**, set
   the **Site URL** to `http://localhost:3000` (local) and add your deployed
   URL plus `<url>/auth/callback` to **Redirect URLs**. Magic links and OAuth
   both come back through `/auth/callback`.

Atlas is **passwordless**: users sign in with a magic link (email), Google, or
Apple. Magic links work out of the box. Google and Apple need provider
credentials — see [Sign-in providers](#sign-in-providers) below.

### 3. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/apikey).
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase
  **Project Settings → API**.
- `SUPABASE_SERVICE_ROLE_KEY` — same page (server-only; optional for now).

> `.env.local` is gitignored. Never commit it or paste keys into chats/PRs.
> If a key is ever exposed, rotate it immediately.

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

## Sign-in providers

Magic-link (email) sign-in needs no setup. To enable the social buttons:

**Google** — in Supabase, **Authentication → Providers → Google**, toggle it on,
and paste a Google OAuth **Client ID** and **Client Secret** from the
[Google Cloud console](https://console.cloud.google.com/apis/credentials)
(create an "OAuth client ID", type *Web application*). Add Supabase's callback
URL — shown in that provider panel, like
`https://<project-ref>.supabase.co/auth/v1/callback` — as an authorized redirect
URI in Google.

**Apple** — in Supabase, **Authentication → Providers → Apple**, toggle it on
and provide the Service ID, Team ID and key. This requires a paid
[Apple Developer Program](https://developer.apple.com/programs/) membership
($99/yr) and a "Sign in with Apple" Service ID. Until that's configured, the
Apple button shows a friendly error; Google and magic links still work.

## Deploying to Vercel

1. Push this repo to GitHub (already done if you used the GitHub flow).
2. At [vercel.com/new](https://vercel.com/new), **Import** the
   `soggyramennoodle/atlas.ai` repo. Vercel auto-detects Next.js.
3. Before deploying, add the **same four environment variables** from your
   `.env.local` under **Settings → Environment Variables** (Production +
   Preview): `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. `.env.local` is
   **not** uploaded — Vercel needs its own copy.
4. After the first deploy, copy your `*.vercel.app` URL into Supabase
   **Authentication → URL Configuration** (Site URL + `…/auth/callback` redirect)
   so magic links and OAuth redirect back correctly.

> **Lecture length & timeouts.** Note generation runs in the `/api/notes`
> function. Vercel's **Hobby** plan caps function duration at 60s, which a long
> lecture can exceed; the **Pro** plan allows up to 300s (the route already sets
> `maxDuration = 300`). For very long recordings, deploy on Pro or run locally.

## Notes on file size

The `lectures` bucket has a per-file size limit (set to 100 MB in the schema).
The uploader enforces the same limit client-side. To allow larger lectures,
raise both `MAX_BYTES` in `src/components/upload/uploader.tsx` and the bucket's
`file_size_limit` (and check your Supabase plan's maximum). Because audio is
uploaded straight to Supabase Storage (not through the API route), Vercel's
4.5 MB request-body limit doesn't apply.

## Project structure

```
src/
  app/
    page.tsx                 Landing page
    login/ signup/           Auth pages
    auth/callback, signout   Auth routes
    upload/                  Upload page (protected)
    dashboard/               Saved notes library (protected)
    notes/[id]/              Single note view + delete action (protected)
    api/notes/route.ts       Gemini processing + save (server)
  components/
    landing/ auth/ upload/ notes/   Feature components
    ui/                      shadcn/ui primitives
  lib/
    gemini.ts                Gemini Files API + structured-notes prompt/schema
    types.ts                 StructuredNotes types
    supabase/                Browser/server/admin clients + session middleware
supabase/schema.sql          Database + storage + RLS setup
middleware.ts                Session refresh + route protection
```

## Roadmap

Flashcards and quiz generation from a lecture are intentionally left as a
separate, future feature.
