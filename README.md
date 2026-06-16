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

# 3. Create the waitlist table
# Paste supabase/schema.sql into the Supabase SQL editor and run it.

# 4. Run the dev server
npm run dev
# open http://localhost:3000
```

The waitlist form degrades gracefully: with no Supabase key set it still shows a
success state (handy for local UI work) but won't persist signups until the key
and table are in place.

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (already set to the cohortbuy project in `.env.example`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anon/public API key from Supabase. |

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
  schema.sql         # waitlist table + RLS policy
```

---

CohortBuy is a facilitator — it is not a party to members' contracts and never
holds members' funds. See `../Legal_Terms_and_Liability_Notes.md`.
