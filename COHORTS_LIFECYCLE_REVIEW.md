# Cohorts Page Review — Lifecycle Gap Analysis

**What this is:** A review of the current cohorts experience against the original *Together* build plan, organized by the plan's **eight lifecycle stages**. Focus is on **gaps** — what the plan envisions that the code doesn't yet do.

**Scope reviewed (current code):**
- `src/app/cohorts/page.tsx` — cohorts index (your cohorts + public discovery)
- `src/app/[handle]/page.tsx` — cohort home (identity, projects, feed, members, manage)
- `src/app/requests/[id]/page.tsx` — project / Service Request page (the lifecycle lives here)
- `src/core/cohorts/*`, `src/core/requests/*`, `src/core/scope/*`, `src/core/quotes/*`

**How the model maps to the plan:** A **Cohort** = the plan's *community / group*. A **Request** (Service Request) = the plan's *project*, which carries the eight-stage state machine: `forming → scoping → research → rfq → deciding → contracting → funding → in_progress → completed`. So the cohorts page is the *front door*; the lifecycle itself plays out on the request page.

---

## Cross-cutting divergence to flag first

Before the stage-by-stage gaps, one deliberate divergence shapes everything below:

**The plan is agent-first and escrow-based. The current build is screen-first and facilitator-only.**

- The plan's premise (§4) is that the **primary interface is a conversation on WhatsApp**, with the web app as a supporting surface. The current product is entirely web-screen driven — there is no conversational/agent surface, no WhatsApp, no rich-message flow. (The core *scaffolding* exists — `core/tools/registry.ts`, `core/ai`, `core/memory` — but nothing drives a conversation yet.)
- The plan's trust model (§5.8, §10) is **Stripe Connect escrow** — funds pooled, held, milestone-released, never touched by a neighbor. The current build has deliberately pivoted to **"facilitator, never holds funds"** (see `CLAUDE.md` and the disclaimers on the request page): payments settle off-platform and the app only *tracks* who paid.

These aren't bugs — they're scope decisions — but they cascade into the per-stage gaps, so they're called out where relevant rather than repeated.

---

## Stage 1 — Onboard & form group

**Plan wants:** recruit interested members, **verify they belong to the community** (address match, invite, HOA roster, geofence), set **min/max** group size and a **join deadline**, with automatic **go/no-go** once the threshold is met or missed.

**What exists:**
- Cohort join flow: request → manager review (approve / reject / **needs more info**), optional **join questions**, public/private visibility, discovery search. This is a solid community-formation layer.
- Project formation: `CreateRequestInput` has a `minSize` (default 2) and a `forming` status; non-participants see "Join this project."

**Gaps:**
- **No community verification.** Join is gated only by a manager's manual approval + free-text questions. No address match, invite-code-to-community binding, HOA roster check, or geofence (§5.1 MVP).
- **No max size and no join deadline.** `minSize` is captured but never enforced; there's no deadline field and no countdown.
- **No automatic go/no-go.** Nothing transitions a request out of `forming` when the threshold is hit or the deadline passes — advancing stages is a fully manual coordinator action.
- **No recruitment surface.** The plan's "open request feed" / "register interest" (§5.2) isn't present; discovery is name-search only, and you can't browse requests *seeking participants*.
- **No identity tiers / KYC** for treasurers or high-value projects (§5.1 Phase 2).

---

## Stage 2 — Define roles

**Plan wants:** appoint **Coordinator, Treasurer, Participants**, or hire a platform **Expert**; permissions follow the role.

**What exists:**
- Cohort-level: Owner / Co-admin / Member, plus free-text **titles** a manager can set (e.g. type "Treasurer").
- Project-level: the domain defines participant roles `coordinator | treasurer | participant`, and the request creator is treated as coordinator.

**Gaps:**
- **No UI to assign project roles.** The `coordinator/treasurer/participant` enum exists in the domain but there's no way to *appoint* a treasurer or reassign a coordinator — coordinator is implicitly "whoever created the request." Treasurer, the role that matters most for money, is effectively unused.
- **Permissions don't follow the project role.** Authorization keys off "is creator" (`isCoordinator = req.created_by === user.id`), not off the assigned role, so a designated treasurer has no special powers.
- **No Expert role at all** (§5.9 is entirely absent) — no way to hire someone to run a stage.
- **Titles are cosmetic.** Cohort titles are display-only strings; they grant nothing.
- **No role reassignment/delegation with audit trail** (§5.14 Phase 2).

---

## Stage 3 — Define scope of work

**Plan wants:** **agent-led structured intake** turning fuzzy intent into a comparable, itemized SOW with **per-member variations**, a **shared versioned SOW document** each member **confirms their portion of**, plus photo/measurement capture.

**What exists:**
- Per-participant scope items (`description`, `quantity`, `notes`) added via a form on the request page. This captures per-member variation in raw form — good foundation.

**Gaps:**
- **No agent-led intake.** Scope is free-text typed into a form; there's no structured interview converting fuzzy intent into normalized line items.
- **No SOW document, no versioning, no per-member confirmation.** Items are just a list; there's no consolidated, versioned SOW and no "review and confirm my portion" step — which the later cost-split depends on for fairness.
- **No photo / measurement capture** (§5.3 Phase 2).
- **No scope-change-after-formation flow** with re-confirmation / re-split (§5.3 Phase 2).

---

## Stage 4 — Market research & benchmarking

**Plan wants (MVP, human-assisted):** **price benchmarks** and typical ranges, **regulatory/permit/licensing notes**, and a **vetted vendor shortlist** with ratings/history; later, material explainers, seasonality, and an up-front **savings-vs-solo estimate**.

**What exists:**
- A `research` stage exists in the pipeline (the progress bar shows it)...

**Gaps:**
- **...but the stage has no content or surface.** There is no research module on the request page — no benchmark ranges, no permit/licensing notes, no vetted-vendor shortlist. The stage is a label only.
- **No savings estimate** shown to motivate formation (§5.4 Phase 2) — notable because it's the core value-prop hook.
- **No vendor directory / vetting data** anywhere to draw a shortlist from (ties to Stage 5 gaps).
- This is the **single largest gap** relative to the plan — an entire MVP module is unimplemented beyond a status label.

---

## Stage 5 — Request vendor quotes (RFQ)

**Plan wants:** a **standardized RFQ generated from the SOW** so all vendors bid on the same thing, **multi-channel outreach**, **structured bid intake**, and **bid normalization** (price/scope/timeline/warranty/terms); later a vendor portal, vendor profiles, clarification threads, and negotiation support.

**What exists:**
- Quotes can be **manually recorded** on the request page (`vendor_name`, `amount`, `currency`, `timeline`, `warranty`, `notes`, `kind: indicative|final`). The captured fields line up well with the plan's comparison axes.

**Gaps:**
- **No RFQ generation.** Nothing turns the SOW into a standardized request — so vendors aren't guaranteed to bid on the same scope, which undercuts comparability.
- **No outreach.** No way to send an RFQ to vendors; quotes are entered by participants by hand (essentially transcribing quotes they got off-platform).
- **No vendor portal, no vendor profiles, no license/insurance/bonding verification** (§5.5 Phase 2) — there is no vendor entity in the system at all, only a free-text vendor name per quote.
- **No clarification threads or negotiation support** (§5.5 Phase 2).
- **No bid normalization** beyond displaying raw fields side by side.

---

## Stage 6 — Assessment & selection

**Plan wants:** **side-by-side comparison** with an **agent-generated summary and risk flags**, **group decision tools** (discussion thread, **structured vote**, or coordinator decision) each with an **audit trail**; later weighted/ranked voting, quorum rules, decision-packet export, tie-break/escalation.

**What exists:**
- Side-by-side quote list with a "Best price" flag on the cheapest, and a per-project **discussion thread** (comments).
- Coordinator selects the winning quote, which sets the agreed vendor/amount.

**Gaps:**
- **Decision is coordinator-only.** There is **no voting** of any kind — no structured vote, no weighted/ranked, no quorum (§5.6 MVP + Phase 2). The plan treats group voting as an MVP decision tool.
- **No agent summary or risk flags.** "Best price" is a simple min-amount tag, not an analysis of scope/warranty/terms trade-offs.
- **No audit trail on the decision** (who decided, when, on what basis) — important given this is a shared-money decision (§5.6, §5.10).
- **No decision-packet export, no tie-break/escalation rules** (§5.6 Phase 2).

---

## Stage 7 — Procurement, contracting & e-signature

**Plan wants:** a contract **assembled from vetted templates** with **per-member line items**, **e-signature** from each participant and the vendor, **milestone definition** (deposit/mid/completion) that drives the payment schedule, plus change orders and a document vault.

**What exists:**
- A coordinator can **record a contract reference** — a URL (e.g. a Drive link to a signed agreement) plus a note. Clear facilitator disclaimer ("the agreement is directly between members and the vendor").

**Gaps:**
- **No contract generation.** No template library, no assembly — the app only stores a link to a document created elsewhere (§5.7 MVP).
- **No per-member line items** in the contract — the per-member scope from Stage 3 isn't carried into a structured agreement.
- **No e-signature.** Signing happens entirely off-platform (§5.7 MVP).
- **No milestone definition.** Milestones (deposit/mid/completion) don't exist, so they can't drive a payment schedule — this also blocks the milestone-release idea in Stage 8.
- **No change orders / addenda, no document vault** (§5.7 Phase 2).

---

## Stage 8 — Cost-sharing, payment & delivery

**Plan wants:** a transparent **split engine** (equal, **by-usage** e.g. linear footage, or **custom**), funds collected **into escrow**, **milestone-based release**, **drop-out handling** (refunds/re-splits/threshold checks), multiple payment methods, a live split calculator, reminders, and completion sign-off + ratings.

**What exists:**
- **Even-split** generation across participants, a per-member **paid/unpaid tracker** with a "collected of total" rollup, and a coordinator **completion sign-off** with a note. Honest disclaimers that money settles off-platform.

**Gaps:**
- **Only equal split.** No **by-usage** split — even though per-member `quantity` is captured in Stage 3 (e.g. fence footage), it isn't used to weight shares. No custom split either (§5.8 MVP/Phase 2).
- **No escrow, no payment rails, no milestone release.** By design (facilitator-only pivot), the app **tracks** payment rather than moving it — this is the biggest divergence from the plan's trust model (§5.8, §10). Stripe Connect, ACH/card, partial payments, pay-over-time are all absent.
- **No drop-out handling.** No refund/re-split/threshold re-check if a member leaves after a split is generated (§5.8 MVP).
- **No live split calculator** for previewing before committing (§5.8 Phase 2).
- **No automated reminders/nudges** for unpaid shares (the plan leans on proactive agent nudges; §5.8/§5.11).
- **No ratings/reviews** on completion (§5.10) — completion is a note only; no vendor/expert rating is captured for future shortlists.

---

## Summary table

| Stage | Built | Partial | Missing (key gaps) |
|---|---|---|---|
| 1. Form group | Join review, questions, visibility | `minSize` captured | Community verification, max size, deadline, auto go/no-go, request feed |
| 2. Roles | Cohort owner/co-admin/member | Title strings; participant role enum | Project role assignment + role-based perms, Expert role |
| 3. Scope | Per-member scope items | Free-text quantity | Agent intake, versioned SOW, per-member confirm, photos |
| 4. Research | — | Status label only | **Entire module** (benchmarks, permits, vendor shortlist, savings estimate) |
| 5. RFQ | Manual quote capture | Comparable fields captured | RFQ generation, outreach, vendor entity/portal, normalization |
| 6. Selection | Side-by-side, discussion, coordinator pick | "Best price" tag | **Voting/quorum**, agent summary, decision audit/export |
| 7. Contracting | Record contract link + note | Facilitator disclaimer | Template generation, line items, e-sign, milestones |
| 8. Payment | Even split, paid tracker, sign-off | "Collected" rollup | By-usage/custom split, escrow/rails, drop-out re-split, ratings |

## The biggest gaps, ranked

1. **No agent / conversational surface** — the plan's defining premise (cross-cutting; scaffolding exists, nothing drives it).
2. **Stage 4 (Market research)** — an entire MVP module is just a status label.
3. **Stage 6 voting** — group decisions are coordinator-only; no voting at all.
4. **Stage 5 RFQ + vendor entity** — quotes are hand-transcribed; vendors aren't modeled.
5. **Stage 8 by-usage split** — fairness data (per-member quantity) is captured but unused.
6. **Stage 1 verification + go/no-go automation** — formation is fully manual.

## Notes / open questions for you

- **Escrow vs. facilitator:** the off-platform/never-hold-funds model is a deliberate pivot from the plan's Stripe Connect escrow. Worth confirming this is the intended long-term stance, since it changes Stages 7–8 substantially (and §10's legal framing).
- **Where should the lifecycle "live"?** Right now stages 3–8 are all on one long request page. If the product stays screen-first, that page may need to become stage-aware (show the active stage's tools prominently); if it goes agent-first, much of this becomes conversation + thin confirmation screens.
- **Per-member quantity → split:** this is the cheapest high-value fix — the data already exists to offer a by-usage split.
