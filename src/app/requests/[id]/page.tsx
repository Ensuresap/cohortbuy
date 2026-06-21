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
  Sparkles,
  MapPin,
  Globe,
  Phone,
  Package,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import {
  getRequest,
  listParticipantsFeed,
  listComments,
  listCostShares,
  myParticipation,
  listJoinRequests,
  myVote,
  getVoteTally,
} from "@/core/requests/services/requestService";
import { listMyCohorts } from "@/core/cohorts/services/cohortService";
import { listScope } from "@/core/scope/services/scopeService";
import { listQuotes } from "@/core/quotes/services/quoteService";
import { listCandidates } from "@/core/research/services/researchService";
import { getDeal } from "@/core/groupbuy/services/groupbuyService";
import {
  CANDIDATE_STATUS_LABELS,
  CANDIDATE_SOURCE_LABELS,
} from "@/core/research/domain/research";
import {
  STAGE_LABELS,
  JOINABLE_STATUSES,
  CONTRACT_STRUCTURE_LABELS,
  PAYMENT_MODE_LABELS,
  DECISION_POLICY_LABELS,
  PROJECT_TYPE_LABELS,
  SERVICE_SCOPE_LABELS,
  SPLIT_METHOD_LABELS,
  PARTICIPANT_ROLE_LABELS,
  type RequestStatus,
} from "@/core/requests/domain/request";
import { trackFor, STAGE_GUIDE, advanceBlockedReason } from "@/core/requests/domain/lifecycle";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import ProjectHeaderActions from "@/components/app/ProjectHeaderActions";
import RfqDraftEditor from "@/components/app/RfqDraftEditor";
import QuoteWizard from "@/components/app/QuoteWizard";
import ProductWizard from "@/components/app/ProductWizard";
import AiPickBadge from "@/components/app/AiPickBadge";
import CardTitle from "@/components/ui/CardTitle";
import MarkdownLite from "@/components/ui/MarkdownLite";
import {
  addScopeAction,
  updateScopeAction,
  deleteScopeAction,
  advanceRequestAction,
  updateQuoteAction,
  deleteQuoteAction,
  aiDraftRfqAction,
  addCommentAction,
  askAiDiscussionAction,
  updateCommentAction,
  deleteCommentAction,
  addCandidateAction,
  setCandidateStatusAction,
  deleteCandidateAction,
  setResearchAction,
  approveShortlistAction,
  aiEstimateBenchmarkAction,
  aiEstimateProductPriceAction,
  setVariantAction,
  deleteVariantAction,
  setMyOrderAction,
  aiSuggestVendorsAction,
  respondJoinAction,
  voteAction,
  aiRecommendQuoteAction,
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
  searchParams?: { step?: string; disc?: string };
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

  const [partsRes, scopeRes, quotesRes, commentsRes, sharesRes, candRes, myPartRes, joinReqRes, myVoteRes, tallyRes, mineRes] = await Promise.all([
    listParticipantsFeed(ctx, params.id),
    listScope(ctx, params.id),
    listQuotes(ctx, params.id),
    listComments(ctx, params.id),
    listCostShares(ctx, params.id),
    listCandidates(ctx, params.id),
    myParticipation(ctx, params.id),
    listJoinRequests(ctx, params.id),
    myVote(ctx, params.id),
    getVoteTally(ctx, params.id),
    listMyCohorts(ctx),
  ]);
  const participants = partsRes.ok ? partsRes.data : [];
  const myStatus = myPartRes.ok ? myPartRes.data : null;
  const joinRequests = joinReqRes.ok ? joinReqRes.data : [];
  const myVoteId = myVoteRes.ok ? myVoteRes.data : null;
  const tally = tallyRes.ok ? tallyRes.data : {};
  const scopeItems = scopeRes.ok ? scopeRes.data : [];
  const quotes = quotesRes.ok ? quotesRes.data : [];
  const comments = commentsRes.ok ? commentsRes.data : [];
  const shares = sharesRes.ok ? sharesRes.data : [];
  const candidates = candRes.ok ? candRes.data : [];

  const dealRes = req.project_type === "group_buy" ? await getDeal(ctx, params.id) : null;
  const deal = dealRes && dealRes.ok ? dealRes.data : null;
  const myOrderTotal = deal
    ? deal.variants.reduce((s, v) => s + (deal.myOrders[v.id] ?? 0) * (v.unit_price_cents ?? 0), 0)
    : 0;

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
  // Tab-scoped flags: a block must belong to the VIEWED step, not just the
  // project's current status, so e.g. the Select-vendor block never leaks onto
  // the Getting-quotes tab. Mutating actions still also require at(step).
  const onRfqStep = viewedStep === "rfq";
  const onDecideStep = viewedStep === "deciding";
  const discAll = searchParams?.disc === "all";
  const visibleComments = discAll ? comments : comments.filter((c) => c.stage === viewedStep || !c.stage);

  const nextStage = curIdx >= 0 && curIdx < track.length - 1 ? track[curIdx + 1] : null;
  const blockedReason = advanceBlockedReason(req.status, {
    participants: participants.length,
    minSize: req.min_size,
    scope: scopeItems.length,
    quotes: quotes.length,
    hasSelection,
    shares: shares.length,
    agreedAmount: req.agreed_amount_cents != null,
    shortlistApproved: req.shortlist_approved,
    pricedOptions: deal ? deal.variants.filter((v) => v.unit_price_cents != null).length : 0,
    committedUnits: deal ? deal.totalUnits : 0,
  }, req.project_type);

  const joinPending = myStatus === "requested";
  const canSeeWork = isParticipant || isManager;
  const joinableStage = JOINABLE_STATUSES.includes(req.status);
  const canEdit = (isCoordinator || isManager) && !isCompleted;
  const canJoin = !isParticipant && !joinPending && !req.locked && joinableStage;
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

  const showResearch = type === "service" && viewedStep === "research";
  const showQuotes = type === "service" && (viewedStep === "rfq" || viewedStep === "deciding");
  const showPrice = type === "group_buy" && viewedStep === "research";
  const shortlisted = candidates.filter((c) => c.status === "shortlisted");
  const benchmark =
    req.benchmark_low_cents != null && req.benchmark_high_cents != null
      ? `${fmt(req.benchmark_low_cents, req.benchmark_currency ?? "USD")} – ${fmt(req.benchmark_high_cents, req.benchmark_currency ?? "USD")}`
      : null;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        {/* Hero */}
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
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
                    joinPolicy: req.join_policy,
                    decisionPolicy: req.decision_policy,
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
                  joinPending={joinPending}
                  joinClosedReason={joinClosedReason}
                  backHref={req.cohort ? `/${req.cohort.handle}` : undefined}
                  backLabel={req.cohort?.name ? `Back to ${req.cohort.name}` : "Back"}
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
        {canSeeWork && (
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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
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
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Main — the selected step's panel */}
          <div className="space-y-6 lg:col-span-2">
            {!canSeeWork && (
              <Panel title="Join to take part">
                <p className="mt-2 whitespace-pre-wrap text-muted">{req.description || "A neighbor group project."}</p>
                {req.driver && <p className="mt-2 text-sm text-muted">{req.driver}</p>}
                <p className="mt-3 text-sm text-subtle">
                  Join to see the steps, scope, vendors, quotes and discussion — and to take part.
                </p>
                {joinPending && (
                  <p className="mt-3 text-sm font-medium text-primary">Your request to join is pending the coordinator&rsquo;s approval.</p>
                )}
              </Panel>
            )}
            {canSeeWork && (
              <>
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

            {/* Product & deal (group buy) */}
            {showPrice && (
              <Panel
                title="Product & deal"
                action={
                  at("research") && isCoordinator ? (
                    <ProductWizard
                      requestId={req.id}
                      hasProduct={!!req.product_name}
                      initial={{
                        name: req.product_name ?? "",
                        url: req.product_url ?? "",
                        specs: req.product_specs ?? "",
                        imageUrl: req.product_image_url ?? "",
                      }}
                    />
                  ) : undefined
                }
              >
                {/* 1 · Product */}
                {req.product_name ? (
                  <div className="mt-2 flex gap-3 rounded-xl border border-border p-4">
                    {req.product_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={req.product_image_url} alt={req.product_name} className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-text">{req.product_name}</p>
                      {req.product_specs && <p className="mt-0.5 text-sm text-muted">{req.product_specs}</p>}
                      {req.product_url && (
                        <a href={req.product_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                          <ExternalLink className="h-4 w-4" /> View listing
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-border p-4 text-muted">
                    <Package className="h-4 w-4 shrink-0" />
                    {at("research") && isCoordinator ? "Add the product you're buying together to research a price." : "No product set yet."}
                  </div>
                )}

                {/* 2 · Reference (market) price */}
                <div className="mt-3 rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-text">Market price (reference)</p>
                    {at("research") && isCoordinator && req.product_name && (
                      <form action={aiEstimateProductPriceAction}>
                        <input type="hidden" name="requestId" value={req.id} />
                        <button type="submit" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                          <Sparkles className="h-3.5 w-3.5" /> {benchmark ? "Re-estimate" : "Estimate with AI"}
                        </button>
                      </form>
                    )}
                  </div>
                  {benchmark ? (
                    <>
                      <p className="mt-1 font-display text-lg font-semibold text-text">{benchmark} <span className="text-sm font-normal text-subtle">/ unit</span></p>
                      {req.benchmark_basis && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">How this was estimated</summary>
                          <p className="mt-1 whitespace-pre-line text-xs text-muted">{req.benchmark_basis}</p>
                        </details>
                      )}
                      <p className="mt-1.5 text-xs text-subtle">AI estimate from training data — verify against the live seller price.</p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-muted">
                      {at("research") && isCoordinator ? "Add the product above, then estimate a typical retail price to anchor your negotiation." : "Not estimated yet."}
                    </p>
                  )}
                </div>

                {/* 3 · Options & pricing (variants) */}
                {deal && (
                  <div className="mt-3 rounded-xl border border-border p-4">
                    <p className="text-sm font-medium text-text">Options &amp; pricing</p>
                    {deal.variants.length === 0 ? (
                      <p className="mt-1 text-sm text-muted">
                        {at("research") && isCoordinator
                          ? "Add at least one option (e.g. a config or size) with its negotiated unit price."
                          : "No options listed yet."}
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {deal.variants.map((v) => {
                          const myQty = deal.myOrders[v.id] ?? 0;
                          const orderingOpen = (at("forming") || at("research")) && !req.locked;
                          return (
                            <li key={v.id} className="rounded-lg border border-border p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-medium text-text">{v.label}</p>
                                  {v.specs && <p className="text-xs text-muted">{v.specs}</p>}
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="font-semibold text-primary">
                                    {v.unit_price_cents != null ? `${fmt(v.unit_price_cents, v.currency)}` : "price TBD"}
                                    {v.unit_price_cents != null && <span className="text-xs font-normal text-subtle"> /unit</span>}
                                  </p>
                                  <p className="text-[11px] text-subtle">{v.committed_qty} committed · {fmt(v.line_total_cents, v.currency)}</p>
                                </div>
                              </div>
                              {orderingOpen && isParticipant && v.unit_price_cents != null && (
                                <form action={setMyOrderAction} className="mt-2 flex flex-wrap items-center gap-2">
                                  <input type="hidden" name="requestId" value={req.id} />
                                  <input type="hidden" name="variantId" value={v.id} />
                                  <label className="text-xs text-subtle">Your qty</label>
                                  <input name="qty" type="number" min="0" defaultValue={myQty} className="h-8 w-20 rounded-lg border border-border bg-surface px-2 text-sm text-text outline-none focus:ring-2 focus:ring-ring" />
                                  <button type="submit" className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover">Save</button>
                                  {myQty > 0 && <span className="text-xs font-medium text-primary">= {fmt(myQty * v.unit_price_cents, v.currency)}</span>}
                                </form>
                              )}
                              {at("research") && isCoordinator && (
                                <details className="mt-2 text-xs">
                                  <summary className="cursor-pointer font-medium text-primary hover:underline">Edit option</summary>
                                  <form action={setVariantAction} className="mt-2 space-y-2 rounded-lg border border-border p-3">
                                    <input type="hidden" name="requestId" value={req.id} />
                                    <input type="hidden" name="id" value={v.id} />
                                    <input name="label" required defaultValue={v.label} placeholder="Option label" className={fieldClass} />
                                    <input name="specs" defaultValue={v.specs ?? ""} placeholder="Specs (optional)" className={fieldClass} />
                                    <div className="grid grid-cols-3 gap-2">
                                      <input name="price" type="number" step="0.01" min="0" defaultValue={v.unit_price_cents != null ? (v.unit_price_cents / 100).toFixed(2) : ""} placeholder="Unit price" className={`${fieldClass} col-span-2`} />
                                      <input name="currency" defaultValue={v.currency} maxLength={3} className={fieldClass} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <Button type="submit" size="md">Save</Button>
                                    </div>
                                  </form>
                                  <form action={deleteVariantAction} className="mt-1">
                                    <input type="hidden" name="requestId" value={req.id} />
                                    <input type="hidden" name="id" value={v.id} />
                                    <button type="submit" className="text-accent hover:underline">Delete option</button>
                                  </form>
                                </details>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {at("research") && isCoordinator && (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer font-medium text-primary hover:underline">+ Add option</summary>
                        <form action={setVariantAction} className="mt-2 space-y-2 rounded-lg border border-border p-3">
                          <input type="hidden" name="requestId" value={req.id} />
                          <input name="label" required placeholder="Option label, e.g. '16GB / 512GB'" className={fieldClass} />
                          <input name="specs" placeholder="Specs (optional)" className={fieldClass} />
                          <div className="grid grid-cols-3 gap-2">
                            <input name="price" type="number" step="0.01" min="0" placeholder="Negotiated unit price" className={`${fieldClass} col-span-2`} />
                            <input name="currency" defaultValue="USD" maxLength={3} className={fieldClass} />
                          </div>
                          <Button type="submit" size="md">Add option</Button>
                        </form>
                      </details>
                    )}
                  </div>
                )}

                {/* 4 · Your order + deal totals */}
                {deal && deal.variants.length > 0 && (
                  <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
                    {isParticipant && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-subtle">Your order</span>
                        <span className="font-semibold text-text">{myOrderTotal > 0 ? fmt(myOrderTotal, deal.currency) : "—"}</span>
                      </div>
                    )}
                    <div className="mt-1 flex items-end justify-between">
                      <span className="text-sm text-subtle">Group total · {deal.buyers} {deal.buyers === 1 ? "buyer" : "buyers"} · {deal.totalUnits} units</span>
                      <span className="font-display text-lg font-semibold text-primary">{fmt(deal.totalValueCents, deal.currency)}</span>
                    </div>
                    {deal.totalUnits > 0 && benchmark && req.benchmark_high_cents != null && (
                      <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <TrendingDown className="h-3 w-3" /> Group price beats the ~{fmt(req.benchmark_high_cents, req.benchmark_currency ?? "USD")}/unit retail anchor
                      </p>
                    )}
                    <p className="mt-2 text-xs text-subtle">Quantities lock when the project moves to Funding, where each member is billed their order total.</p>
                  </div>
                )}
              </Panel>
            )}

            {/* Market research (service): benchmark + vendor shortlist */}
            {showResearch && (
              <Panel title="Market research">
                {/* Benchmark */}
                <div className="mt-2 rounded-xl border border-border p-4">
                  <p className="text-xs text-subtle">Estimated price range</p>
                  <p className="font-display text-lg font-semibold text-primary">{benchmark ?? "Not set yet"}</p>
                  {req.benchmark_basis && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-text">Based on</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted">{req.benchmark_basis}</p>
                    </div>
                  )}
                  {req.research_notes && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-text">Notes</p>
                      <p className="mt-0.5 text-sm text-muted">{req.research_notes}</p>
                    </div>
                  )}
                  {(isCoordinator || isManager) && at("research") && (
                    <form action={aiEstimateBenchmarkAction} className="mt-2 inline-block">
                      <input type="hidden" name="requestId" value={req.id} />
                      <button type="submit" className={subtleBtnClass}>
                        <Sparkles className="h-4 w-4 text-primary" /> Estimate with AI
                      </button>
                    </form>
                  )}
                  {(isCoordinator || isManager) && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">Set benchmark & notes</summary>
                      <form action={setResearchAction} className="mt-2 space-y-2">
                        <input type="hidden" name="requestId" value={req.id} />
                        <div className="grid grid-cols-3 gap-2">
                          <input name="low" type="number" step="0.01" min="0" placeholder="Low" defaultValue={req.benchmark_low_cents != null ? (req.benchmark_low_cents / 100).toFixed(0) : ""} className={`${fieldClass} col-span-1`} />
                          <input name="high" type="number" step="0.01" min="0" placeholder="High" defaultValue={req.benchmark_high_cents != null ? (req.benchmark_high_cents / 100).toFixed(0) : ""} className={`${fieldClass} col-span-1`} />
                          <input name="currency" defaultValue={req.benchmark_currency ?? "USD"} maxLength={3} className={fieldClass} />
                        </div>
                        <textarea name="notes" rows={2} defaultValue={req.research_notes ?? ""} placeholder="Permit / HOA / vetting notes…" className={fieldClass} />
                        <Button type="submit" size="md">Save</Button>
                      </form>
                    </details>
                  )}
                </div>

                {/* Vendor shortlist */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-text">Vendor shortlist</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-subtle">{shortlisted.length} shortlisted · {candidates.length} candidates</span>
                    {at("research") && (isCoordinator || isManager) && !req.shortlist_approved && (
                      <form action={aiSuggestVendorsAction}>
                        <input type="hidden" name="requestId" value={req.id} />
                        <button type="submit" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                          <Sparkles className="h-3.5 w-3.5" /> Suggest with AI
                        </button>
                      </form>
                    )}
                  </div>
                </div>
                {candidates.length === 0 ? (
                  <p className="mt-2 text-muted">No vendors added yet. Add candidates to research and shortlist.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {candidates.map((c) => {
                      const canManageCand = (c.suggested_by === user.id || isCoordinator || isManager) && !isCompleted;
                      const statusTone =
                        c.status === "shortlisted" ? "bg-primary/10 text-primary"
                        : c.status === "declined" ? "bg-surface-2 text-subtle"
                        : c.status === "contacted" ? "bg-accent/10 text-accent"
                        : "bg-surface-2 text-text";
                      return (
                        <li key={c.id} className="rounded-xl border border-border px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-text">{c.name}</p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-subtle">
                                <span className="rounded-full bg-surface-2 px-2 py-0.5">{CANDIDATE_SOURCE_LABELS[c.source]}</span>
                                {c.vetting_status === "unverified" && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent">Not vetted</span>}
                              </p>
                              <div className="mt-1 space-y-0.5 text-xs text-muted">
                                {c.address && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0 text-subtle" /> {c.address}</p>}
                                {c.website && (
                                  <a href={c.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                                    <Globe className="h-3 w-3 shrink-0" /> {c.website.replace(/^https?:\/\//, "")}
                                  </a>
                                )}
                                {c.contact && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0 text-subtle" /> {c.contact}</p>}
                              </div>
                              {c.notes && <p className="mt-1.5 text-sm text-muted">{c.notes}</p>}
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone}`}>{CANDIDATE_STATUS_LABELS[c.status]}</span>
                          </div>
                          {canManageCand && (
                            <div className="mt-2 flex items-center gap-3 text-xs">
                              {(["considering", "shortlisted", "contacted", "declined"] as const)
                                .filter((s) => s !== c.status)
                                .map((s) => (
                                  <form key={s} action={setCandidateStatusAction}>
                                    <input type="hidden" name="requestId" value={req.id} />
                                    <input type="hidden" name="id" value={c.id} />
                                    <input type="hidden" name="status" value={s} />
                                    <button type="submit" className="text-primary hover:underline">{CANDIDATE_STATUS_LABELS[s]}</button>
                                  </form>
                                ))}
                              <form action={deleteCandidateAction}>
                                <input type="hidden" name="requestId" value={req.id} />
                                <input type="hidden" name="id" value={c.id} />
                                <button type="submit" className="text-accent hover:underline">Delete</button>
                              </form>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {at("research") && isParticipant && !req.shortlist_approved && (
                  <form action={addCandidateAction} className="mt-4 space-y-2 rounded-xl border border-border p-4">
                    <p className="text-sm font-medium text-text">Add a vendor to research</p>
                    <input type="hidden" name="requestId" value={req.id} />
                    <input type="hidden" name="source" value="member" />
                    <input name="name" required placeholder="Vendor name" className={fieldClass} />
                    <input name="contact" placeholder="Contact (email / phone)" className={fieldClass} />
                    <input name="website" type="url" placeholder="Website (optional)" className={fieldClass} />
                    <input name="address" placeholder="Address / service area (optional)" className={fieldClass} />
                    <textarea name="notes" rows={2} placeholder="Why this vendor / notes…" className={fieldClass} />
                    <Button type="submit">Add candidate</Button>
                  </form>
                )}

                {at("research") && (isCoordinator || isManager) && !req.shortlist_approved && (
                  <form action={approveShortlistAction} className="mt-3">
                    <input type="hidden" name="requestId" value={req.id} />
                    <Button type="submit" size="md" disabled={shortlisted.length === 0} title={shortlisted.length === 0 ? "Shortlist at least one vendor first" : undefined}>
                      Approve shortlist
                    </Button>
                  </form>
                )}
                {req.shortlist_approved && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary"><CheckCircle2 className="h-4 w-4" /> Shortlist approved — ready for quotes</p>
                )}

                <p className="mt-3 text-xs text-subtle">
                  Vendor details (licence, insurance) are informational — CohortBuy does not guarantee any vendor. Verify before contracting.
                </p>
              </Panel>
            )}

            {/* Vendors & quotes (service) */}
            {showQuotes && (
              <Panel
                title={viewedStep === "rfq" ? "Vendors & quotes" : "Compare & select"}
                action={
                  onRfqStep && isParticipant ? (
                    <QuoteWizard requestId={req.id} />
                  ) : onDecideStep && at("deciding") && (isCoordinator || isManager) && quotes.length > 0 ? (
                    <form action={aiRecommendQuoteAction}>
                      <input type="hidden" name="requestId" value={req.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary/10"
                      >
                        <Sparkles className="h-4 w-4" /> AI Advisor
                      </button>
                    </form>
                  ) : undefined
                }
              >
                {onRfqStep && at("rfq") && (isCoordinator || isManager) && !isCompleted && (
                  <div className="mt-2 rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-text">Request for quote</p>
                      <form action={aiDraftRfqAction}>
                        <input type="hidden" name="requestId" value={req.id} />
                        <button type="submit" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                          <Sparkles className="h-3.5 w-3.5" /> {req.rfq_draft ? "Re-draft with AI" : "Draft with AI"}
                        </button>
                      </form>
                    </div>
                    {req.rfq_draft ? (
                      <>
                        <RfqDraftEditor requestId={req.id} draft={req.rfq_draft} canEdit={isCoordinator || isManager} />
                        <p className="mt-2 text-xs text-subtle">Send this to your shortlisted vendors, then record their replies below.</p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-muted">Draft a request to send to your shortlisted vendors, then log their quotes here.</p>
                    )}
                  </div>
                )}
                {onDecideStep && at("deciding") && (
                  <div className="mt-2 rounded-xl border border-primary/15 bg-primary/5 p-4">
                    <p className="text-sm font-medium text-text">Select vendor · {DECISION_POLICY_LABELS[req.decision_policy]}</p>
                    {req.ai_recommended_quote_id && (
                      <p className="mt-1 text-xs text-subtle">The AI Advisor flagged a pick below — tap the <span className="font-medium text-amber-700 dark:text-amber-300">AI pick</span> badge to see why.</p>
                    )}
                    {req.decision_policy === "vote" && (
                      <p className="mt-1 text-xs text-subtle">Members vote below to advise; the coordinator makes the final pick.</p>
                    )}
                    {isCoordinator && !hasSelection && (
                      <p className="mt-2 text-sm font-medium text-text">To decide, press <span className="text-primary">Select as winner</span> on your chosen quote below.</p>
                    )}
                    {hasSelection && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary"><CheckCircle2 className="h-4 w-4" /> Winner: {req.contract_vendor}. Move to Contracting when ready.</p>
                    )}
                  </div>
                )}
                {quotes.length === 0 ? (
                  <p className="mt-2 text-muted">No quotes recorded yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {quotes.map((q, i) => {
                      const selected = q.id === req.selected_quote_id;
                      const canManageQuote = (q.created_by === user.id || isCoordinator || isManager) && !isCompleted;
                      return (
                        <li
                          key={q.id}
                          className={
                            "rounded-xl border px-4 py-3 " +
                            (selected
                              ? "border-primary bg-primary/5"
                              : q.id === req.ai_recommended_quote_id
                                ? "border-amber-400/60 bg-amber-50/50 dark:border-amber-500/40 dark:bg-amber-500/5"
                                : "border-border")
                          }
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-text">
                              {q.vendor_name}
                              {selected && (
                                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">Selected</span>
                              )}
                              {!hasSelection && i === 0 && (
                                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Best price</span>
                              )}
                              {q.id === req.ai_recommended_quote_id && onDecideStep && (
                                <AiPickBadge rationale={req.ai_recommendation} />
                              )}
                              {onDecideStep && at("deciding") && req.decision_policy === "vote" && tally[q.id] ? (
                                <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-text">{tally[q.id]} vote{tally[q.id] === 1 ? "" : "s"}</span>
                              ) : null}
                            </span>
                            <span className="font-display text-lg font-semibold text-primary">{fmt(q.amount_cents, q.currency)}</span>
                          </div>
                          <p className="mt-1 text-xs text-subtle">
                            {q.kind}
                            {q.timeline ? ` · ${q.timeline}` : ""}
                            {q.warranty ? ` · ${q.warranty}` : ""}
                          </p>
                          {q.notes && <p className="mt-1 text-sm text-muted">{q.notes}</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            {onDecideStep && at("deciding") && isCoordinator && !selected && (
                              <form action={selectQuoteAction}>
                                <input type="hidden" name="requestId" value={req.id} />
                                <input type="hidden" name="quoteId" value={q.id} />
                                <Button type="submit" size="md" className="gap-1.5">
                                  <CheckCircle2 className="h-4 w-4" /> Select as winner
                                </Button>
                              </form>
                            )}
                            {onDecideStep && at("deciding") && isCoordinator && selected && (
                              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                                <CheckCircle2 className="h-4 w-4" /> Chosen winner
                              </span>
                            )}
                            {req.decision_policy === "vote" && onDecideStep && at("deciding") && isParticipant && (
                              <form action={voteAction}>
                                <input type="hidden" name="requestId" value={req.id} />
                                <input type="hidden" name="quoteId" value={myVoteId === q.id ? "" : q.id} />
                                <button type="submit" className={myVoteId === q.id ? "text-xs font-semibold text-primary hover:underline" : "text-xs font-medium text-primary hover:underline"}>
                                  {myVoteId === q.id ? "✓ Your vote — remove" : "Vote for this"}
                                </button>
                              </form>
                            )}
                          </div>
                          {onRfqStep && at("rfq") && canManageQuote && (
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
              <Panel
                title="Cost share"
                action={
                  at("funding") && canManageMoney && (deal ? deal.totalValueCents > 0 : req.agreed_amount_cents != null) ? (
                    <form action={generateCostSharesAction}>
                      <input type="hidden" name="requestId" value={req.id} />
                      <button type="submit" className={subtleBtnClass}>
                        {shares.length === 0 ? (deal ? "Bill from orders" : "Generate even split") : "Regenerate split"}
                      </button>
                    </form>
                  ) : undefined
                }
              >
                {shares.length > 0 && req.agreed_amount_cents != null && (
                  <p className="mt-1 text-xs text-subtle">
                    {fmt(collectedCents, shareCurrency)} of {fmt(req.agreed_amount_cents, shareCurrency)} collected
                  </p>
                )}
                {shares.length === 0 ? (
                  <p className="mt-2 text-muted">
                    {deal
                      ? deal.totalValueCents > 0
                        ? "No split yet — bill each member from their order."
                        : "Members haven't placed orders yet."
                      : req.agreed_amount_cents != null
                        ? "No split yet — generate an even split of the agreed amount."
                        : "A price is needed before splitting the cost."}
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
                <p className="mt-3 text-xs text-subtle">
                  Payments settle directly between members and the vendor, off-platform — this tracker only records who has paid.
                  CohortBuy never holds money or asks for bank/card details, SSN or OTP; if anyone requests those, report it to{" "}
                  <a href="mailto:helpline@cohortbuy.com" className="font-medium text-primary underline">helpline@cohortbuy.com</a>.
                </p>
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
              <CardTitle
                right={
                  <Link
                    href={discAll ? `/requests/${req.id}?step=${viewedStep}` : `/requests/${req.id}?step=${viewedStep}&disc=all`}
                    scroll={false}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {discAll ? "This step only" : "All discussion"}
                  </Link>
                }
              >
                Discussion
              </CardTitle>
              {!discAll && (
                <p className="-mt-2 mb-3 text-xs text-subtle">About the {STAGE_LABELS[viewedStep]} step.</p>
              )}
              <form action={addCommentAction} className="flex gap-2">
                <input type="hidden" name="requestId" value={req.id} />
                <input type="hidden" name="stage" value={viewedStep} />
                <input name="body" required placeholder="Add a comment…" className={fieldClass} />
                <Button type="submit">Post</Button>
                <Button type="submit" variant="secondary" formAction={askAiDiscussionAction} className="shrink-0 gap-1.5">
                  <Sparkles className="h-4 w-4" /> Ask AI
                </Button>
              </form>
              {visibleComments.length === 0 ? (
                <p className="mt-4 text-muted">No discussion yet — start the conversation.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {visibleComments.map((c) => {
                    const isAi = c.kind === "ai";
                    const mineComment = !isAi && c.user_id === user.id;
                    const canDelete = c.user_id === user.id || isCoordinator || isManager;
                    return (
                      <li key={c.id} className="flex gap-3">
                        {isAi ? (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Sparkles className="h-4 w-4" /></div>
                        ) : c.author_avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.author_avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initials(c.author_name)}</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            <span className="font-medium text-text">{isAi ? "CohortBuy AI" : c.author_name ?? "Member"}</span>
                            <span className="ml-2 text-xs text-subtle">{timeAgo(c.created_at)}</span>
                            {discAll && c.stage && (
                              <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-subtle">{STAGE_LABELS[c.stage as RequestStatus] ?? c.stage}</span>
                            )}
                          </p>
                          {isAi ? (
                            <div className="mt-0.5 rounded-xl bg-primary/5 p-3 text-text">
                              <MarkdownLite text={c.body} />
                            </div>
                          ) : (
                            <p className="mt-0.5 whitespace-pre-wrap text-text">{c.body}</p>
                          )}
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
              </>
            )}
          </div>

          {/* Side */}
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            {(isCoordinator || isManager) && joinRequests.length > 0 && (
              <section className="rounded-2xl border border-primary/30 bg-surface p-5 shadow-soft">
                <CardTitle>Join requests ({joinRequests.length})</CardTitle>
                <ul className="space-y-2">
                  {joinRequests.map((jr) => (
                    <li key={jr.user_id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-text">{jr.member_name ?? "Member"}</span>
                      <div className="flex items-center gap-3">
                        <form action={respondJoinAction}>
                          <input type="hidden" name="requestId" value={req.id} />
                          <input type="hidden" name="userId" value={jr.user_id} />
                          <input type="hidden" name="approve" value="true" />
                          <button type="submit" className="text-xs font-semibold text-primary hover:underline">Approve</button>
                        </form>
                        <form action={respondJoinAction}>
                          <input type="hidden" name="requestId" value={req.id} />
                          <input type="hidden" name="userId" value={jr.user_id} />
                          <input type="hidden" name="approve" value="false" />
                          <button type="submit" className="text-xs font-medium text-accent hover:underline">Decline</button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <CardTitle>Details</CardTitle>
              <dl className="space-y-3 text-sm">
                <Row label="Status" value={STAGE_LABELS[req.status]} />
                <Row label="Type" value={PROJECT_TYPE_LABELS[req.project_type]} />
                <Row label="Includes" value={SERVICE_SCOPE_LABELS[req.service_scope]} />
                <Row label="Cost split" value={SPLIT_METHOD_LABELS[req.split_method]} />
                <Row label="Started" value={fmtDate(req.created_at)} />
                <Row label="Target" value={req.target_date ? fmtDate(req.target_date) : "Not set"} />
                {req.join_deadline && <Row label="Join by" value={fmtDate(req.join_deadline)} />}
                <Row label="Min group" value={`${req.min_size} members`} />
                <Row label="Joining" value={req.join_policy === "approval" ? "Approval needed" : "Open to cohort"} />
                <Row label="Decision" value={req.decision_policy === "vote" ? "Group vote" : "Coordinator"} />
                {req.cohort && <Row label="Cohort" value={req.cohort.name} />}
              </dl>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <CardTitle>Participants</CardTitle>
              <ul className="space-y-2">
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

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <CardTitle right={action}>{title}</CardTitle>
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
