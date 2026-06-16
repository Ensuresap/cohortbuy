import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/core/profiles/services/profileService";
import { getBalance } from "@/core/tokens/services/tokenService";
import { listMyProjects } from "@/core/requests/services/requestService";
import { listMyCohorts } from "@/core/cohorts/services/cohortService";
import { listMyNotifications } from "@/core/services/notificationService";
import { PIPELINE, STAGE_LABELS, type RequestStatus } from "@/core/requests/domain/request";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";

type ProjectRow = {
  role: string;
  request: {
    id: string;
    title: string;
    status: RequestStatus;
    cohort: { handle: string; name: string } | null;
  } | null;
};
type CohortRow = { status: string; access_level: string; cohort: { id: string; handle: string; name: string } | null };
type Notif = { id: string; event: string; channel: string; status: string; payload: { message?: string } | null; created_at: string };

function pct(status: RequestStatus): number {
  const i = PIPELINE.indexOf(status);
  return i < 0 ? 0 : Math.round(((i + 1) / PIPELINE.length) * 100);
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ctx = { db: supabase, actor: { id: user.id } };

  const profileRes = await getMyProfile(ctx);
  const profile = profileRes.ok ? profileRes.data : null;
  if (!profile?.display_name) redirect("/onboarding");

  const [projectsRes, cohortsRes, notifsRes, balRes] = await Promise.all([
    listMyProjects(ctx),
    listMyCohorts(ctx),
    listMyNotifications(ctx, 8),
    getBalance(ctx, { userId: user.id }),
  ]);

  const projects = (projectsRes.ok ? projectsRes.data : []) as ProjectRow[];
  const cohorts = (cohortsRes.ok ? cohortsRes.data : []) as CohortRow[];
  const notifs = (notifsRes.ok ? notifsRes.data : []) as Notif[];
  const tokens = balRes.ok ? balRes.data : { balance: 0, lifetimeEarned: 0, tier: "Newcomer" };

  const active = projects.filter(
    (p) => p.request && p.request.status !== "completed" && p.request.status !== "cancelled"
  );

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold text-text">
              Welcome back, {profile.display_name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-muted">Here&rsquo;s what&rsquo;s moving across your cohorts.</p>
          </div>
          <Link
            href="/account"
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-surface-2"
          >
            <span className="font-semibold text-primary">{tokens.balance}</span> tokens · {tokens.tier}
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
              <h2 className="font-display text-lg font-semibold text-text">Active projects</h2>
              {active.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
                  <p className="text-muted">No active projects yet.</p>
                  <Link href="/cohorts" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
                    Browse cohorts to join or start one →
                  </Link>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {active.map((p) => (
                    <li key={p.request!.id}>
                      <Link
                        href={`/requests/${p.request!.id}`}
                        className="block rounded-xl border border-border p-4 transition hover:bg-surface-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-text">{p.request!.title}</span>
                          <span className="shrink-0 text-xs text-subtle">
                            {p.request!.cohort?.name}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct(p.request!.status)}%` }} />
                          </div>
                          <span className="shrink-0 text-xs font-medium text-primary">
                            {STAGE_LABELS[p.request!.status]}
                          </span>
                        </div>
                        {p.role === "coordinator" && (
                          <span className="mt-2 inline-block rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-text">
                            You coordinate
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
              <h2 className="font-display text-lg font-semibold text-text">Recent activity</h2>
              {notifs.length === 0 ? (
                <p className="mt-4 text-muted">Nothing yet. We&rsquo;ll let you know when an action is due.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {notifs.map((n) => (
                    <li key={n.id} className="flex items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                      <div>
                        <p className="text-sm text-text">{n.payload?.message ?? n.event}</p>
                        <p className="text-xs text-subtle">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Side column */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
              <h2 className="text-sm font-medium text-muted">Tokens</h2>
              <div className="mt-1 flex items-end gap-2">
                <span className="font-display text-4xl font-semibold text-primary">{tokens.balance}</span>
                <span className="mb-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-text">{tokens.tier}</span>
              </div>
              <p className="mt-1 text-xs text-subtle">{tokens.lifetimeEarned} earned all-time</p>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted">Your cohorts</h2>
                <Link href="/cohorts" className="text-xs font-medium text-primary hover:underline">All</Link>
              </div>
              {cohorts.length === 0 ? (
                <p className="mt-3 text-sm text-muted">None yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {cohorts.slice(0, 5).map((c) => (
                    <li key={c.cohort?.id ?? Math.random()}>
                      <Link
                        href={`/${c.cohort?.handle}`}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2"
                      >
                        <span className="text-text">{c.cohort?.name}</span>
                        <span className="text-xs text-subtle">{c.access_level}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="space-y-2">
              <Link href="/cohorts/new" className="block">
                <Button className="w-full">Create a cohort</Button>
              </Link>
              <Link href="/cohorts" className="block">
                <Button variant="secondary" className="w-full">Browse cohorts</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
