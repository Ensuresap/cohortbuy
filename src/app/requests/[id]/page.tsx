import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getRequest,
  listParticipants,
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
} from "../actions";

const fieldClass =
  "min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none placeholder:text-subtle focus:ring-2 focus:ring-ring";

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

  const partsRes = await listParticipants(ctx, { requestId: params.id });
  const participants = partsRes.ok ? partsRes.data : [];
  const isParticipant = participants.some((p) => p.user_id === user.id);
  const isCoordinator = req.created_by === user.id;

  const scopeRes = await listScope(ctx, params.id);
  const scopeItems = scopeRes.ok ? scopeRes.data : [];

  const quotesRes = await listQuotes(ctx, params.id);
  const quotes = quotesRes.ok ? quotesRes.data : [];

  const currentIndex = PIPELINE.indexOf(req.status);
  const nextStatus =
    currentIndex >= 0 && currentIndex < PIPELINE.length - 1
      ? PIPELINE[currentIndex + 1]
      : null;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <p className="text-sm text-subtle">Project · {STAGE_LABELS[req.status]}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-text">{req.title}</h1>
        {req.category && (
          <span className="mt-2 inline-block rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-text">
            {req.category}
          </span>
        )}
        {req.description && <p className="mt-3 text-muted">{req.description}</p>}

        <StageBar status={req.status} />

        {isCoordinator && nextStatus && (
          <form action={advanceRequestAction} className="mt-4">
            <input type="hidden" name="requestId" value={req.id} />
            <input type="hidden" name="status" value={nextStatus} />
            <Button type="submit" size="md">
              Advance to {STAGE_LABELS[nextStatus]}
            </Button>
          </form>
        )}

        {/* Participants */}
        <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted">
              Participants ({participants.length})
            </p>
            {!isParticipant && req.status === "forming" && (
              <form action={joinRequestAction}>
                <input type="hidden" name="requestId" value={req.id} />
                <Button type="submit" size="md">Join this project</Button>
              </form>
            )}
          </div>
          <ul className="mt-3 space-y-1">
            {participants.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-text">
                  Member <span className="text-subtle">{p.user_id.slice(0, 8)}…</span>
                </span>
                <span className="text-xs text-subtle">{p.role}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Scope */}
        <section className="mt-6">
          <h2 className="text-sm font-medium text-muted">Scope</h2>
          {scopeItems.length === 0 ? (
            <p className="mt-2 text-muted">No scope captured yet. Add what you need below.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {scopeItems.map((s) => (
                <li key={s.id} className="rounded-xl border border-border bg-surface px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-text">{s.description}</span>
                    {s.quantity && (
                      <span className="text-xs font-medium text-primary">{s.quantity}</span>
                    )}
                  </div>
                  {s.notes && <p className="mt-1 text-sm text-muted">{s.notes}</p>}
                  <p className="mt-1 text-xs text-subtle">
                    by {s.user_id.slice(0, 8)}…
                  </p>
                </li>
              ))}
            </ul>
          )}

          {isParticipant && (
            <form
              action={addScopeAction}
              className="mt-4 space-y-2 rounded-2xl border border-border bg-surface p-4"
            >
              <p className="text-sm font-medium text-text">Add your scope</p>
              <input type="hidden" name="requestId" value={req.id} />
              <input name="description" required placeholder="What you need (e.g. wood fence, back yard)" className={fieldClass} />
              <input name="quantity" placeholder="Quantity (e.g. 120 ft)" className={fieldClass} />
              <textarea name="notes" rows={2} placeholder="Any details or variations…" className={fieldClass} />
              <Button type="submit">Add to scope</Button>
            </form>
          )}
        </section>

        {/* Quotes */}
        <section className="mt-6">
          <h2 className="text-sm font-medium text-muted">Quotes</h2>
          {quotes.length === 0 ? (
            <p className="mt-2 text-muted">No quotes recorded yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {quotes.map((q) => (
                <li key={q.id} className="rounded-xl border border-border bg-surface px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text">{q.vendor_name}</span>
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
            <form
              action={addQuoteAction}
              className="mt-4 space-y-2 rounded-2xl border border-border bg-surface p-4"
            >
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
      </main>
    </AppShell>
  );
}

function fmt(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
      cents / 100
    );
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function StageBar({ status }: { status: RequestStatus }) {
  const currentIndex = PIPELINE.indexOf(status);
  return (
    <div className="mt-6 flex flex-wrap gap-1.5">
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
