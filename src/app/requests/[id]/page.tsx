import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getRequest,
  listParticipants,
  listComments,
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
import {
  joinRequestAction,
  addScopeAction,
  advanceRequestAction,
  addQuoteAction,
  addCommentAction,
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
function monthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
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

  const [partsRes, scopeRes, quotesRes, commentsRes] = await Promise.all([
    listParticipants(ctx, { requestId: params.id }),
    listScope(ctx, params.id),
    listQuotes(ctx, params.id),
    listComments(ctx, params.id),
  ]);
  const participants = partsRes.ok ? partsRes.data : [];
  const scopeItems = scopeRes.ok ? scopeRes.data : [];
  const quotes = quotesRes.ok ? quotesRes.data : [];
  const comments = commentsRes.ok ? commentsRes.data : [];

  const isParticipant = participants.some((p) => p.user_id === user.id);
  const isCoordinator = req.created_by === user.id;
  const vendorCount = new Set(quotes.map((q) => q.vendor_name)).size;

  const currentIndex = PIPELINE.indexOf(req.status);
  const nextStatus =
    currentIndex >= 0 && currentIndex < PIPELINE.length - 1 ? PIPELINE[currentIndex + 1] : null;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        {req.cohort && (
          <Link href={`/${req.cohort.handle}`} className="text-sm text-subtle hover:text-primary">
            ← {req.cohort.name}
          </Link>
        )}

        {/* Header */}
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold text-text">{req.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {STAGE_LABELS[req.status]}
              </span>
              {req.category && (
                <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-text">{req.category}</span>
              )}
              <span className="text-subtle">
                Started {monthYear(req.created_at)} · {participants.length} participant
                {participants.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          {!isParticipant && req.status === "forming" && (
            <form action={joinRequestAction}>
              <input type="hidden" name="requestId" value={req.id} />
              <Button type="submit">Join this project</Button>
            </form>
          )}
        </div>

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
                  {quotes.map((q, i) => (
                    <li key={q.id} className="rounded-xl border border-border px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-text">
                          {q.vendor_name}
                          {i === 0 && (
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
                    </li>
                  ))}
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
                <Row label="Started" value={new Date(req.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })} />
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
