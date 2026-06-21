import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/core/profiles/services/profileService";
import { getBalance } from "@/core/tokens/services/tokenService";
import { tierProgress, EARN_RULES } from "@/core/tokens/domain/tokens";
import {
  listMyActiveProjects,
  listMyActionItems,
  listDiscoverProjects,
  listCommunityWins,
} from "@/core/requests/services/requestService";
import { listMyCohorts } from "@/core/cohorts/services/cohortService";
import { joinRequestAction } from "@/app/requests/actions";
import {
  PIPELINE,
  STAGE_LABELS,
  PARTICIPANT_ROLE_LABELS,
  PROJECT_TYPE_LABELS,
  type RequestStatus,
  type MyActiveProject,
  type ActionItem,
  type DiscoverProject,
  type CommunityWin,
} from "@/core/requests/domain/request";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import InviteNeighborsCard from "@/components/app/InviteNeighborsCard";
import CommunityWinsTicker from "@/components/app/CommunityWinsTicker";
import {
  ListChecks, Vote, Trophy, FileSignature,
  CreditCard, UserPlus, ArrowRight, Users, CheckCircle2, Coins, TrendingDown,
} from "lucide-react";

type CohortRow = { status: string; access_level: string; cohort: { id: string; handle: string; name: string } | null };

function pct(status: RequestStatus): number {
  const i = PIPELINE.indexOf(status);
  return i < 0 ? 0 : Math.round(((i + 1) / PIPELINE.length) * 100);
}

function fmtMoney(cents: number | null, currency = "USD"): string {
  if (cents == null) return "";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency", currency, maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `$${Math.round(cents / 100).toLocaleString()}`;
  }
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

const ACTION_ICON = {
  scope: ListChecks,
  vote: Vote,
  decide: Trophy,
  contract: FileSignature,
  pay: CreditCard,
  join_requests: UserPlus,
} as const;

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

  const [projectsRes, actionsRes, discoverRes, winsRes, cohortsRes, balRes] = await Promise.all([
    listMyActiveProjects(ctx),
    listMyActionItems(ctx),
    listDiscoverProjects(ctx),
    listCommunityWins(ctx),
    listMyCohorts(ctx),
    getBalance(ctx, { userId: user.id }),
  ]);

  const active = (projectsRes.ok ? projectsRes.data : []) as MyActiveProject[];
  const actions = (actionsRes.ok ? actionsRes.data : []) as ActionItem[];
  const discover = (discoverRes.ok ? discoverRes.data : []) as DiscoverProject[];
  const wins = (winsRes.ok ? winsRes.data : []) as CommunityWin[];
  const totalSaved = wins.reduce((s, w) => s + (w.saved_cents || 0), 0);
  const cohorts = (cohortsRes.ok ? cohortsRes.data : []) as CohortRow[];
  const tokens = balRes.ok ? balRes.data : { balance: 0, lifetimeEarned: 0, tier: "Newcomer" };
  const tp = tierProgress(tokens.lifetimeEarned);
  const primaryCohort = cohorts.find((c) => c.cohort)?.cohort ?? null;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold text-text">
              Welcome back, {profile.display_name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-muted">
              {actions.length > 0
                ? `${actions.length} thing${actions.length === 1 ? "" : "s"} need your attention.`
                : "You're all caught up. Here's what's moving."}
            </p>
          </div>
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-surface-2"
          >
            <Coins className="h-4 w-4 text-primary" />
            <span className="font-semibold text-primary">{tokens.balance}</span> · {tokens.tier}
          </Link>
        </div>

        {/* Community wins — single-line auto-scroll ticker */}
        <CommunityWinsTicker wins={wins} totalSaved={totalSaved} />

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Your turn */}
            {actions.length > 0 && (
              <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6 shadow-soft">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-text">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {actions.length}
                  </span>
                  Your turn
                </h2>
                <ul className="mt-4 space-y-2">
                  {actions.map((a, i) => {
                    const Icon = ACTION_ICON[a.kind];
                    const href = a.kind === "join_requests" ? `/${a.cohort_handle}` : `/requests/${a.request_id}`;
                    return (
                      <li key={a.request_id ?? `jr-${i}`}>
                        <Link
                          href={href}
                          className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 transition hover:border-primary/40 hover:bg-surface-2"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-text">
                              {a.kind === "join_requests" ? `${a.cnt} ${a.label}` : a.label}
                            </p>
                            <p className="truncate text-xs text-subtle">{a.title}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-primary" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Active projects */}
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
              <h2 className="border-b-2 border-primary/15 pb-3 font-display text-lg font-semibold text-text">
                Active projects{active.length > 0 && <span className="font-normal text-subtle"> · {active.length}</span>}
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
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="inline-flex items-center gap-1 font-medium text-muted">
                            <Users className="h-3.5 w-3.5" />
                            {p.participants} {p.participants === 1 ? "neighbor" : "neighbors"} pooling
                          </span>
                          {p.agreed_amount_cents != null ? (
                            <span className="font-medium text-text">Agreed {fmtMoney(p.agreed_amount_cents, p.currency)}/home</span>
                          ) : p.benchmark_low_cents != null && p.benchmark_high_cents != null ? (
                            <span className="text-muted">
                              Est. {fmtMoney(p.benchmark_low_cents, p.currency)}–{fmtMoney(p.benchmark_high_cents, p.currency)}/home
                            </span>
                          ) : null}
                          {p.agreed_amount_cents != null &&
                            p.benchmark_high_cents != null &&
                            p.benchmark_high_cents > p.agreed_amount_cents && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                                <TrendingDown className="h-3 w-3" />
                                save ~{fmtMoney(p.benchmark_high_cents - p.agreed_amount_cents, p.currency)}
                              </span>
                            )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-subtle">
                          <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + (p.last_comment ? "bg-primary/70" : "bg-subtle/50")} />
                          {p.last_comment
                            ? `New activity ${timeAgo(p.last_comment_at ?? p.last_activity_at)}`
                            : `Updated ${timeAgo(p.last_activity_at)}`}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Discover */}
            {discover.length > 0 && (
              <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
                <h2 className="border-b-2 border-primary/15 pb-3 font-display text-lg font-semibold text-text">
                  Join a project near you
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {discover.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 rounded-xl border border-border p-3.5">
                      <div className="min-w-0 flex-1">
                        <Link href={`/requests/${d.id}`} className="truncate text-sm font-medium text-text hover:text-primary">
                          {d.title}
                        </Link>
                        <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-subtle">
                          <span>{d.cohort_name}</span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {d.participants}/{d.min_size}
                          </span>
                          <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted">
                            {STAGE_LABELS[d.status]}
                          </span>
                        </p>
                      </div>
                      <form action={joinRequestAction}>
                        <input type="hidden" name="requestId" value={d.id} />
                        <button
                          type="submit"
                          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary-hover"
                        >
                          {d.join_policy === "approval" ? "Request" : "Join"}
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Side column */}
          <div className="space-y-6">
            {/* Status & tokens */}
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted">Your status</h2>
                <Link href="/account" className="text-xs font-medium text-primary hover:underline">Details</Link>
              </div>
              <div className="mt-1.5 flex items-end gap-2">
                <span className="font-display text-3xl font-semibold text-primary">{tokens.balance}</span>
                <span className="mb-1 text-sm text-muted">tokens</span>
                <span className="mb-1 ml-auto rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{tp.tier}</span>
              </div>
              {tp.next ? (
                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${tp.pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-subtle">
                    <span className="font-medium text-muted">{tp.toNext}</span> more to reach{" "}
                    <span className="font-medium text-text">{tp.next}</span>
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-subtle">Top tier reached — you&rsquo;re a community Pillar.</p>
              )}
              <div className="mt-4 space-y-1.5 border-t border-border pt-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">Earn more</p>
                <EarnRow label="Refer a neighbor" amount={EARN_RULES.refer_neighbor} />
                <EarnRow label="Complete a project" amount={EARN_RULES.complete_project} />
                <EarnRow label="Leave a rating" amount={EARN_RULES.leave_rating} />
              </div>
            </section>

            {/* Invite / referral */}
            <InviteNeighborsCard
              handle={primaryCohort?.handle ?? null}
              cohortName={primaryCohort?.name ?? null}
              reward={EARN_RULES.refer_neighbor}
            />

            {/* Your cohorts */}
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
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

function EarnRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-muted">
        <CheckCircle2 className="h-3.5 w-3.5 text-primary/70" />
        {label}
      </span>
      <span className="font-semibold text-primary">+{amount}</span>
    </div>
  );
}
