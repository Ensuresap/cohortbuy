import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CheckCircle2,
  ExternalLink,
  CalendarDays,
  Target,
  Users,
  Wrench,
  Fence,
  Sun,
  Trees,
  Hammer,
  Lightbulb,
  Home,
  Lock,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import {
  getRequest,
  listParticipantsFeed,
  listComments,
  listCostShares,
} from "@/core/requests/services/requestService";
import { listMyCohorts } from "@/core/cohorts/services/cohortService";
import { listScope } from "@/core/scope/services/scopeService";
import { listQuotes } from "@/core/quotes/services/quoteService";
import {
  STAGE_LABELS,
  JOINABLE_STATUSES,
  CONTRACT_STRUCTURE_LABELS,
  PAYMENT_MODE_LABELS,
  PROJECT_TYPE_LABELS,
  SERVICE_SCOPE_LABELS,
  SPLIT_METHOD_LABELS,
  PARTICIPANT_ROLE_LABELS,
  type RequestStatus,
} from "@/core/requests/domain/request";
import { trackFor, STAGE_GUIDE, advanceBlockedReason } from "@/core/requests/domain/lifecycle";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import SafetyNote from "@/components/app/SafetyNote";
import ProjectHeaderActions from "@/components/app/ProjectHeaderActions";
import {
  addScopeAction,
  advanceRequestAction,
  addQuoteAction,
  addCommentAction,
  selectQuoteAction,
  recordContractAction,
  setTermsAction,
  generateCostSharesAction,
  setSharePaidAction,
  completeProjectAction,
  assignRoleAction,
  setAgreedAmountAction,
} from "../actions";
import { fieldClass, subtleBtnClass } from "@/components/ui/Field";

function fmt(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function targetHint(iso: string): { label: string; overdue: boolean } | null {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (Number.isNaN(days)) return null;
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, overdue: true };
  if (days === 0) return { label: "today", overdue: false };
  return { label: `in ${days}d`, overdue: false };
}
function categoryIcon(category: string | null): LucideIcon {
  const c = (category ?? "").toLowerCase();
  if (/(fenc)/.test(c)) return Fence;
  if (/(solar|energy|panel)/.test(c)) return Sun;
  if (/(tree|landscap|garden)/.test(c)) return Trees;
  if (/(pav|driveway|concret|seal)/.test(c)) return Hammer;
  if (/(light|season|holiday)/.test(c)) return Lightbulb;
  if (/(home|gutter|roof|maintenance|clean)/.test(c)) return Home;
  return Wrench;
}
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function initials(name: string | null) {
  return (name ?? "?").trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";
}

export default async function RequestPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ctx = { db: supabase, actor: { id: user.id } };

  const reqRes = await getRequest(ctx, { requestId: params.id });
  const req = reqRes.ok ? reqRes.data : null;
  if (!req) notFound();

  const [partsRes, scopeRes, quotesRes, commentsRes, sharesRes, mineRes] = await Promise.all([
    listParticipantsFeed(ctx, params.id),
    listScope(ctx, params.id),
    listQuotes(ctx, params.id),
    listComments(ctx, params.id),
    listCostShares(ctx, params.id),
    listMyCohorts(ctx),
  ]);
  const participants = partsRes.ok ? partsRes.data : [];
  const scopeItems = scopeRes.ok ? scopeRes.data : [];
  const quotes = quotesRes.ok ? quotesRes.data : [];
  const comments = commentsRes.ok ? commentsRes.data : [];
  const shares = sharesRes.ok ? sharesRes.data : [];

  const isParticipant = participants.some((p) => p.user_id === user.id);
  const isCoordinator = req.created_by === user.id;
  const isTreasurer = participants.some((p) => p.user_id === user.id && p.role === "treasurer");
  const canManageMoney = isCoordinator || isTreasurer;
  const hasSelection = !!req.selected_quote_id;
  const isCompleted = req.status === "completed";

  const mine = (mineRes.ok ? mineRes.data : []) as Array<{
    status: string;
    access_level: string;
    cohort: { id: string } | null;
  }>;
  const membership = mine.find((m) => m.cohort?.id === req.cohort_id);
  const isManager = membership?.status === "approved" && membership?.access_level === "manager";

  // ── Configurable lifecycle: the project's own stage track ────────────────
  const type = req.project_type;
  const track = trackFor(type);
  const curIdx = track.indexOf(req.status);
  const idxOf = (s: RequestStatus) => track.indexOf(s);
  const inTrack = (s: RequestStatus) => track.includes(s);
  const at = (s: RequestStatus) => req.status === s;
  const reached = (s: RequestStatus) => inTrack(s) && curIdx >= idxOf(s);
  const past = (s: RequestStatus) => inTrack(s) && curIdx > idxOf(s);

  const nextStage = curIdx >= 0 && curIdx < track.length - 1 ? track[curIdx + 1] : null;
  const blockedReason = advanceBlockedReason(req.status, {
    participants: participants.length,
    minSize: req.min_size,
    scope: scopeItems.length,
    quotes: quotes.length,
    hasSelection,
    shares: shares.length,
    agreedAmount: req.agreed_amount_cents != null,
  });

  const joinableStage = JOINABLE_STATUSES.includes(req.status);
  const canEdit = (isCoordinator || isManager) && !isCompleted;
  const canJoin = !isParticipant && !req.locked && joinableStage;
  const canExit = isParticipant && !isCoordinator && !req.locked && !isCompleted;
  const joinClosedReason =
    isParticipant || canJoin ? null : req.locked ? "Joining locked" : !joinableStage ? "Joining closed" : null;
  const sharesPaid = shares.filter((s) => s.paid);
  const collectedCents = sharesPaid.reduce((t, s) => t + s.amount_cents, 0);
  const shareCurrency = shares[0]?.currency ?? req.agreed_currency ?? "USD";

  const Icon = categoryIcon(req.category);
  const bestQuote = quotes.length ? quotes[0] : null;
  const headlineMoney =
    hasSelection && req.agreed_amount_cents != null
      ? fmt(req.agreed_amount_cents, req.agreed_currency ?? "USD")
      : bestQuote
        ? fmt(bestQuote.amount_cents, bestQuote.currency)
        : "—";

  const upNext = curIdx >= 0 ? track.slice(curIdx + 1).filter((s) => s !== "completed") : [];

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        {req.cohort && (
          <Link href={`/${req.cohort.handle}`} className="text-sm text-subtle hover:text-primary">
            ← {req.cohort.name}
          </Link>
        )}

        {/* Hero */}
        <section className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          <div className="relative h-28 bg-gradient-to-br from-brand-forest to-brand-forest-dark sm:h-36">
            <div className="absolute right-4 top-4 flex items-center gap-2">
              {req.locked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                  <Lock className="h-3 w-3" /> Locked
                </span>
              )}
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                {STAGE_LABELS[req.status]}
              </span>
            </div>
          </div>
          <div className="relative z-10 px-6 pb-6">
            <div className="-mt-10 flex items-end justify-between gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface shadow-soft ring-4 ring-surface">
                <Icon className="h-9 w-9 text-primary" />
              </div>
              <div className="mb-1">
                <ProjectHeaderActions
                  project={{
                    id: req.id,
                    slug: req.slug ?? "",
                    title: req.title,
                    category: req.category,
                    description: req.description,
                    driver: req.driver,
                    targetDate: req.target_date,
                    locked: req.locked,
                    stageLabel: STAGE_LABELS[req.status],
                    cohortId: req.cohort_id,
                    cohortName: req.cohort?.name ?? null,
                    cohortHandle: req.cohort?.handle ?? "",
                    startedLabel: fmtDate(req.created_at),
                    targetLabel: req.target_date ? fmtDate(req.target_date) : "Not set",
                    participants: participants.length,
                    scopeCount: scopeItems.length,
                    priceLabel: headlineMoney,
                  }}
                  canEdit={canEdit}
                  canJoin={canJoin}
                  canExit={canExit}
                  canAnnounce={isManager}
                  joinClosedReason={joinClosedReason}
                />
              </div>
            </div>
            <div className="mt-3">
              <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">{req.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {req.category && (
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-text">{req.category}</span>
                )}
                {req.cohort && <span className="text-subtle">in {req.cohort.name}</span>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-subtle" /> Started {fmtDate(req.created_at)}
                </span>
                {req.target_date && (
                  <span className="inline-flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-subtle" /> Target {fmtDate(req.target_date)}
                    {!isCompleted && targetHint(req.target_date) && (
                      <span className={targetHint(req.target_date)!.overdue ? "text-accent" : "text-subtle"}>
                        ({targetHint(req.target_date)!.label})
                      </span>
                    )}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-subtle" /> {participants.length} participant
                  {participants.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Stat strip */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Stage" value={STAGE_LABELS[req.status]} />
          <Stat label="Participants" value={String(participants.length)} />
          <Stat label="Target date" value={req.target_date ? fmtDate(req.target_date) : "Not set"} />
          <Stat label={hasSelection ? "Agreed price" : "Best quote"} value={headlineMoney} />
        </div>

        {isCompleted && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-text">Completed</p>
              {req.completed_at && (
                <p className="text-sm text-muted">
                  Signed off {new Date(req.completed_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                  {req.contract_vendor ? ` · ${req.contract_vendor}` : ""}
                </p>
              )}
              {req.completion_note && <p className="mt-1 text-sm text-muted">{req.completion_note}</p>}
            </div>
          </div>
        )}

        {/* Progress + current step */}
        <section className="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <StageBar track={track} status={req.status} />
          {!isCompleted && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">Current step · {STAGE_LABELS[req.status]}</p>
                <p className="mt-0.5 text-sm text-muted">{STAGE_GUIDE[req.status]}</p>
              </div>
              {isCoordinator && nextStage && (
                <form action={advanceRequestAction} className="shrink-0 text-right">
                  <input type="hidden" name="requestId" value={req.id} />
                  <input type="hidden" name="status" value={nextStage} />
                  <Button type="submit" size="md" disabled={!!blockedReason} className="gap-1.5">
                    Move to {STAGE_LABELS[nextStage]} <ChevronRight className="h-4 w-4" />
                  </Button>
                  {blockedReason && <p className="mt-1 max-w-[16rem] text-xs text-subtle">{blockedReason}</p>}
                </form>
              )}
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Main */}
          <div className="space-y-6 lg:col-span-2">
            {/* ── Scope ─────────────────────────────────────────────── */}
            {reached("scoping") && (
              <Phase title="Scope" active={at("scoping")} done={past("scoping")}>
                {scopeItems.length === 0 ? (
                  <p className="mt-2 text-muted">No scope captured yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {scopeItems.map((s) => (
                      <li key={s.id} className="rounded-xl border border-border px-4 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-text">{s.description}</span>
                          {s.quantity && <span className="text-xs font-medium text-primary">{s.quantity}</span>}
                        </div>
                        {s.notes && <p className="mt-1 text-sm text-muted">{s.notes}</p>}
                      </li>
                    ))}
                  </ul>
                )}
                {at("scoping") && isParticipant && (
                  <form action={addScopeAction} className="mt-4 space-y-2 rounded-xl border border-border p-4">
                    <p className="text-sm font-medium text-text">Add your scope</p>
                    <input type="hidden" name="requestId" value={req.id} />
                    <input name="description" required placeholder="What you need (e.g. wood fence, back yard)" className={fieldClass} />
                    <input name="quantity" placeholder="Quantity (e.g. 120 ft)" className={fieldClass} />
                    <textarea name="notes" rows={2} placeholder="Any details or variations…" className={fieldClass} />
                    <Button type="submit">Add to scope</Button>
                  </form>
                )}
              </Phase>
            )}

            {/* ── Product & price (group buy) ───────────────────────── */}
            {type === "group_buy" && reached("research") && (
              <Phase title="Product & price" active={at("research")} done={past("research")}>
                {req.agreed_amount_cents != null ? (
                  <p className="mt-2 font-display text-xl font-semibold text-primary">
                    {fmt(req.agreed_amount_cents, req.agreed_currency ?? "USD")}
                  </p>
                ) : (
                  <p className="mt-2 text-muted">No price set yet.</p>
                )}
                {at("research") && isCoordinator && (
                  <form action={setAgreedAmountAction} className="mt-3 space-y-2 rounded-xl border border-border p-4">
                    <p className="text-sm font-medium text-text">Set the negotiated price</p>
                    <input type="hidden" name="requestId" value={req.id} />
                    <div className="grid grid-cols-3 gap-2">
                      <input name="amount" type="number" step="0.01" min="0" required placeholder="Total price" className={`${fieldClass} col-span-2`} />
                      <input name="currency" defaultValue="USD" maxLength={3} className={fieldClass} />
                    </div>
                    <Button type="submit">Save price</Button>
                  </form>
                )}
              </Phase>
            )}

            {/* ── Vendors & quotes (service) ────────────────────────── */}
            {type === "service" && reached("research") && (
              <Phase
                title="Vendors & quotes"
                active={at("research") || at("rfq") || at("deciding")}
                done={past("deciding")}
              >
                {quotes.length === 0 ? (
                  <p className="mt-2 text-muted">No quotes recorded yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {quotes.map((q, i) => {
                      const selected = q.id === req.selected_quote_id;
                      return (
                        <li key={q.id} className={"rounded-xl border px-4 py-3 " + (selected ? "border-primary bg-primary/5" : "border-border")}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-text">
                              {q.vendor_name}
                              {selected && (
                                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">Selected</span>
                              )}
                              {!hasSelection && i === 0 && (
                                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Best price</span>
                              )}
                            </span>
                            <span className="font-display text-lg font-semibold text-primary">{fmt(q.amount_cents, q.currency)}</span>
                          </div>
                          <p className="mt-1 text-xs text-subtle">
                            {q.kind}
                            {q.timeline ? ` · ${q.timeline}` : ""}
                            {q.warranty ? ` · ${q.warranty}` : ""}
                          </p>
                          {q.notes && <p className="mt-1 text-sm text-muted">{q.notes}</p>}
                          {at("deciding") && isCoordinator && !selected && (
                            <form action={selectQuoteAction} className="mt-2">
                              <input type="hidden" name="requestId" value={req.id} />
                              <input type="hidden" name="quoteId" value={q.id} />
                              <button type="submit" className={subtleBtnClass}>Select this quote</button>
                            </form>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {(at("research") || at("rfq")) && isParticipant && (
                  <form action={addQuoteAction} className="mt-4 space-y-2 rounded-xl border border-border p-4">
                    <p className="text-sm font-medium text-text">Record a quote</p>
                    <input type="hidden" name="requestId" value={req.id} />
                    <input name="vendorName" required placeholder="Vendor name" className={fieldClass} />
                    <div className="grid grid-cols-3 gap-2">
                      <input name="amount" type="number" step="0.01" min="0" required placeholder="Amount" className={`${fieldClass} col-span-2`} />
                      <input name="currency" defaultValue="USD" maxLength={3} placeholder="USD" className={fieldClass} />
                    </div>
                    <input name="timeline" placeholder="Timeline (e.g. 2 weeks)" className={fieldClass} />
                    <input name="warranty" placeholder="Warranty (e.g. 5 years)" className={fieldClass} />
                    <textarea name="notes" rows={2} placeholder="Notes / exclusions…" className={fieldClass} />
                    <select name="kind" defaultValue="indicative" className={fieldClass}>
                      <option value="indicative">Indicative</option>
                      <option value="final">Final</option>
                    </select>
                    <Button type="submit">Add quote</Button>
                  </form>
                )}
              </Phase>
            )}

            {/* ── Decision & contract (service) ─────────────────────── */}
            {type === "service" && reached("contracting") && (
              <Phase title="Decision & contract" active={at("contracting")} done={past("contracting")}>
                {hasSelection ? (
                  <div className="mt-2 rounded-xl border border-border p-4">
                    <p className="text-sm text-subtle">Agreed vendor</p>
                    <p className="font-medium text-text">{req.contract_vendor}</p>
                    {req.agreed_amount_cents != null && (
                      <p className="mt-1 font-display text-xl font-semibold text-primary">{fmt(req.agreed_amount_cents, req.agreed_currency ?? "USD")}</p>
                    )}
                    {req.contract_url && (
                      <a href={req.contract_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                        <ExternalLink className="h-4 w-4" /> View contract document
                      </a>
                    )}
                    {req.contract_note && <p className="mt-1 text-sm text-muted">{req.contract_note}</p>}
                  </div>
                ) : (
                  <p className="mt-2 text-muted">No winning quote selected yet.</p>
                )}
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-subtle">Contract structure</p>
                    <p className="text-sm font-medium text-text">{CONTRACT_STRUCTURE_LABELS[req.contract_structure]}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-subtle">Payment</p>
                    <p className="text-sm font-medium text-text">{PAYMENT_MODE_LABELS[req.payment_mode]}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-subtle">
                  The agreement is made directly between participating members and the vendor. CohortBuy facilitates
                  coordination only — it is not a party to the contract and holds no funds.
                </p>
                {at("contracting") && (isCoordinator || isManager) && (
                  <form action={setTermsAction} className="mt-3 space-y-2 rounded-xl border border-border p-4">
                    <p className="text-sm font-medium text-text">Set the structure &amp; payment</p>
                    <input type="hidden" name="requestId" value={req.id} />
                    <label className="block text-xs font-medium text-subtle">
                      Contract structure
                      <select name="contractStructure" defaultValue={req.contract_structure} className={`${fieldClass} mt-1`}>
                        <option value="individual">Individual contracts (per member)</option>
                        <option value="combined">One combined group contract</option>
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-subtle">
                      Payment mode
                      <select name="paymentMode" defaultValue={req.payment_mode} className={`${fieldClass} mt-1`}>
                        <option value="individual_direct">Each member pays the vendor directly (off-platform)</option>
                        <option value="pooled_escrow">Pooled escrow — coming later</option>
                      </select>
                    </label>
                    <Button type="submit">Save terms</Button>
                  </form>
                )}
                {at("contracting") && isCoordinator && (
                  <form action={recordContractAction} className="mt-3 space-y-2 rounded-xl border border-border p-4">
                    <p className="text-sm font-medium text-text">Record the contract reference</p>
                    <input type="hidden" name="requestId" value={req.id} />
                    <input name="url" type="url" defaultValue={req.contract_url ?? ""} placeholder="Google Drive link to the signed agreement" className={fieldClass} />
                    <textarea name="note" rows={2} defaultValue={req.contract_note ?? ""} placeholder="Notes (scope agreed, start date, terms…)" className={fieldClass} />
                    <Button type="submit">Save contract reference</Button>
                  </form>
                )}
              </Phase>
            )}

            {/* ── Cost share ────────────────────────────────────────── */}
            {reached("funding") && (
              <Phase title="Cost share" active={at("funding") || at("in_progress")} done={past("in_progress")}>
                {shares.length > 0 && req.agreed_amount_cents != null && (
                  <p className="mt-1 text-xs text-subtle">
                    {fmt(collectedCents, shareCurrency)} of {fmt(req.agreed_amount_cents, shareCurrency)} collected
                  </p>
                )}
                {shares.length === 0 ? (
                  <p className="mt-2 text-muted">
                    {req.agreed_amount_cents != null ? "No split yet — generate an even split of the agreed amount." : "A price is needed before splitting the cost."}
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {shares.map((s) => {
                      const canToggle = canManageMoney || s.user_id === user.id;
                      return (
                        <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-2.5">
                          <div className="flex min-w-0 items-center gap-2">
                            {s.member_avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.member_avatar} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-text">{initials(s.member_name)}</div>
                            )}
                            <span className="truncate text-sm text-text">{s.user_id === user.id ? "You" : s.member_name ?? "Member"}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-text">{fmt(s.amount_cents, s.currency)}</span>
                            {s.paid ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Paid</span>
                            ) : (
                              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-subtle">Unpaid</span>
                            )}
                            {canToggle && !isCompleted && (
                              <form action={setSharePaidAction}>
                                <input type="hidden" name="requestId" value={req.id} />
                                <input type="hidden" name="shareId" value={s.id} />
                                <input type="hidden" name="paid" value={s.paid ? "false" : "true"} />
                                <button type="submit" className="text-xs font-medium text-primary hover:underline">{s.paid ? "Mark unpaid" : "Mark paid"}</button>
                              </form>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {at("funding") && canManageMoney && req.agreed_amount_cents != null && (
                  <form action={generateCostSharesAction} className="mt-3">
                    <input type="hidden" name="requestId" value={req.id} />
                    <button type="submit" className={subtleBtnClass}>{shares.length === 0 ? "Generate even split" : "Regenerate split"}</button>
                  </form>
                )}
                <div className="mt-3"><SafetyNote /></div>
                <p className="mt-2 text-xs text-subtle">Payments settle directly between members and the vendor, off-platform. This tracker records who has paid — CohortBuy never holds money.</p>
              </Phase>
            )}

            {/* ── Completion ────────────────────────────────────────── */}
            {at("in_progress") && isCoordinator && (
              <section className="rounded-2xl border border-primary/40 bg-surface p-5 shadow-soft ring-1 ring-primary/20">
                <CurrentBadge />
                <h2 className="font-display text-lg font-semibold text-text">Sign off completion</h2>
                <form action={completeProjectAction} className="mt-3 space-y-2">
                  <input type="hidden" name="requestId" value={req.id} />
                  <textarea name="note" rows={2} placeholder="Completion note (what was delivered, outcome)…" className={fieldClass} />
                  <Button type="submit">Mark project completed</Button>
                </form>
              </section>
            )}

            {/* ── Up next ───────────────────────────────────────────── */}
            {!isCompleted && upNext.length > 0 && (
              <section className="rounded-2xl border border-dashed border-border bg-surface/50 p-5">
                <h2 className="text-sm font-medium text-muted">Up next</h2>
                <ol className="mt-2 space-y-1 text-sm text-subtle">
                  {upNext.map((s) => (
                    <li key={s} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-border" /> {STAGE_LABELS[s]}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* ── About ─────────────────────────────────────────────── */}
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold text-text">About this project</h2>
              <p className="mt-2 whitespace-pre-wrap text-muted">{req.description || "No description yet."}</p>
              <h3 className="mt-4 text-sm font-semibold text-text">Why now — the driver</h3>
              <p className="mt-1 whitespace-pre-wrap text-muted">{req.driver || "Not specified."}</p>
            </section>

            {/* ── Discussion ────────────────────────────────────────── */}
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold text-text">Discussion</h2>
              <form action={addCommentAction} className="mt-3 flex gap-2">
                <input type="hidden" name="requestId" value={req.id} />
                <input name="body" required placeholder="Add a comment…" className={fieldClass} />
                <Button type="submit">Post</Button>
              </form>
              {comments.length === 0 ? (
                <p className="mt-4 text-muted">No discussion yet — start the conversation.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {comments.map((c) => (
                    <li key={c.id} className="flex gap-3">
                      {c.author_avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.author_avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initials(c.author_name)}</div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm">
                          <span className="font-medium text-text">{c.author_name ?? "Member"}</span>
                          <span className="ml-2 text-xs text-subtle">{timeAgo(c.created_at)}</span>
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap text-text">{c.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Side */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <h2 className="text-sm font-medium text-muted">Details</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <Row label="Status" value={STAGE_LABELS[req.status]} />
                <Row label="Type" value={PROJECT_TYPE_LABELS[req.project_type]} />
                <Row label="Includes" value={SERVICE_SCOPE_LABELS[req.service_scope]} />
                <Row label="Cost split" value={SPLIT_METHOD_LABELS[req.split_method]} />
                <Row label="Started" value={fmtDate(req.created_at)} />
                <Row label="Target" value={req.target_date ? fmtDate(req.target_date) : "Not set"} />
                {req.join_deadline && <Row label="Join by" value={fmtDate(req.join_deadline)} />}
                <Row label="Min group" value={`${req.min_size} members`} />
                {req.cohort && <Row label="Cohort" value={req.cohort.name} />}
              </dl>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold text-text">Participants</h2>
              <ul className="mt-3 space-y-2">
                {participants.map((p) => {
                  const isCreator = p.user_id === req.created_by;
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        {p.member_avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.member_avatar} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-text">{initials(p.member_name)}</div>
                        )}
                        <span className="truncate text-text">{p.user_id === user.id ? "You" : p.member_name ?? "Member"}</span>
                      </div>
                      {isCoordinator && !isCreator && !isCompleted ? (
                        <form action={assignRoleAction}>
                          <input type="hidden" name="requestId" value={req.id} />
                          <input type="hidden" name="userId" value={p.user_id} />
                          <select name="role" defaultValue={p.role} className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs text-text outline-none focus:ring-2 focus:ring-ring">
                            <option value="participant">Member</option>
                            <option value="treasurer">Treasurer</option>
                            <option value="coordinator">Co-coordinator</option>
                          </select>
                        </form>
                      ) : (
                        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-subtle">{PARTICIPANT_ROLE_LABELS[p.role]}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {isCoordinator && !isCompleted && (
                <p className="mt-2 text-xs text-subtle">Change a member&rsquo;s role from the dropdown — the Treasurer can manage the cost split.</p>
              )}
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function CurrentBadge() {
  return (
    <span className="mb-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-primary">
      Current step
    </span>
  );
}

function Phase({
  title,
  active,
  done,
  children,
}: {
  title: string;
  active: boolean;
  done: boolean;
  children: React.ReactNode;
}) {
  if (active) {
    return (
      <section className="rounded-2xl border border-primary/40 bg-surface p-5 shadow-soft ring-1 ring-primary/20">
        <CurrentBadge />
        <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
        {children}
      </section>
    );
  }
  return (
    <details className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-soft" open={!done}>
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <span className="font-display text-lg font-semibold text-text">{title}</span>
        {done && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" /> Done
          </span>
        )}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
      <p className="text-xs text-subtle">{label}</p>
      <p className="mt-1 truncate font-display text-lg font-semibold text-text">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-subtle">{label}</dt>
      <dd className="text-right text-text">{value}</dd>
    </div>
  );
}

function StageBar({ track, status }: { track: RequestStatus[]; status: RequestStatus }) {
  const currentIndex = track.indexOf(status);
  return (
    <div className="flex flex-wrap gap-1.5">
      {track.map((s, i) => {
        const done = currentIndex >= 0 && i < currentIndex;
        const current = i === currentIndex;
        return (
          <span
            key={s}
            className={
              "rounded-full px-2.5 py-1 text-xs font-medium " +
              (current
                ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                : done
                  ? "bg-primary/15 text-primary"
                  : "bg-surface-2 text-subtle")
            }
          >
            {STAGE_LABELS[s]}
          </span>
        );
      })}
    </div>
  );
}
