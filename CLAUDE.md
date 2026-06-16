# CohortBuy — Engineering & UI Standards

Instructions for anyone (human or AI) working in this repo. Follow them by default; deviate only with a clear reason.

## What this is

CohortBuy lets neighbors pool demand on home projects. An AI agent forms the cohort, scopes the work, gathers quotes, and helps split the cost. The platform is a **facilitator, not a principal**: it never holds members' funds and is never a party to the member↔vendor contract. The agent **drives, humans approve** at every consequential step. Full product spec: `../Product_Spec.md`.

## Stack

- **Next.js 14** (App Router, TypeScript), **React 18**
- **Tailwind CSS** (token-based, see below)
- **Supabase** (Postgres, Auth, RLS) — see `supabase/` and use the CLI for migrations
- Server Components by default; add `"use client"` only when a component needs state/effects/events.

## Modular architecture — write once, expose many ways

Business logic lives in **one place** and is reused by every entry point — the web UI, REST API routes, the AI agent (tool-calling), and a future MCP server. Add a capability once; it's available everywhere. This is what makes "enhance the agent / build an API / add an MCP server" easy later.

Layers live in `src/core/`; each depends only on the layer below:

| Layer | Folder | Responsibility | Must NOT |
|---|---|---|---|
| Domain | `core/domain/` | Entities + **Zod schemas** (single source of truth). Reused for API validation and tool input schemas (Zod → JSON Schema). | contain logic or DB calls |
| Repositories | `core/repositories/` | Data access only (Supabase queries). | contain business rules |
| Services | `core/services/` | Business logic as `(ctx, input) => Result<T>`. The reusable unit. | import `next/*` or React |
| Tools | `core/tools/` | Thin wrappers exposing services as named, schema'd tools in a **registry**. | contain logic |
| Shared | `core/context.ts`, `core/result.ts` | `Ctx` (db + actor) and `Result<T>` for uniform errors. | — |

Entry points are thin adapters that call services/tools:
- **Web UI** → `fetch('/api/...')`
- **REST** → `app/api/**/route.ts` → service
- **AI agent** → tool registry → service
- **MCP server** (future) → same tool registry → service

Rules:
- Business logic only in `services/`. DB access only in `repositories/`. Never in components, routes, or tools.
- Define each input/output shape **once** in `domain/` with Zod; reuse for validation AND tool schemas.
- Services receive a `Ctx` (db client, actor/role) — never read env or build clients inside a service (keeps them testable and reusable from any entry point).
- Keep `core/` free of framework code so the agent and MCP can import it directly.

**Reference slice — the waitlist (mirror this shape for every capability):**
`domain/waitlist.ts` → `repositories/waitlistRepo.ts` → `services/waitlistService.ts`, exposed via `tools/waitlistTools.ts` (in `tools/registry.ts`) **and** `app/api/waitlist/route.ts`, and called from the UI form. One service, four reuse paths.

## Design system (read before touching UI)

### Colors — never hard-code
All colors are **semantic tokens** defined as CSS variables in `src/app/globals.css` (light in `:root`, dark in `.dark`) and exposed as Tailwind classes in `tailwind.config.ts`. **Never write hex colors or fixed Tailwind colors (e.g. `bg-white`, `text-gray-700`) in components.** Use:

| Token | Use for |
|---|---|
| `bg-background` | page background |
| `bg-surface`, `bg-surface-2` | cards / raised surfaces / subtle fills |
| `border-border` | all borders & dividers |
| `text-text` | primary text |
| `text-muted` | secondary text |
| `text-subtle` | tertiary / hints |
| `bg-primary` `text-primary-foreground` `hover:bg-primary-hover` | primary actions |
| `text-primary` | primary-colored text/links |
| `bg-accent` / `text-accent` | accent highlights (clay) |
| `text-highlight` | sun/gold highlight |
| `ring-ring` | focus rings |

Alpha works on tokens (`text-text/70`, `bg-primary/20`).

**Brand colors** (`brand-forest`, `brand-cream`, `brand-clay`, `brand-sun`, `brand-ink`, `brand-forest-dark`) are fixed and **only** for intentional brand marks (the logo, a deliberate brand panel like the CTA block). Never use them for normal text/surfaces — they don't adapt to dark mode.

### Dark / light mode
- Theme is a `dark` class on `<html>`. Toggle via `src/components/ThemeToggle.tsx`; the no-flash script in `layout.tsx` sets it before paint from `localStorage('theme')`, defaulting to system preference.
- Anything you build must look correct in **both** themes. If you used tokens, it will. Test both.

### Typography
- Display/headings: `font-display` (Fraunces). Body/UI: `font-sans` (Inter). Don't introduce other fonts.

### Components — reuse the primitives
Use the shared primitives in `src/components/ui/` instead of re-styling raw elements:
- `Button` — variants `primary | secondary | ghost`, sizes `md | lg`.
- `Input` — token-styled text input.
- `Checkbox` — token-styled checkbox with optional label.

Add new shared primitives here (Select, Textarea, Card, Badge, Toggle, Modal…) rather than one-off styling. Keep them token-based and theme-aware.

## Mobile-first, app-like, touch-friendly (required)

This must feel like an app on a phone and be trivial to wrap as a native app later.
- **Design mobile-first**; layer larger layouts with `sm: md: lg:`.
- **Touch targets ≥ 44×44px.** Use `min-h-touch` / `min-w-touch` (primitives already do).
- Generous spacing/tap areas; avoid hover-only affordances (provide visible state).
- Respect safe areas where relevant; avoid fixed elements that fight mobile keyboards.
- Keep the conversational/agent surface central; screens are supporting views.
- PWA-friendly: keep it installable-ready (manifest + theme-color already partially set via `viewport.themeColor`).

## Accessibility
- Every interactive element is keyboard-reachable with a visible `focus-visible:ring-ring` ring.
- Icons that act as buttons need `aria-label`. Inputs need labels (`aria-label` or `<label>`).
- Maintain AA contrast in both themes (tokens are tuned for this — don't override with low-contrast colors).

## User profiles (standard system)
- Backed by **Supabase Auth** + a `profiles` table. Auth methods: email magic-link / OAuth (configure in Supabase).
- Profile fields: `display_name`, `handle` (see below), `avatar_url`, contact, `notification_prefs`, `country`, platform `role` (`member | staff | admin`).
- Per-project roles (Coordinator/Treasurer/Participant/etc.) live on `request_members`, separate from the platform role. Enforce permissions with **RLS**.

## Cohort handles (vanity URLs)
- Every cohort gets a public handle: `cohortbuy.com/<handle>` (e.g. `cohortbuy.com/Minkhoa`), surfaced after login for easy sharing/return.
- Handles are **unique, case-insensitive, slugified** (`[a-z0-9-]`, 3–30 chars), default-generated from the cohort name and editable once-ish.
- **Reserve** system words (`admin`, `api`, `app`, `login`, `signup`, `settings`, `about`, `help`, `dashboard`, etc.).
- Route: `app/[handle]/page.tsx` resolves the cohort; keep it below static routes and validate against reserved words.

## Admin (platform operator)
- `app/admin/**`, gated to `role in (staff, admin)` via Supabase Auth + RLS (never client-only checks).
- Capabilities: view/manage cohorts & groups, members, vendors, experts; monitor lifecycle state; handle disputes; impersonate-for-support (audited); feature flags / category packs. Every admin action writes to `audit_log`.

## Internationalization, country, currency, dates
- **Language: English only** for now, but don't hard-block i18n (keep user-facing strings ready to extract; avoid concatenated sentences).
- **Country** is a first-class field on profiles/cohorts. Default `US`. It drives **currency** and **date/number formatting**.
- Money: store as **integer minor units + ISO currency code** (never floats). Format with `Intl.NumberFormat`.
- Dates/numbers: format with `Intl.DateTimeFormat` / `Intl.NumberFormat` using the user's country/locale. Store timestamps in UTC.

## Notifications
- **Multi-channel** via the `NotificationChannel` adapter (`core/notifications/`): SMS / WhatsApp / email, console now → providers later. Each user has a `preferred_channel`; action-due alerts default to SMS.
- **Consent is mandatory.** Never send SMS/WhatsApp without `sms_opt_in`. The service enforces this and falls back to email / in-app. Record `sms_opt_in_at`.
- Capability services call `notifyActionDue(ctx, { userId, event, message, link })` at **every approval gate** (a notification fires on each action-due event). All sends are logged to `notifications`.
- Honor STOP/HELP and (later) quiet hours; phone numbers are PII — handle per the privacy policy.

## AI configuration & memory
- **Model selection:** call `resolveModel(ctx, { cohortId })` before each agent run. Resolution order: **per-cohort override → global default → fallback**. Admins set these via `setCohortModel` / `setGlobalModel` (gated by `isStaff(ctx)` — never client-only). Tables: `ai_settings` (global), `cohort_ai_settings` (override). Keep model IDs as `{ provider, model }` strings so we stay provider-agnostic.
- **Scoped memory:** store agent memory at **cohort** and **work-item** scope. `recordMemory` saves salient facts; `recallMemory(cohortId, workItemId?)` returns work-item + cohort memory to load into context. Table: `agent_memory` (add pgvector embeddings later for semantic recall). Don't dump raw transcripts — record durable, useful facts.
- **Admin gating pattern:** any operator-only mutation (`set_*`, boosting, etc.) checks `isStaff(ctx)` inside the service. Entry points never decide authorization alone.

## In-app tokens (Web2)
- Internal points ledger in `core/tokens/` — **non-cash, never redeemable or tradeable**. Spend only on in-app perks/status. Don't add cash-out/transfer without counsel (money-transmitter/stored-value risk).
- Append-only: all changes go through the atomic `apply_token_tx` RPC (via `tokenRepo.applyTx`) — never update `token_accounts.balance` directly. Earn via system rules (`awardForEvent`) + admin grants (`adminGrant`, `isStaff`-gated); spend via `spendTokens` (overspend blocked in the DB function).

## Keeping docs current (do this with EVERY feature)

A feature isn't "done" until all three are updated — treat this as part of the definition of done:

1. **`CHANGELOG.md`** — add an entry under `[Unreleased]` (Keep a Changelog format: Added / Changed / Fixed / Removed). One concise line per change.
2. **The plan — `../Product_Spec.md`** — reflect the feature (update the relevant capability/convention text **and** add a dated Changelog line) so the spec stays the single source of truth.
3. **`TESTING_PLAN.md`** — add/append test cases for the feature: happy path, input validation, auth/consent/permissions, and edge cases, each with a type (unit/integration/e2e/manual) and status.

Keep commits and these docs in step — ideally update them in the same commit as the code.

## Conventions
- Keep it **seamless** — match the existing warm, calm visual language; don't introduce competing styles.
- TypeScript everywhere; prefer Server Components; colocate components under `src/components`.
- Small, focused commits with clear messages.
- When you add a screen, verify it in **both themes** and at **mobile + desktop** widths.
