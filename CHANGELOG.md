# Changelog

All notable changes to CohortBuy. Format follows [Keep a Changelog](https://keepachangelog.com/).
Update the `[Unreleased]` section with **every** feature (see `CLAUDE.md` → "Keeping docs current").

## [Unreleased]

### Added
- **Landing page** — Next.js 14 (App Router, TS) + Tailwind; hero, chat mockup, how-it-works, waitlist.
- **Waitlist** — Supabase-backed signup; reused across UI form, `/api/waitlist` route, and `join_waitlist` tool.
- **Supabase CLI migrations** — schema managed as migrations under `supabase/migrations/`.
- **Hero image slot** — Next/Image with swappable local/remote photo.
- **Design system** — semantic light/dark tokens, `darkMode: class`, no-flash theme script, mobile theme-color; UI primitives (`Button`, `Input`, `Checkbox`); `ThemeToggle`; 44px touch targets.
- **Modular core architecture** — `src/core/` layered as domain (Zod) → repositories → services → tools registry, with shared `Ctx`/`Result`. Entry points (UI, API, agent, MCP) reuse the same services.
- **Notifications** — multi-channel `NotificationChannel` adapter (console now → providers later); consent-aware `notifyActionDue`; `profiles` + `notifications` tables.
- **AI configuration** — per-cohort model override + global default (`resolveModel`, admin-gated set); `ai_settings` / `cohort_ai_settings`.
- **Agent memory** — cohort- and work-item-scoped memory (`recordMemory` / `recallMemory`); `agent_memory` table.
- **In-app tokens (Web2)** — non-cash points ledger (`token_accounts` / `token_transactions` + atomic `apply_token_tx` RPC); earn rules, admin grant, spend (overspend-blocked), balance + status tier.
- **App shell + profile management** — sticky top nav (logo, Cohorts, theme toggle) with a **profile dropdown menu** (account, edit profile, sign out) across signed-in pages; editable **`/account/profile`** page; shared sign-out action.
- **Cohorts + membership** — public/private cohorts with vanity handles; request → manager **approve / reject / ask-info** flow; cohort-keyed RLS via `SECURITY DEFINER` helpers (`auth_cohort_ids`, `auth_is_cohort_manager`) + `create_cohort` RPC. UI: `/cohorts` (search public + my cohorts), `/cohorts/new`, `/[handle]` (request to join + manager review). Tools: create/request/review/search.
- **Auth + profiles + onboarding** — Supabase Auth (magic link) via `@supabase/ssr` (server/browser clients + session middleware); `/login`, `/auth/callback`, `/onboarding` (captures name, phone, SMS opt-in, preferred channel, country), `/account` (profile + token balance/tier + sign out). Profile auto-created on signup (trigger); self-access RLS on profiles/tokens/notifications.
- **Docs** — `CHANGELOG.md`, `TESTING_PLAN.md`, and `SETUP.md` (integration/setup guide for Supabase, AI, Resend, Twilio, Google, etc.); expanded `.env.example`.

### Notes
- Dependencies added: `zod`, `@supabase/ssr` (run `npm install`).
- Migrations to apply via `supabase db push`: waitlist, profiles+notifications, ai_config+memory, tokens.

<!-- On release, move [Unreleased] items under a versioned heading, e.g. ## [0.1.0] - YYYY-MM-DD -->
