# Cohorts Lifecycle Review — Current-State Assessment

**Updated:** 2026-06-21 (supersedes the earlier gap-analysis draft, which predated the
research, vendor, voting, nudge, and advisor modules now in the codebase).

**What this is:** A grounded review of how far the cohortbuy build has come against the
project's lifecycle, organized by the six public stages shown on the landing page
(**Spark → Group → Scope → RFQ → Decide → Deliver**) and the nine internal request
statuses they map to. Ratings reflect what is actually wired in the code, verified
against `src/core/**` and `src/app/**`.

**Scope reviewed (current code):**
- `src/app/requests/[id]/page.tsx` — the project page where the lifecycle plays out (~1,580 lines, stage-aware)
- `src/app/requests/actions.ts` — server actions (vote, research, benchmark, RFQ draft, split, terms, complete)
- `src/core/requests/*` (incl. `domain/lifecycle.ts`), `src/core/scope/*`, `src/core/quotes/*`, `src/core/research/*`, `src/core/vendors/*`
- `src/core/advisor/*`, `src/core/tools/*`, `src/app/api/{chat,advisor}/route.ts`

**Model recap:** A **Cohort** = the community/group. A **Request** (Service Request) = a
**project**, carrying the state machine
`forming → scoping → research → rfq → deciding → contracting → funding → in_progress → completed`
(`src/core/requests/domain/lifecycle.ts`). Group-buy projects run a shorter track
(`forming → research → funding → in_progress → completed`). The cohorts page is the front
door; the lifecycle itself runs on the request page.

---

## Headline

The **full lifecycle skeleton is present and traversable** — a project can move from
`forming` to `completed` with real, working tools at each step. This is well past
scaffolding. Depth varies by stage, putting the build at roughly **60% of the envisioned
spec**.

The honest distance between the landing tagline ("the agent **runs** the whole project")
and reality is the word *runs*: the advisor reliably **drafts** a project at Spark and the
tool layer exists (~20 tools in `core/tools/registry.ts`), but stages 3–6 are mostly
**screen-driven** — nothing yet orchestrates the agent to advance the lifecycle on its own.

Two deliberate divergences from the original plan still shape everything below:
- **Facilitator, not principal.** Funds settle off-platform; the app *tracks* payment
  rather than holding it (no Stripe/escrow). This is intentional (see `CLAUDE.md`).
- **Screen-first, agent-assisting.** There *is* a conversational surface now (advisor
  chat + `api/chat`), but the web screens, not the agent, drive the middle stages.

---

## Stage-by-stage

### 01 · Spark — name a need, agent drafts the project  🟢 Mostly there
**Built:** `advisorService.advise` runs a conversation turn and emits a structured
`ProjectProfileProposal` (the handoff into project setup); `api/advisor` + `api/chat`
routes and the `[handle]/advisor` page are wired; a manual create-project flow exists too.
**Gaps:** the agent proposes, but a human still confirms and completes setup via screens;
the proposal isn't yet auto-instantiated into a live request.

### 02 · Group — invites go out, a quorum forms, the cohort launches  🟡 Partial
**Built:** join request → manager review (approve / reject / **needs more info**), optional
join questions, public/private visibility, discovery search, and `minSize` captured at
creation.
**Gaps:** `minSize` is recorded but **not enforced** — no automatic go/no-go when the
threshold is hit or a deadline passes (there is no deadline field); **no community
verification** (address match, invite-to-community binding, HOA roster, geofence); no
"requests seeking participants" recruitment feed.

### 03 · Scope — shared specs, one source of truth  🟡 Partial
**Built:** per-participant scope items (`description`, `quantity`, `notes`) via a form, plus
an `addScopeItem` agent tool. Per-member variation is captured in raw form.
**Gaps:** no agent-led structured intake (it's free-text); no consolidated, **versioned
SOW** and no per-member "confirm my portion" step (which fair splitting later depends on);
no photo/measurement capture; no scope-change-after-formation re-confirm flow.

### 04 · RFQ — vendors sourced, quoted, compared  🟡 Solid-ish
**Built:** a real `research` stage now exists — vendor registry + candidate list
(`core/vendors`, `core/research`), **shortlist approval** (`approveShortlistAction`),
**AI benchmark estimate** (`aiEstimateBenchmarkAction`, stored as
`benchmark_low/high_cents`), and an **AI-drafted RFQ** (`aiDraftRfqAction` +
`RfqDraftEditor`). Quotes are recorded with comparable fields
(`vendor_name`, `amount`, `timeline`, `warranty`, `kind: indicative|final`) and shown
side by side.
**Gaps:** **outreach is still off-platform** — the RFQ is *drafted* but not *sent*; no
vendor portal or self-serve bid intake; license/insurance verification absent; bid
"normalization" is field display, not analysis.

### 05 · Decide — the cohort votes, consent recorded, never overridden  🟢 Mostly there
**Built:** **structured voting** (`castVote` / `voteTally` / `myVote`, surfaced via
`voteAction` and the vote tally on the page), a per-stage **discussion thread**, coordinator
selection of the winning quote (sets agreed vendor/amount), and an **audit log**
(`core/audit`).
**Gaps:** no agent-generated comparison summary or **risk flags** (only a simple
"best price" min-amount tag); no decision-packet export; no weighted/ranked voting or
quorum/tie-break rules.

### 06 · Deliver — contracts, payment, milestones → sign-off  🟡 Partial
**Built:** project terms (`setProjectTerms`: contract structure + payment mode), a
contract-reference link, **cost-share generation**, a per-member **paid/unpaid tracker**
with a "collected of total" rollup, and a coordinator **completion sign-off**.
**Gaps:** **only the even split is computed** — `generateCostShares` is even-only, even
though `split_method` already enumerates `even | by_quantity | by_usage | custom` and the
per-member `quantity` needed for a by-usage split is already captured at Scope. No
milestones, no contract assembly/templates, no e-signature; **no escrow/payment rails**
(deliberate facilitator pivot); no drop-out re-split; no ratings/reviews on completion.

---

## Summary table

| Stage | Rating | Built | Key gaps |
|---|---|---|---|
| 01 Spark | 🟢 Mostly | Advisor proposes structured project; chat routes wired | Human still confirms via screens; proposal not auto-instantiated |
| 02 Group | 🟡 Partial | Join review, questions, visibility, discovery, `minSize` | Auto go/no-go, deadline, community verification, recruitment feed |
| 03 Scope | 🟡 Partial | Per-member scope items + tool | Versioned SOW, per-member confirm, photos, agent intake |
| 04 RFQ | 🟡 Solid-ish | Vendor registry, shortlist, AI benchmark, AI RFQ draft, quote capture | Outreach/sending, vendor portal, verification, normalization |
| 05 Decide | 🟢 Mostly | Structured voting + tally, discussion, selection, audit log | Agent summary/risk flags, decision-packet export, ranked voting |
| 06 Deliver | 🟡 Partial | Terms, contract link, split, paid tracker, sign-off | By-usage/custom split, milestones, e-sign, escrow, ratings |

**Supporting layer (not on the landing lifecycle but built):** tokens (`core/tokens`),
memory (`core/memory`), nudges (`nudge` migrations + notification tools), per-cohort AI
config (`core/ai`), admin surfaces, and guides.

---

## Biggest remaining gaps, cheapest-first

1. **By-usage split** — the per-member `quantity` data already exists; only the even-only
   `generateCostShares` needs a weighted path. Highest value for the least effort.
2. **Agent orchestration mid-lifecycle** — the ~20 tools exist; wire the advisor to
   *advance stages* (scope → research → rfq → decide), not just propose at Spark. This is
   what turns "the agent assists" into "the agent runs it."
3. **Vendor outreach** — the RFQ is already drafted; add a send/track path so quotes come
   back through the system instead of being transcribed.
4. **Formation automation** — quorum go/no-go + a join deadline + basic community
   verification, so `forming` advances without a manual coordinator nudge.
5. **Deliver depth** — milestones and (if the facilitator stance allows) light contract
   assembly + completion ratings to feed future shortlists.

## Open questions

- **Escrow vs. facilitator:** confirm the off-platform/never-hold-funds stance is the
  long-term position — it defines the ceiling for Stages 5–6 (§10 legal framing).
- **Where the lifecycle "lives":** the request page is one long stage-aware screen today.
  If the product goes agent-first, much of it becomes conversation + thin confirmation
  screens; if it stays screen-first, the page should foreground the active stage's tools.
