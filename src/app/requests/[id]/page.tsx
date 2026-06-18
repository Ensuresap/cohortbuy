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
  RotateCcw,
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
  updateScopeAction,
  deleteScopeAction,
  advanceRequestAction,
  addQuoteAction,
  updateQuoteAction,
  deleteQuoteAction,
  addCommentAction,
  updateCommentAction,
  deleteCommentAction,
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

export default async function RequestPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { step?: string };
}) {
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

  // ── Configurable lifecycle + tabbed navigation ─────────────────────────
  const type = req.project_type;
  const track = trackFor(type);
  const curIdx = track.indexOf(req.status);
  const at = (s: RequestStatus) => req.status === s;

  const requested = searchParams?.step as RequestStatus | undefined;
  const viewedStep: RequestStatus =
    requested && track.includes(requested) ? requested : track.includes(req.status) ? req.status : track[0];
  const viewingCurrent = viewedStep === req.status;
  const viewedIdx = track.indexOf(viewedStep);
  const viewingPast = curIdx >= 0 && viewedIdx >= 0 && viewedIdx < curIdx;

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

  const showQuotes = type === "service" && (viewedStep === "research" || viewedStep === "rfq" || viewedStep === "deciding");
  const showPrice = type === "group_buy" && viewedStep === "research";

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
                    serviceScope: req.service_scope,
                    splitMethod: req.split_method,
                    minSize: req.min_size,
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

        {/* Stage tabs + the viewed step's guidance/advance */}
        <section className="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <nav className="flex flex-wrap gap-1.5">
            {track.map((s, i) => {
              const done = curIdx >= 0 && i < curIdx;
              const current = i === curIdx;
              const selected = s === viewedStep;
              // Progress drives the fill: completed = solid green (+check),
              // current = bright ring, upcoming = muted. Selection adds an outline.
              const progressCls = done
                ? "bg-primary text-primary-foreground"
                : current
                  ? "bg-primary/20 text-primary ring-2 ring-primary"
                  : "bg-surface-2 text-subtle hover:bg-surface-2/70";
              const selCls = selected ? " outline outline-2 outline-offset-2 outline-primary/50" : "";
              return (
                <Link
                  key={s}
                  href={`/requests/${req.id}?step=${s}`}
                  scroll={false}
                  className={"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition " + progressCls + selCls}
                >
                  {done && <CheckCircle2 className="h-3 w-3" />}
                  {STAGE_LABELS[s]}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="min-w-0 text-sm text-muted">{STAGE_GUIDE[viewedStep]}</p>
            {viewingCurrent && isCoordinator && nextStage && !isCompleted && (
              <form action={advanceRequestAction} className="shrink-0">
                <input type="hidden" name="requestId" value={req.id} />
                <input type="hidden" name="status" value={nextStage} />
                <Button type="submit" size="md" disabled={!!blockedReason} className="gap-1.5" title={blockedReason ?? undefined}>
                  Move to {STAGE_LABELS[nextStage]} <ChevronRight className="h-4 w-4" />
                </Button>
              </form>
            )}
            {viewingPast && isCoordinator && !isCompleted && (
              <form action={advanceRequestAction} className="shrink-0">
                <input type="hidden" name="requestId" value={req.id} />
                <input type="hidden" name="status" value={viewedStep} />
                <Button type="submit" size="md" variant="secondary" className="gap-1.5">
                  <RotateCcw className="h-4 w-4" /> Reopen this step
                </Button>
              </form>
            )}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Main — the selected step's panel */}
          <div className="space-y-6 lg:col-span-2">
            {/* Forming */}
            {viewedStep === "forming" && (
              <Panel title="Gathering the group">
                <p className="mt-2 text-muted">
                  {participants.length} of {req.min_size}+ neighbors so far. Invite more with the Share button up top.
                </p>
              </Panel>
            )}

            {/* Scope */}
            {viewedStep === "scoping" && (
              <Panel title="Scope">
                {scopeItems.length === 0 ? (
                  <p className="mt-2 text-muted">No scope captured yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {scopeItems.map((s) => {
                      const canManage = (s.user_id === user.id || isCoordinator || isManager) && !isCompleted;
                      return (
                        <li key={s.id} className="rounded-xl border border-border px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-text">{s.description}</span>
                            {s.quantity && <span className="shrink-0 text-xs font-medium text-primary">{s.quantity}</span>}
                          </div>
                          {s.notes && <p className="mt-1 text-sm text-muted">{s.notes}</p>}
                          {canManage && (
                            <div className="mt-2 flex items-center gap-3 text-xs">
                              <details>
                                <summary className="cursor-pointer text-primary hover:underline">Edit</summary>
                                <form action={updateScopeAction} className="mt-2 space-y-2 rounded-xl border border-border p-3">
                                  <input type="hidden" name="requestId" value={req.id} />
                                  <input type="hidden" name="id" value={s.id} />
                                  <input name="description" required defaultValue={s.description} className={fieldClass} />
                                  <input name="quantity" defaultValue={s.quantity ?? ""} placeholder="Quantity" className={fieldClass} />
                                  <textarea name="notes" rows={2} defaultValue={s.notes ?? ""} placeholder="Notes" className={fieldClass} />
                                  <Button type="submit" size="md">Save</Button>
                                </form>
                              </details>
                              <form action={deleteScopeAction}>
                                <input type="hidden" name="requestId" value={req.id} />
                                <input type="hidden" name="id" value={s.id} />
                                <button type="submit" className="text-accent hover:underline">Delete</button>
                              </form>
                            </div>
                          )}
                        </li>
                      );
                    })}
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
              </Panel>
            )}

            {/* Product & price (group buy) */}
            {showPrice && (
              <Panel title="Product & price">
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
              </Panel>
            )}

            {/* Vendors & quotes (service) */}
            {showQuotes && (
              <Panel title="Vendors & quotes">
                {quotes.length === 0 ? (
                  <p className="mt-2 text-muted">No quotes recorded yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {quotes.map((q, i) => {
                      const selected = q.id === req.selected_quote_id;
                      const canManageQuote = (q.created_by === user.id || isCoordinator || isManager) && !isCompleted;
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
                          {canManageQuote && (
                            <div className="mt-2 flex items-center gap-3 text-xs">
                              <details>
                                <summary className="cursor-pointer text-primary hover:underline">Edit</summary>
                                <form action={updateQuoteAction} className="mt-2 space-y-2 rounded-xl border border-border p-3">
                                  <input type="hidden" name="requestId" value={req.id} />
                                  <input type="hidden" name="id" value={q.id} />
                                  <input name="vendorName" required defaultValue={q.vendor_name} placeholder="Vendor name" className={fieldClass} />
                                  <div className="grid grid-cols-3 gap-2">
                                    <input name="amount" type="number" step="0.01" min="0" required defaultValue={(q.amount_cents / 100).toFixed(2)} className={`${fieldClass} col-span-2`} />
                                    <input name="currency" defaultValue={q.currency} maxLength={3} className={fieldClass} />
                                  </div>
                                  <input name="timeline" defaultValue={q.timeline ?? ""} placeholder="Timeline" className={fieldClass} />
                                  <input name="warranty" defaultValue={q.warranty ?? ""} placeholder="Warranty" className={fieldClass} />
                                  <textarea name="notes" rows={2} defaultValue={q.notes ?? ""} placeholder="Notes" className={fieldClass} />
                                  <select name="kind" defaultValue={q.kind} className={fieldClass}>
                                    <option value="indicative">Indicative</option>
                                    <option value="final">Final</option>
                                  </select>
                                  <Button type="submit" size="md">Save</Button>
                                </form>
                              </details>
                              <form action={deleteQuoteAction}>
                                <input type="hidden" name="requestId" value={req.id} />
                                <input type="hidden" name="id" value={q.id} />
                                <button type="submit" className="text-accent hover:underline">Delete</button>
                              </form>
                            </div>
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
              </Panel>
            )}

            {/* Decision & contract (service) */}
            {type === "service" && viewedStep === "contracting" && (
              <Panel title="Decision & contract">
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
                    <p className="text-sm font-medium text-text">Set the structure & payment</p>
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
              </Panel>
            )}

            {/* Cost share */}
            {viewedStep === "funding" && (
              <Panel title="Cost share">
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
              </Panel>
            )}

            {/* In progress → completion */}
            {viewedStep === "in_progress" && (
              <Panel title="Delivery">
                <p className="mt-2 text-muted">Work is underway. The coordinator confirms once it&rsquo;s done.</p>
                {at("in_progress") && isCoordinator && (
                  <form action={completeProjectAction} className="mt-3 space-y-2 rounded-xl border border-border p-4">
                    <p className="text-sm font-medium text-text">Sign off completion</p>
                    <input type="hidden" name="requestId" value={req.id} />
                    <textarea name="note" rows={2} placeholder="Completion note (what was delivered, outcome)…" className={fieldClass} />
                    <Button type="submit">Mark project completed</Button>
                  </form>
                )}
              </Panel>
            )}

            {/* Completed recap */}
            {viewedStep === "completed" && (
              <Panel title="Completed">
                {req.contract_vendor && <p className="mt-2 text-text">Vendor: <span className="font-medium">{req.contract_vendor}</span></p>}
                {req.agreed_amount_cents != null && (
                  <p className="text-text">Agreed: <span className="font-medium">{fmt(req.agreed_amount_cents, req.agreed_currency ?? "USD")}</span></p>
                )}
                {req.completed_at && <p className="text-sm text-subtle">Signed off {fmtDate(req.completed_at)}</p>}
                {req.completion_note && <p className="mt-2 whitespace-pre-wrap text-muted">{req.completion_note}</p>}
                {!isCompleted && <p className="mt-2 text-muted">Not completed yet.</p>}
              </Panel>
            )}

            {/* Discussion */}
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
                  {comments.map((c) => {
                    const mineComment = c.user_id === user.id;
                    const canDelete = mineComment || isCoordinator || isManager;
                    return (
                      <li key={c.id} className="flex gap-3">
                        {c.author_avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.author_avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initials(c.author_name)}</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            <span className="font-medium text-text">{c.author_name ?? "Member"}</span>
                            <span className="ml-2 text-xs text-subtle">{timeAgo(c.created_at)}</span>
                          </p>
                          <p className="mt-0.5 whitespace-pre-wrap text-text">{c.body}</p>
                          {(mineComment || canDelete) && (
                            <div className="mt-1 flex items-center gap-3 text-xs">
                              {mineComment && (
                                <details>
                                  <summary className="cursor-pointer text-primary hover:underline">Edit</summary>
                                  <form action={updateCommentAction} className="mt-2 flex gap-2">
                                    <input type="hidden" name="requestId" value={req.id} />
                                    <input type="hidden" name="id" value={c.id} />
                                    <input name="body" required defaultValue={c.body} className={fieldClass} />
                                    <Button type="submit" size="md">Save</Button>
                                  </form>
                                </details>
                              )}
                              {canDelete && (
                                <form action={deleteCommentAction}>
                                  <input type="hidden" name="requestId" value={req.id} />
                                  <input type="hidden" name="id" value={c.id} />
                                  <button type="submit" className="text-accent hover:underline">Delete</button>
                                </form>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
      {children}
    </section>
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
