import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCohortByHandle,
  listMyCohorts,
  listJoinRequests,
} from "@/core/cohorts/services/cohortService";
import { Button } from "@/components/ui/Button";
import AppShell from "@/components/app/AppShell";
import { requestJoinAction, reviewAction } from "../cohorts/actions";

export default async function CohortPage({
  params,
}: {
  params: { handle: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ctx = { db: supabase, actor: { id: user.id } };

  const cohortRes = await getCohortByHandle(ctx, { handle: params.handle });
  const cohort = cohortRes.ok ? cohortRes.data : null;
  if (!cohort) notFound();

  const mineRes = await listMyCohorts(ctx);
  const mine = (mineRes.ok ? mineRes.data : []) as Array<{
    status: string;
    access_level: string;
    cohort: { id: string } | null;
  }>;
  const membership = mine.find((m) => m.cohort?.id === cohort.id);
  const isManager =
    membership?.access_level === "manager" && membership?.status === "approved";

  let requests: Array<{ id: string; user_id: string; note: string | null }> = [];
  if (isManager) {
    const r = await listJoinRequests(ctx, cohort.id);
    requests = (r.ok ? r.data : []) as typeof requests;
  }

  return (
    <AppShell>
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <p className="text-sm text-subtle">
        /{cohort.handle} · {cohort.visibility}
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-text">
        {cohort.name}
      </h1>
      {cohort.description && <p className="mt-3 text-muted">{cohort.description}</p>}

      <div className="mt-6">
        {!membership && (
          <form action={requestJoinAction}>
            <input type="hidden" name="cohortId" value={cohort.id} />
            <input type="hidden" name="handle" value={cohort.handle} />
            <Button type="submit">Request to join</Button>
          </form>
        )}
        {membership && membership.status !== "approved" && (
          <p className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-text">
            Your request is <strong>{membership.status}</strong>.
          </p>
        )}
        {membership && membership.status === "approved" && (
          <p className="rounded-xl border border-primary/30 bg-surface-2 px-4 py-3 text-text">
            You&rsquo;re a {membership.access_level} of this cohort.
          </p>
        )}
      </div>

      {isManager && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-muted">
            Pending requests ({requests.length})
          </h2>
          {requests.length === 0 ? (
            <p className="mt-2 text-muted">No pending requests.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {requests.map((req) => (
                <li
                  key={req.id}
                  className="rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <p className="text-sm text-text">
                    Member{" "}
                    <span className="text-subtle">{req.user_id.slice(0, 8)}…</span>
                  </p>
                  {req.note && (
                    <p className="mt-1 text-sm text-muted">&ldquo;{req.note}&rdquo;</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["approve", "reject", "needs_info"] as const).map((decision) => (
                      <form key={decision} action={reviewAction}>
                        <input type="hidden" name="cohortId" value={cohort.id} />
                        <input type="hidden" name="userId" value={req.user_id} />
                        <input type="hidden" name="handle" value={cohort.handle} />
                        <input type="hidden" name="decision" value={decision} />
                        <Button
                          type="submit"
                          size="md"
                          variant={decision === "approve" ? "primary" : "secondary"}
                        >
                          {decision === "needs_info" ? "Ask info" : decision}
                        </Button>
                      </form>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
    </AppShell>
  );
}
