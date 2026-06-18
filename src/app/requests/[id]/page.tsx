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
  type LucideIcon,
} from "lucide-react";
import {
  getRequest,
  listParticipants,
  listComments,
  listCostShares,
} from "@/core/requests/services/requestService";
import { listScope } from "@/core/scope/services/scopeService";
import { listQuotes } from "@/core/quotes/services/quoteService";
import {
  PIPELINE,
  STAGE_LABELS,
  type RequestStatus,
} from "@/core/requests/domain/request";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import SafetyNote from "@/components/app/SafetyNote";
import EditProjectButton from "@/components/app/EditProjectButton";
import {
  joinRequestAction,
  addScopeAction,
  advanceRequestAction,
  addQuoteAction,
  addCommentAction,
  selectQuoteAction,
  recordContractAction,
  generateCostSharesAction,
  setSharePaidAction,
  completeProjectAction,
} from "../actions";

const fieldClass =
  "min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none placeholder:text-subtle focus:ring-2 focus:ring-ring";

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

  const [partsRes, scopeRes, quotesRes, commentsRes, sharesRes] = await Promise.all([
    listParticipants(ctx, { requestId: params.id }),
    listScope(ctx, params.id),
    listQuotes(ctx, params.id),
    listComments(ctx, params.id),
    listCostShares(ctx, params.id),
  ]);
  const participants = partsRes.ok ? partsRes.data : [];
  const scopeItems = scopeRes.ok ? scopeRes.data : [];
  const quotes = quotesRes.ok ? quotesRes.data : [];
  const comments = commentsRes.ok ? commentsRes.data : [];
  const shares = sharesRes.ok ? sharesRes.data : [];

  const isParticipant = participants.some((p) => p.user_id === user.id);
  const isCoordinator = req.created_by === user.id;
  const vendorCount = new Set(quotes.map((q) => q.vendor_name)).size;
  const hasSelection = !!req.selected_quote_id;
  const isCompleted = req.status === "completed";
  const sharesPaid = shares.filter((s) => s.paid);
  const collectedCents = sharesPaid.reduce((t, s) => t + s.amount_cents, 0);
  const shareCurrency = shares[0]?.currency ?? req.agreed_currency ?? "USD";

  const currentIndex = PIPELINE.indexOf(req.status);
  const nextStatus =
    currentIndex >= 0 && currentIndex < PIPELINE.length - 1 ? PIPELINE[currentIndex + 1] : null;

  const Icon = categoryIcon(req.category);
  const bestQuote = quotes.length ? quotes[0] : null;
  const headlineMoney =
    hasSelection && req.agreed_amount_cents != null
      ? fmt(req.agreed_amount_cents, req.agreed_currency ?? "USD")
      : bestQuote
        ? fmt(bestQuote.amount_cents, bestQuote.currency)
        : "—";

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
            <span className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              {STAGE_LABELS[req.status]}
            </span>
          </div>
          <div className="relative z-10 px-6 pb-6">
            <div className="-mt-10 flex items-end justify-between gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface shadow-soft ring-4 ring-surface">
                <Icon className="h-9 w-9 text-primary" />
              </div>
              <div className="mb-1 flex items-center gap-2">
                {isCoordinator && !isCompleted && (
                  <EditProjectButton
                    requestId={req.id}
                    title={req.title}
                    category={req.category}
                    description={req.description}
                    driver={req.driver}
                    targetDate={req.target_date}
                  />
                )}
                {!isParticipant && req.status === "forming" && (
                  <form action={joinRequestAction}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <Button type="submit">Join this project</Button>
                  </form>
                )}
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

        {/* Progress */}
        <section className="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-muted">Progress</p>
            {isCoordinator && nextStatus && (
              <form action={advanceRequestAction}>
                <input type="hidden" name="requestId" value={req.id} />
                <input type="hidden" name="status" value={nextStatus} />
                <Button type="submit" size="md">Advance to {STAGE_LABELS[nextStatus]}</Button>
              </form>
            )}
          </div>
          <StageBar status={req.status} />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Main */}
          <div className="space-y-6 lg:col-span-2">
            {/* About */}
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold text-text">About this project</h2>
              <p className="mt-2 whitespace-pre-wrap text-muted">
                {req.description || "No description yet."}
              </p>
              <h3 className="mt-4 text-sm font-semibold text-text">Why now — the driver</h3>
              <p className="mt-1 whitespace-pre-wrap text-muted">{req.driver || "Not specified."}</p>
            </section>

            {/* Scope */}
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold text-text">Scope</h2>
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
              {isParticipant && (
                <form action={addScopeAction} className="mt-4 space-y-2 rounded-xl border border-border p-4">
                  <p className="text-sm font-medium text-text">Add your scope</p>
                  <input type="hidden" name="requestId" value={req.id} />
                  <input name="description" required placeholder="What you need (e.g. wood fence, back yard)" className={fieldClass} />
                  <input name="quantity" placeholder="Quantity (e.g. 120 ft)" className={fieldClass} />
                  <textarea name="notes" rows={2} placeholder="Any details or variations…" className={fieldClass} />
                  <Button type="submit">Add to scope</Button>
                </form>
              )}
            </section>

            {/* Vendors & quotes */}
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-text">Vendors &amp; quotes</h2>
                <span className="text-xs text-subtle">
                  {vendorCount} vendor{vendorCount === 1 ? "" : "s"} quoted
                </span>
              </div>
              {quotes.length === 0 ? (
                <p className="mt-2 text-muted">No quotes recorded yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {quotes.map((q, i) => {
                    const selected = q.id === req.selected_quote_id;
                    return (
                      <li
                        key={q.id}
                        className={
                          "rounded-xl border px-4 py-3 " +
                          (selected ? "border-primary bg-primary/5" : "border-border")
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-text">
                            {q.vendor_name}
                            {selected && (
                              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                                Selected
                              </span>
                            )}
                            {!hasSelection && i === 0 && (
                              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                Best price
                              </span>
                            )}
                          </span>
                          <span className="font-display text-lg font-semibold text-primary">
                            {fmt(q.amount_cents, q.currency)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-subtle">
                          {q.kind}
                          {q.timeline ? ` · ${q.timeline}` : ""}
                          {q.warranty ? ` · ${q.warranty}` : ""}
                        </p>
                        {q.notes && <p className="mt-1 text-sm text-muted">{q.notes}</p>}
                        {isCoordinator && !selected && !isCompleted && (
                          <form action={selectQuoteAction} className="mt-2">
                            <input type="hidden" name="requestId" value={req.id} />
                            <input type="hidden" name="quoteId" value={q.id} />
                            <button
                              type="submit"
                              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface-2"
                            >
                              Select this quote
                            </button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {isParticipant && (
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
            </section>

            {/* Decision & contract */}
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold text-text">Decision &amp; contract</h2>
              {hasSelection ? (
                <div className="mt-2 rounded-xl border border-border p-4">
                  <p className="text-sm text-subtle">Agreed vendor</p>
                  <p className="font-medium text-text">{req.contract_vendor}</p>
                  {req.agreed_amount_cents != null && (
                    <p className="mt-1 font-display text-xl font-semibold text-primary">
                      {fmt(req.agreed_amount_cents, req.agreed_currency ?? "USD")}
                    </p>
                  )}
                  {req.contract_url && (
                    <a
                      href={req.contract_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" /> View contract document
                    </a>
                  )}
                  {req.contract_note && <p className="mt-1 text-sm text-muted">{req.contract_note}</p>}
                </div>
              ) : (
                <p className="mt-2 text-muted">
                  No quote selected yet. The coordinator picks a winning quote under Vendors &amp; quotes.
                </p>
              )}
              <p className="mt-3 text-xs text-subtle">
                The agreement is made directly between participating members and the vendor. CohortBuy
                facilitates coordination only — it is not a party to the contract and holds no funds.
              </p>
              {isCoordinator && hasSelection && !isCompleted && (
                <form action={recordContractAction} className="mt-3 space-y-2 rounded-xl border border-border p-4">
                  <p className="text-sm font-medium text-text">Record the contract reference</p>
                  <input type="hidden" name="requestId" value={req.id} />
                  <input
                    name="url"
                    type="url"
                    defaultValue={req.contract_url ?? ""}
                    placeholder="Google Drive link to the signed agreement"
                    className={fieldClass}
                  />
                  <textarea
                    name="note"
                    rows={2}
                    defaultValue={req.contract_note ?? ""}
                    placeholder="Notes (scope agreed, start date, terms…)"
                    className={fieldClass}
                  />
                  <Button type="submit">Save contract reference</Button>
                </form>
              )}
            </section>

            {/* Cost share */}
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-text">Cost share</h2>
                {shares.length > 0 && req.agreed_amount_cents != null && (
                  <span className="text-xs text-subtle">
                    {fmt(collectedCents, shareCurrency)} of {fmt(req.agreed_amount_cents, shareCurrency)} collected
                  </span>
                )}
              </div>
              {shares.length === 0 ? (
                <p className="mt-2 text-muted">
                  {hasSelection
                    ? "No split yet — the coordinator can generate an even split of the agreed amount."
                    : "Cost shares appear once a winning quote sets the agreed amount."}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {shares.map((s) => {
                    const canToggle = isCoordinator || s.user_id === user.id;
                    return (
                      <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                          {s.member_avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.member_avatar} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-text">
                              {initials(s.member_name)}
                            </div>
                          )}
                          <span className="truncate text-sm text-text">
                            {s.user_id === user.id ? "You" : s.member_name ?? "Member"}
                          </span>
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
                              <button type="submit" className="text-xs font-medium text-primary hover:underline">
                                {s.paid ? "Mark unpaid" : "Mark paid"}
                              </button>
                            </form>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {isCoordinator && hasSelection && !isCompleted && (
                <form action={generateCostSharesAction} className="mt-3">
                  <input type="hidden" name="requestId" value={req.id} />
                  <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface-2">
                    {shares.length === 0 ? "Generate even split" : "Regenerate split"}
                  </button>
                </form>
              )}
              <div className="mt-3">
                <SafetyNote />
              </div>
              <p className="mt-2 text-xs text-subtle">
                Payments are settled directly between members and the vendor, off-platform. This tracker
                records who has paid — CohortBuy never collects or holds money.
              </p>
            </section>

            {/* Completion */}
            {isCoordinator && !isCompleted && (
              <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <h2 className="font-display text-lg font-semibold text-text">Sign off completion</h2>
                <form action={completeProjectAction} className="mt-3 space-y-2">
                  <input type="hidden" name="requestId" value={req.id} />
                  <textarea name="note" rows={2} placeholder="Completion note (what was delivered, outcome)…" className={fieldClass} />
                  <Button type="submit">Mark project completed</Button>
                </form>
              </section>
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
                  {comments.map((c) => (
                    <li key={c.id} className="flex gap-3">
                      {c.author_avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.author_avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {initials(c.author_name)}
                        </div>
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
                <Row label="Started" value={fmtDate(req.created_at)} />
                <Row label="Target" value={req.target_date ? fmtDate(req.target_date) : "Not set"} />
                <Row label="Min group" value={`${req.min_size} members`} />
                <Row label="Participants" value={String(participants.length)} />
                {req.cohort && <Row label="Cohort" value={req.cohort.name} />}
              </dl>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold text-text">Participants</h2>
              <ul className="mt-3 space-y-1">
                {participants.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-text">
                      {p.user_id === user.id ? "You" : "Member"}
                      <span className="text-subtle"> {p.user_id.slice(0, 6)}…</span>
                    </span>
                    <span className="text-xs text-subtle">{p.role}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>
    </AppShell>
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

function StageBar({ status }: { status: RequestStatus }) {
  const currentIndex = PIPELINE.indexOf(status);
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {PIPELINE.map((s, i) => {
        const done = currentIndex >= 0 && i <= currentIndex;
        return (
          <span
            key={s}
            className={
              "rounded-full px-2.5 py-1 text-xs font-medium " +
              (done ? "bg-primary text-primary-foreground" : "bg-surface-2 text-subtle")
            }
          >
            {STAGE_LABELS[s]}
          </span>
        );
      })}
    </div>
  );
}
