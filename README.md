# CohortBuy

**Neighbors pool. Prices drop.** CohortBuy turns one neighbor's home project into a group deal — an AI agent forms the cohort, scopes the work, gathers real quotes, and splits the cost fairly, all from a chat.

This repo is the marketing **landing page** (Next.js + Tailwind) with a Supabase-backed waitlist. It's the first slice of the broader platform specified in the project's `Product_Spec.md`.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS**
- **Supabase** (waitlist storage)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# then add your Supabase anon/public key (Supabase -> Project Settings -> API)

# 3. Apply the database schema with the Supabase CLI (see below)

# 4. Run the dev server
npm run dev
# open http://localhost:3000
```

## Database (Supabase CLI)

Project ref: `qerbvrenpdmoegebkdki`

```bash
# Install the CLI (macOS)
brew install supabase/tap/supabase

# One-time: create supabase/config.toml (keeps existing migrations)
supabase init

# Authenticate and link to the cohortbuy project
supabase login
supabase link --project-ref qerbvrenpdmoegebkdki

# Push migrations to the hosted database
supabase db push
```

Add a new migration later with `supabase migration new <name>`, edit the
generated SQL file in `supabase/migrations/`, then `supabase db push` again.
To work fully locally, `supabase start` spins up a local stack (requires Docker).

The waitlist form degrades gracefully: with no Supabase key set it still shows a
success state (handy for local UI work) but won't persist signups until the key
and table are in place.

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (already set to the cohortbuy project in `.env.example`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anon/public API key from Supabase. |

For **all integrations and keys** (Supabase, AI models, Resend, Twilio, Google Drive, deploy), see **`SETUP.md`**.

## Images

The hero uses Next.js `<Image>`. To use your own photo:

- **Local file (simplest):** replace `public/hero.jpg` with your image (keep the
  name), or add a new file and set `HERO_PHOTO` at the top of `src/app/page.tsx`
  to `"/your-file.jpg"`.
- **Hosted URL:** set `HERO_PHOTO` to an Unsplash/Pexels link. Those hosts are
  allowed in `next.config.mjs` (restart the dev server after changing that file).

`public/hero.jpg` ships as a branded placeholder — swap it for a real photo.
Free, license-friendly sources: [Unsplash](https://unsplash.com),
[Pexels](https://pexels.com). Avoid generic stock; lean authentic (real homes,
real neighbors).

## Deploy

Deploys cleanly to Vercel: import the repo, add the two env vars, and ship.

## Project structure

```
src/
  app/
    layout.tsx       # metadata + root layout
    page.tsx         # the landing page
    globals.css      # Tailwind + fonts
  components/
    WaitlistForm.tsx # Supabase-backed signup
  lib/
    supabaseClient.ts
supabase/
  migrations/        # SQL migrations (waitlist table + RLS)
```

---

CohortBuy is a facilitator — it is not a party to members' contracts and never
holds members' funds. See `../Legal_Terms_and_Liability_Notes.md`.
