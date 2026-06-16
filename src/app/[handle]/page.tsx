import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCohortByHandle,
  listMyCohorts,
  listJoinRequests,
} from "@/core/cohorts/services/cohortService";
import { listCohortRequests } from "@/core/requests/services/requestService";
import { STAGE_LABELS } from "@/core/requests/domain/request";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { requestJoinAction, reviewAction } from "../cohorts/actions";
import { createRequestAction } from "../requests/actions";

const fieldClass =
  "min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none placeholder:text-subtle focus:ring-2 focus:ring-ring";

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
  const isApproved = membership?.status === "approved";
  const isManager = isApproved && membership?.access_level === "manager";

  let projectList: Array<{ id: string; title: string; status: keyof typeof STAGE_LABELS }> = [];
  if (isApproved) {
    const pr = await listCohortRequests(ctx, cohort.id);
    projectList = (pr.ok ? pr.data : []) as typeof projectList;
  }

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
        <h1 className="mt-1 font-display text-3xl font-semibold text-text">{cohort.name}</h1>
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
          {isApproved && (
            <p className="rounded-xl border border-primary/30 bg-surface-2 px-4 py-3 text-text">
              You&rsquo;re a {membership?.access_level} of this cohort.
            </p>
          )}
        </div>

        {/* Projects */}
        {isApproved && (
          <section className="mt-10">
            <h2 className="text-sm font-medium text-muted">Projects</h2>
            {projectList.length === 0 ? (
              <p className="mt-2 text-muted">No projects yet. Start one below.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {projectList.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/requests/${p.id}`}
                      className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 hover:bg-surface-2"
                    >
                      <span className="font-medium text-text">{p.title}</span>
                      <span className="text-xs text-subtle">{STAGE_LABELS[p.status]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <form
              action={createRequestAction}
              className="mt-4 space-y-2 rounded-2xl border border-border bg-surface p-4"
            >
              <p className="text-sm font-medium text-text">Start a project</p>
              <input type="hidden" name="cohortId" value={cohort.id} />
              <input type="hidden" name="handle" value={cohort.handle} />
              <input name="title" required placeholder="e.g. Backyard fence replacement" className={fieldClass} />
              <input name="category" placeholder="Category (e.g. Fencing)" className={fieldClass} />
              <textarea name="description" rows={2} placeholder="What needs doing?" className={fieldClass} />
              <Button type="submit">Create project</Button>
            </form>
          </section>
        )}

        {/* Manager: pending join requests */}
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
                  <li key={req.id} className="rounded-xl border border-border bg-surface px-4 py-3">
                    <p className="text-sm text-text">
                      Member <span className="text-subtle">{req.user_id.slice(0, 8)}…</span>
                    </p>
                    {req.note && <p className="mt-1 text-sm text-muted">&ldquo;{req.note}&rdquo;</p>}
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
