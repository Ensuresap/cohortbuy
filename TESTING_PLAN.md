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

## Discovery & header search
- ☐ (unit) `TagList` slugifies + dedupes + caps at 10; `slugifyTag` strips punctuation/edges; non-array → `[]`.
- ☐ (integration) `create_cohort` persists `p_tags`; `discover_cohorts(p_tag)` returns only cohorts carrying that tag.
- ☐ (integration) `tag_catalog` RLS: any authed user can read; only staff can write.
- ◐ (manual) TagPicker on create + edit: common chips add, custom tag adds on Enter, chips removable; saved tags show on the card.
- ◐ (manual) discover tag-filter chips set `?tag=`, preserve `q`, highlight the active tag, and "All" clears it.
- ☐ (integration) `discover_cohorts(p_filter_country=true)` returns only the viewer-country cohorts; `false` returns all.
- ◐ (manual) discover defaults to viewer country; "Show all locations" toggle (`?loc=all`) reveals other countries and is reversible; toggle preserves `q`/`tag`.
- ◐ (manual) tag filter lists only tags present in current results and collapses with "+ more"/"Show less".
- ◐ (manual) "Near you" badge hidden in country-scoped (default) view, shown in all-locations view.
- ◐ (manual) empty country view shows the "try Show all locations" hint.

## Local discovery by ZIP coverage
- ☐ (unit) `ZipList` keeps only 5-digit ZIPs, dedupes, caps at 50; `SetLocationInput` rejects non-5-digit.
- ☐ (integration) `create_cohort` persists `coverage_zips`/`city`/`region`; `discover_cohorts(p_scope='zip')` returns only cohorts whose `coverage_zips` contain `p_zip`; `covers` true for those.
- ☐ (integration) `setMyLocation` saves `postal_code`/`city` to the caller's profile (own row only, RLS).
- ◐ (manual) create form: add multiple coverage ZIPs as chips (5-digit validation), removable; saved to the cohort.
- ◐ (manual) discovery: setting ZIP shows "Cohorts serving <zip>"; only covering cohorts appear; "Show all locations" reveals the rest and flags local ones with "Serves your area".
- ◐ (manual) no-ZIP viewer sees the "set your ZIP" prompt and falls back to country scope.
- ☐ (unit) `CreateCohortInput.kind` defaults to `service`; rejects values outside `service|group_buy`.
- ☐ (integration) `create_cohort` persists `p_kind`; `discover_cohorts` returns `kind`.
- ◐ (manual) discover page shows separate **Services** and **Group buys** sections; empty section is omitted; each card shows its type label.
- ☐ (integration) `discover_cohorts` returns only **public** cohorts; private excluded.
- ☐ (integration) aggregates correct: `member_count` = approved members; `value_cents` = sum of non-null `agreed_amount_cents`; `project_count` = all requests.
- ☐ (integration) `is_near` true iff `cohort.country = p_country`; ordering puts near-you rows first, then by members → value → recency.
- ☐ (integration) RPC exposes counts/sums only — **no member identities** leak to non-members.
- ☐ (unit) `DiscoverCohortsInput` clamps `limit` (1–50, default 24); 2-char country.
- ◐ (manual) "Near you" section appears only when the viewer's country has public cohorts; otherwise only "Popular".
- ◐ (manual) card metrics format compactly (e.g. 1.2k members, $12k coordinated); zero-value/zero-project stats are hidden, members always shown.
- ◐ (e2e) header search submits `q` to `/cohorts`; results filter by name (case-insensitive `ilike`) and render as a single "Results" grid (no near/popular split).
- ◐ (e2e) empty/whitespace query returns the default public list (no error).
- ◐ (manual) header search works with JS disabled (plain GET form).
- ◐ (manual) header reflows at 360px: logo collapses to the mark, search stays usable, theme + profile pinned right; search input ≥ 44px tall.
- ◐ (manual) `CohortCard` renders cover image when present, falls back to the brand gradient + initials avatar otherwise; category badge hidden when null; description clamps to 2 lines.
- ◐ (manual) discover grid is 1 col (mobile) → 2 (sm) → 3 (lg); cards correct in light **and** dark.
- ◐ (e2e) clicking a card navigates to `/<handle>`.

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

## Quotes
- ☐ (unit) `AddQuoteInput` coerces amount; rejects negative; currency length 3.
- ☐ (unit) amount → `amount_cents` rounding (e.g. 1234.5 → 123450).
- ☐ (integration) RLS: quotes visible/insertable only within the request's cohort.
- ◐ (manual) comparison sorts by price ascending; currency formats per code.

## Procurement lifecycle (decision → contract → cost-share → deliver)
- ☐ (integration) `select_quote` sets one quote `selected`, others `rejected`, records agreed amount/vendor; non-coordinator → `not_coordinator`.
- ☐ (integration) `generate_cost_shares` even-splits agreed amount across joined participants; remainder cents to coordinator; sum equals agreed amount.
- ☐ (integration) `set_share_paid` allowed for coordinator or the share's own member only.
- ☐ (integration) `complete_project` sets status=completed + note/date; coordinator-gated.
- ☐ (integration) RLS: `cost_shares` readable by request's cohort members; writes only via SECURITY DEFINER fns.
- ◐ (manual) selecting a quote highlights it "Selected"; Decision & contract shows agreed vendor/amount + Drive link; facilitator disclaimer present.
- ◐ (manual) cost-share list shows per-member amounts, paid toggle, collected/agreed total; SafetyNote + off-platform note present.
- ◐ (e2e) full path: forming → select quote → record contract → generate split → mark paid → complete → Completed banner.

## Project detail page
- ☐ (unit) `AddCommentInput` requires non-empty body ≤ 2000 chars.
- ☐ (integration) RLS: `request_comments` readable by the request's cohort members; insert only own row as approved member.
- ☐ (integration) `request_comments_feed` returns author name/avatar for each comment.
- ◐ (manual) sections render: About + "Why now — the driver", Scope, Vendors & quotes (lowest flagged "Best price", vendor count), Discussion thread, Details/Participants rail.
- ◐ (manual) driver entered in Add-project form persists and shows under "Why now".
- ◐ (e2e) member posts a comment → appears in Discussion with their name/avatar and relative time.

## Dashboard
- ☐ (integration) `listMyProjects` returns only projects the user participates in, with cohort + stage.
- ☐ (integration) join-approval writes a notification row for the approved user (service-role).
- ◐ (manual) progress bar reflects pipeline position; empty states render when no projects/activity.
- ◐ (e2e) login → /dashboard; active project shows with correct stage.

## Cohort profile & directory
- ☐ (integration) `cohort_member_directory` returns rows only to approved members of that cohort.
- ☐ (integration) `set_cohort_comanager` → forbidden unless caller is the owner; `set_member_title` → forbidden unless manager.
- ☐ (integration) `updateCohortProfile` → forbidden for non-managers (RLS no rows).
- ◐ (manual) online dot reflects last_seen < 5 min; member-since + Est. year render; owner/co-admin/member badges correct.

## Cohort posts (feed)
- ☐ (integration) only managers/co-admins can insert posts (RLS); members read.
- ☐ (integration) `cohort_posts_feed` returns posts to members + (for public cohorts) any authed user, with author name/avatar.
- ◐ (manual) composer shows only for managers; feed renders body + optional image; timeAgo formats.

## Cross-cutting
- ☐ (unit) architecture guard: no `.from(`/`.rpc(` outside `repositories/` (grep test in CI).
- ☐ (integration) admin-only services all enforce `isStaff` (table-driven negative tests).

---

## Next (to make this real)
1. Add **Vitest** + a couple of pure unit tests (token `statusTier`, `resolveModel` order) to seed the harness.
2. Add a Supabase **test project**/local stack for integration tests of services & migrations.
3. Add **Playwright** for the waitlist e2e and theme toggle.
4. Wire the architecture grep guards into CI.
