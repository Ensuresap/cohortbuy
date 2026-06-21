import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/core/profiles/services/profileService";
import { getBalance } from "@/core/tokens/services/tokenService";
import { listMyActiveProjects } from "@/core/requests/services/requestService";
import { listMyCohorts } from "@/core/cohorts/services/cohortService";
import { listMyNotifications } from "@/core/services/notificationService";
import {
  PIPELINE,
  STAGE_LABELS,
  PARTICIPANT_ROLE_LABELS,
  PROJECT_TYPE_LABELS,
  type RequestStatus,
  type MyActiveProject,
} from "@/core/requests/domain/request";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { MessageSquare, Sparkles } from "lucide-react";

type CohortRow = { status: string; access_level: string; cohort: { id: string; handle: string; name: string } | null };
type Notif = { id: string; event: string; channel: string; status: string; payload: { message?: string } | null; created_at: string };

function pct(status: RequestStatus): number {
  const i = PIPELINE.indexOf(status);
  return i < 0 ? 0 : Math.round(((i + 1) / PIPELINE.length) * 100);
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
    listMyActiveProjects(ctx),
    listMyCohorts(ctx),
    listMyNotifications(ctx, 8),
    getBalance(ctx, { userId: user.id }),
  ]);

  const active = (projectsRes.ok ? projectsRes.data : []) as MyActiveProject[];
  const cohorts = (cohortsRes.ok ? cohortsRes.data : []) as CohortRow[];
  const notifs = (notifsRes.ok ? notifsRes.data : []) as Notif[];
  const tokens = balRes.ok ? balRes.data : { balance: 0, lifetimeEarned: 0, tier: "Newcomer" };

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
              <h2 className="border-b-2 border-primary/15 pb-3 font-display text-lg font-semibold text-text">
                Active projects{active.length > 0 && <span className="text-subtle font-normal"> · {active.length}</span>}
              </h2>
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
                    <li key={p.id}>
                      <Link
                        href={`/requests/${p.id}`}
                        className="block rounded-xl border border-border p-4 transition hover:bg-surface-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-text">{p.title}</p>
                            <p className="mt-0.5 truncate text-xs text-subtle">
                              {p.cohort_name} · {PROJECT_TYPE_LABELS[p.project_type].split(" — ")[0]}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              {STAGE_LABELS[p.status]}
                            </span>
                            {p.role !== "participant" && (
                              <span className="text-[11px] text-subtle">You {PARTICIPANT_ROLE_LABELS[p.role].toLowerCase()}</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct(p.status)}%` }} />
                        </div>
                        <div className="mt-2.5 flex items-center gap-2 text-xs text-subtle">
                          {p.last_comment ? (
                            <>
                              {p.last_comment_kind === "ai" ? (
                                <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                              ) : (
                                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                              )}
                              <span className="min-w-0 flex-1 truncate">
                                <span className="font-medium text-muted">
                                  {p.last_comment_kind === "ai" ? "AI" : (p.last_comment_author ?? "Member")}:
                                </span>{" "}
                                {p.last_comment}
                              </span>
                              <span className="shrink-0">{timeAgo(p.last_comment_at)}</span>
                            </>
                          ) : (
                            <span>Updated {timeAgo(p.last_activity_at)}</span>
                          )}
                        </div>
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
