import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCohortByHandle,
  listMyCohorts,
  listJoinRequests,
  getMemberDirectory,
} from "@/core/cohorts/services/cohortService";
import type { DirectoryMember } from "@/core/cohorts/domain/cohort";
import { listCohortRequests } from "@/core/requests/services/requestService";
import { STAGE_LABELS } from "@/core/requests/domain/request";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import {
  requestJoinAction,
  reviewAction,
  updateCohortProfileAction,
  setTitleAction,
  setComanagerAction,
} from "../cohorts/actions";
import { createRequestAction } from "../requests/actions";

const fieldClass =
  "min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none placeholder:text-subtle focus:ring-2 focus:ring-ring";

function initials(name: string | null): string {
  return (name ?? "?").trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";
}
function isOnline(lastSeen: string | null): boolean {
  return !!lastSeen && Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
}
function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default async function CohortPage({ params }: { params: { handle: string } }) {
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
  const isOwner = cohort.created_by === user.id;

  let directory: DirectoryMember[] = [];
  let projectList: Array<{ id: string; title: string; status: keyof typeof STAGE_LABELS }> = [];
  if (isApproved) {
    const [dir, pr] = await Promise.all([
      getMemberDirectory(ctx, cohort.id),
      listCohortRequests(ctx, cohort.id),
    ]);
    directory = (dir.ok ? dir.data : []) as DirectoryMember[];
    projectList = (pr.ok ? pr.data : []) as typeof projectList;
  }

  let requests: Array<{ id: string; user_id: string; note: string | null }> = [];
  if (isManager) {
    const r = await listJoinRequests(ctx, cohort.id);
    requests = (r.ok ? r.data : []) as typeof requests;
  }

  const estYear = new Date(cohort.created_at).getFullYear();
  const years = new Date().getFullYear() - estYear;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        {/* Header */}
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
          <div className="flex items-start gap-4">
            <Avatar url={cohort.avatar_url} name={cohort.name} big />
            <div className="flex-1">
              <h1 className="font-display text-3xl font-semibold text-text">{cohort.name}</h1>
              {cohort.tagline && <p className="mt-1 text-muted">{cohort.tagline}</p>}
              <p className="mt-2 text-xs text-subtle">
                /{cohort.handle} · {cohort.visibility} · Est. {estYear}
                {years > 0 ? ` · ${years} yr${years > 1 ? "s" : ""}` : ""}
                {isApproved ? ` · ${directory.length} member${directory.length === 1 ? "" : "s"}` : ""}
              </p>
              {cohort.description && <p className="mt-3 text-sm text-muted">{cohort.description}</p>}
            </div>
          </div>

          <div className="mt-5">
            {!membership && (
              <form action={requestJoinAction}>
                <input type="hidden" name="cohortId" value={cohort.id} />
                <input type="hidden" name="handle" value={cohort.handle} />
                <Button type="submit">Request to join</Button>
              </form>
            )}
            {membership && membership.status !== "approved" && (
              <p className="text-sm text-muted">
                Your request is <strong className="text-text">{membership.status}</strong>.
              </p>
            )}
            {isApproved && (
              <p className="text-sm text-muted">
                You&rsquo;re {isOwner ? "the owner" : membership?.access_level === "manager" ? "a co-admin" : "a member"} here.
              </p>
            )}
          </div>
        </section>

        {/* Members */}
        {isApproved && (
          <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-semibold text-text">
              Members ({directory.length})
            </h2>
            <ul className="mt-4 space-y-3">
              {directory.map((m) => {
                const owner = m.user_id === cohort.created_by;
                const role = owner ? "Owner" : m.access_level === "manager" ? "Co-admin" : "Member";
                return (
                  <li key={m.user_id} className="flex flex-wrap items-center gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="relative">
                      <Avatar url={m.avatar_url} name={m.display_name} />
                      <span
                        className={
                          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface " +
                          (isOnline(m.last_seen_at) ? "bg-green-500" : "bg-subtle")
                        }
                        title={isOnline(m.last_seen_at) ? "Online" : "Offline"}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-text">
                        {m.display_name ?? "Member"}
                        {m.user_id === user.id && <span className="text-subtle"> (you)</span>}
                      </p>
                      <p className="text-xs text-subtle">
                        {role}
                        {m.title ? ` · ${m.title}` : ""} · member since {monthYear(m.member_since)}
                      </p>
                    </div>

                    {isManager && !owner && (
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={setTitleAction} className="flex items-center gap-1">
                          <input type="hidden" name="cohortId" value={cohort.id} />
                          <input type="hidden" name="userId" value={m.user_id} />
                          <input type="hidden" name="handle" value={cohort.handle} />
                          <input name="title" defaultValue={m.title ?? ""} placeholder="Title" className="h-9 w-28 rounded-lg border border-border bg-surface-2 px-2 text-sm text-text outline-none focus:ring-2 focus:ring-ring" />
                          <Button type="submit" size="md" variant="secondary">Set</Button>
                        </form>
                        {isOwner && (
                          <form action={setComanagerAction}>
                            <input type="hidden" name="cohortId" value={cohort.id} />
                            <input type="hidden" name="userId" value={m.user_id} />
                            <input type="hidden" name="handle" value={cohort.handle} />
                            <input type="hidden" name="make" value={m.access_level === "manager" ? "false" : "true"} />
                            <Button type="submit" size="md" variant="ghost">
                              {m.access_level === "manager" ? "Remove co-admin" : "Make co-admin"}
                            </Button>
                          </form>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Projects */}
        {isApproved && (
          <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-semibold text-text">Projects</h2>
            {projectList.length === 0 ? (
              <p className="mt-2 text-muted">No projects yet. Start one below.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {projectList.map((p) => (
                  <li key={p.id}>
                    <Link href={`/requests/${p.id}`} className="flex items-center justify-between rounded-xl border border-border px-4 py-3 hover:bg-surface-2">
                      <span className="font-medium text-text">{p.title}</span>
                      <span className="text-xs text-subtle">{STAGE_LABELS[p.status]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <form action={createRequestAction} className="mt-4 space-y-2 rounded-xl border border-border p-4">
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

        {/* Manager: pending requests */}
        {isManager && (
          <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-semibold text-text">Pending requests ({requests.length})</h2>
            {requests.length === 0 ? (
              <p className="mt-2 text-muted">No pending requests.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {requests.map((req) => (
                  <li key={req.id} className="rounded-xl border border-border px-4 py-3">
                    <p className="text-sm text-text">Member <span className="text-subtle">{req.user_id.slice(0, 8)}…</span></p>
                    {req.note && <p className="mt-1 text-sm text-muted">&ldquo;{req.note}&rdquo;</p>}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(["approve", "reject", "needs_info"] as const).map((decision) => (
                        <form key={decision} action={reviewAction}>
                          <input type="hidden" name="cohortId" value={cohort.id} />
                          <input type="hidden" name="userId" value={req.user_id} />
                          <input type="hidden" name="handle" value={cohort.handle} />
                          <input type="hidden" name="decision" value={decision} />
                          <Button type="submit" size="md" variant={decision === "approve" ? "primary" : "secondary"}>
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

        {/* Manager: cohort settings */}
        {isManager && (
          <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-semibold text-text">Cohort settings</h2>
            <form action={updateCohortProfileAction} className="mt-4 space-y-3">
              <input type="hidden" name="cohortId" value={cohort.id} />
              <input type="hidden" name="handle" value={cohort.handle} />
              <input name="name" defaultValue={cohort.name} placeholder="Cohort name" className={fieldClass} />
              <input name="tagline" defaultValue={cohort.tagline ?? ""} placeholder="Slogan / tagline" className={fieldClass} />
              <input name="avatarUrl" defaultValue={cohort.avatar_url ?? ""} placeholder="Logo image URL" className={fieldClass} />
              <textarea name="description" defaultValue={cohort.description ?? ""} rows={2} placeholder="Description" className={fieldClass} />
              <Button type="submit">Save settings</Button>
            </form>
          </section>
        )}
      </main>
    </AppShell>
  );
}

function Avatar({ url, name, big }: { url: string | null; name: string | null; big?: boolean }) {
  const size = big ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name ?? "avatar"} className={`${size} shrink-0 rounded-2xl object-cover`} />;
  }
  return (
    <div className={`${size} flex shrink-0 items-center justify-center rounded-2xl bg-primary font-display font-semibold text-primary-foreground`}>
      {initials(name)}
    </div>
  );
}
