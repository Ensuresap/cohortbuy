# CohortBuy — Testing Plan

> **Living document.** Update with **every** feature (see `CLAUDE.md` → "Keeping docs current").
> Each capability lists test cases with **type** (unit / integration / e2e / manual) and **status** (☐ planned · ◐ manual · ☑ automated).

## Test approach

- **Unit** — pure functions & service logic (Zod validation, token math, status tiers). Recommended: **Vitest**.
- **Integration** — services against a Supabase test DB / API routes. Recommended: Vitest + a seeded test project (or `supabase start`).
- **E2E** — user flows in the browser. Recommended: **Playwright**.
- **Manual** — visual/responsive/theme checks until automated.

> Harness not yet wired (no test deps installed). Cases below are mostly ☐/◐ until Vitest + Playwright are added — see "Next" at the bottom.

## Conventions

- Every service path returns a `Result`; tests assert both `ok` and `error.code`.
- Test the **invalid input**, **unauthorized**, and **edge** cases, not just the happy path.
- Money/consent/permission logic must have explicit negative tests.

---

## Design system & theming
- ☐ (unit) tokens resolve: no hard-coded hex/`bg-white` in `src/**` (lint/grep guard).
- ◐ (manual) Light and dark both render correctly across all sections.
- ◐ (manual) No theme flash on load (no-flash script).
- ◐ (manual) Touch targets ≥ 44px on primitives; layout works at 360px width.
- ◐ (manual) Keyboard focus rings visible on Button/Input/Checkbox/ThemeToggle.

## Waitlist (reference slice)
- ☐ (unit) `joinWaitlist` rejects invalid email → `invalid_input`.
- ☐ (unit) returns `not_configured` when no DB.
- ☐ (integration) inserts a row; duplicate email is treated as success (23505).
- ☐ (integration) `POST /api/waitlist` → 400 invalid, 503 not configured, 200 success.
- ◐ (manual) Form shows success and graceful dev message without Supabase key.

## Notifications
- ☐ (unit) `notifyActionDue` rejects invalid input.
- ☐ (integration) SMS skipped when `sms_opt_in = false`; falls back to email if present.
- ☐ (integration) preferred channel honored; status logged (`sent`/`skipped`) to `notifications`.
- ☐ (unit) consent rule: never dispatch SMS/WhatsApp without opt-in (negative test).

## AI configuration
- ☐ (unit) `resolveModel` order: cohort override → global default → `DEFAULT_MODEL`.
- ☐ (unit) `setCohortModel` / `setGlobalModel` → `forbidden` when not staff/admin.
- ☐ (integration) override persists and is returned by `resolveModel`.

## Agent memory
- ☐ (unit) work-scoped record requires `workItemId` (Zod refine).
- ☐ (integration) `recallMemory(cohortId, workItemId)` returns that work item's + cohort-level memory.
- ☐ (integration) ordering is most-recent-first; `limit` respected.

## In-app tokens (Web2)
- ☐ (unit) `statusTier` thresholds (0→Newcomer, 100→Neighbor, 500→Connector, 1500→Pillar).
- ☐ (unit) `grant_tokens` → `forbidden` when not staff/admin.
- ☐ (integration) `awardForEvent` adds the rule amount; updates `balance` + `lifetime_earned`.
- ☐ (integration) **overspend blocked**: `spendTokens` beyond balance → `insufficient_tokens`, no ledger row committed (atomic RPC).
- ☐ (integration) ledger ↔ balance consistency after mixed earn/spend.
- ☐ (unit) tokens are non-cash: no service path converts tokens to money/transfers (guard test).

## Auth, profiles & onboarding
- ☐ (unit) `OnboardingInput` requires `phone` when `smsOptIn` is true (Zod refine).
- ☐ (unit) `completeOnboarding` → `unauthenticated` with no actor.
- ☐ (integration) magic-link sign-in creates a profile shell (trigger) with email.
- ☐ (integration) onboarding upsert sets `sms_opt_in_at` only when opted in.
- ☐ (integration) RLS: a user can read only their own profile/tokens/notifications.
- ◐ (e2e) login → email link → onboarding → account; account shows tokens + tier.
- ◐ (e2e) unauthenticated `/account` and `/onboarding` redirect to `/login`.

## Cohorts & membership
- ☐ (unit) `CreateCohortInput` handle regex (3–30, `[a-z0-9-]`); reserved handles rejected.
- ☐ (integration) `create_cohort` makes the creator an approved **manager**.
- ☐ (integration) duplicate handle → `handle_taken`.
- ☐ (integration) request to join inserts a `requested` member row; duplicate → `already_requested`.
- ☐ (integration) RLS: a user **cannot** self-update their `status`/`access_level` (no escalation); only managers can via `reviewJoinRequest`.
- ☐ (integration) non-manager `reviewJoinRequest` → `forbidden` (RLS returns no rows).
- ☐ (integration) RLS: public cohorts visible to all authed; private only to members/managers.
- ◐ (e2e) create cohort → appears under "your cohorts" as manager; second user requests → manager approves → second user shows approved.

## Service requests (projects)
- ☐ (unit) `CreateRequestInput` validates title length; `minSize` default 2.
- ☐ (integration) `create_service_request` by a non-member → `not_a_member`/`forbidden`.
- ☐ (integration) creator is added as `coordinator` participant.
- ☐ (integration) join inserts a `participant`; duplicate → `already_joined`.
- ☐ (integration) RLS: requests visible only to approved members of the cohort (and managers).
- ◐ (e2e) approved member creates a project → appears in cohort list → opens `/requests/[id]` with stage bar; a second member joins.

## Scope & stage transitions
- ☐ (unit) `AddScopeInput` requires non-empty description.
- ☐ (integration) a member can add scope; RLS: only approved cohort members; authors edit/delete own.
- ☐ (integration) `advanceStatus` by a non-coordinator/non-manager → `forbidden` (RLS no rows).
- ☐ (integration) `advanceStatus` rejects an invalid status value (Zod enum).
- ◐ (e2e) coordinator advances forming → scoping; member adds a scope item; it appears for all members.

## Cross-cutting
- ☐ (unit) architecture guard: no `.from(`/`.rpc(` outside `repositories/` (grep test in CI).
- ☐ (integration) admin-only services all enforce `isStaff` (table-driven negative tests).

---

## Next (to make this real)
1. Add **Vitest** + a couple of pure unit tests (token `statusTier`, `resolveModel` order) to seed the harness.
2. Add a Supabase **test project**/local stack for integration tests of services & migrations.
3. Add **Playwright** for the waitlist e2e and theme toggle.
4. Wire the architecture grep guards into CI.
