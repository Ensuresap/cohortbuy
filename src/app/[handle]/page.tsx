import Link from "next/link";
import { Sparkles, Users, CalendarClock, Tag, Pencil } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCohortByHandle,
  listMyCohorts,
  listJoinRequests,
  getMemberDirectory,
  getTagCatalog,
} from "@/core/cohorts/services/cohortService";
import type { DirectoryMember, TagCatalogItem } from "@/core/cohorts/domain/cohort";
import { listCohortProjectCards } from "@/core/requests/services/requestService";
import { STAGE_LABELS, JOINABLE_STATUSES, PARTICIPANT_ROLE_LABELS, type ProjectCard } from "@/core/requests/domain/request";
import { joinRequestAction } from "@/app/requests/actions";
import { listFeed } from "@/core/posts/services/postService";
import type { FeedPost } from "@/core/posts/domain/post";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import {
  reviewAction,
  setTitleAction,
  setComanagerAction,
  respondInfoAction,
} from "../cohorts/actions";
import PostComposer from "@/components/app/PostComposer";
import CohortHeaderActions from "@/components/app/CohortHeaderActions";
import JoinButton from "@/components/app/JoinButton";
import SafetyNote from "@/components/app/SafetyNote";
import PostActions from "@/components/app/PostActions";
import AddProjectButton from "@/components/app/AddProjectButton";

const fieldClass =
  "min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none placeholder:text-subtle focus:ring-2 focus:ring-ring";

function initials(name: string | null) {
  return (name ?? "?").trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";
}
function isOnline(t: string | null) {
  return !!t && Date.now() - new Date(t).getTime() < 5 * 60 * 1000;
}
function monthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
function fmtCardDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
    info_request: string | null;
    cohort: { id: string } | null;
  }>;
  const membership = mine.find((m) => m.cohort?.id === cohort.id);
  const isApproved = membership?.status === "approved";
  const isManager = isApproved && membership?.access_level === "manager";
  const isOwner = cohort.created_by === user.id;

  const [dirRes, projRes, feedRes, catRes] = await Promise.all([
    isApproved ? getMemberDirectory(ctx, cohort.id) : Promise.resolve({ ok: true, data: [] as DirectoryMember[] }),
    isApproved ? listCohortProjectCards(ctx, cohort.id) : Promise.resolve({ ok: true, data: [] }),
    listFeed(ctx, cohort.id),
    isManager ? getTagCatalog(ctx) : Promise.resolve({ ok: true, data: [] as TagCatalogItem[] }),
  ]);
  const directory = (dirRes.ok ? dirRes.data : []) as DirectoryMember[];
  const tagCatalog = (catRes.ok ? catRes.data : []) as TagCatalogItem[];
  const projects = (projRes.ok ? projRes.data : []) as ProjectCard[];
  const posts = (feedRes.ok ? feedRes.data : []) as FeedPost[];

  let requests: Array<{
    user_id: string;
    display_name: string | null;
    answers: { question: string; answer: string }[] | null;
    info_response: string | null;
  }> = [];
  if (isManager) {
    const r = await listJoinRequests(ctx, cohort.id);
    requests = (r.ok ? r.data : []) as typeof requests;
  }

  const estYear = new Date(cohort.created_at).getFullYear();
  const years = new Date().getFullYear() - estYear;
  const onlineCount = directory.filter((m) => isOnline(m.last_seen_at)).length;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        {/* Identity */}
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          <div className="relative h-24 bg-gradient-to-br from-brand-forest to-brand-forest-dark sm:h-32">
            {cohort.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cohort.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
          </div>
          <div className="relative z-10 px-6 pb-6">
            <div className="-mt-10 flex items-end justify-between gap-4">
              <Avatar url={cohort.avatar_url} name={cohort.name} big ring />
              <div className="mb-1 flex flex-col items-end gap-2">
                <CohortHeaderActions cohort={cohort} isManager={isManager} isMember={isApproved} isOwner={isOwner} tagCatalog={tagCatalog} />
                {!membership && (
                  <JoinButton cohortId={cohort.id} handle={cohort.handle} questions={cohort.join_questions ?? []} />
                )}
                {membership && membership.status !== "approved" && (
                  <span className="rounded-full bg-surface-2 px-3 py-1.5 text-sm text-muted capitalize">{membership.status}</span>
                )}
                {isApproved && (
                  <span className="rounded-full bg-surface-2 px-3 py-1.5 text-sm text-text">
                    {isOwner ? "Owner" : membership?.access_level === "manager" ? "Co-admin" : "Member"}
                  </span>
                )}
              </div>
            </div>
            <h1 className="mt-3 font-display text-2xl font-semibold text-text sm:text-3xl">{cohort.name}</h1>
            {cohort.tagline && <p className="mt-1 text-muted">{cohort.tagline}</p>}
            <p className="mt-2 text-xs text-subtle">
              {cohort.visibility === "public" ? "Public" : "Private"} · /{cohort.handle} · Est. {estYear}
              {years > 0 ? ` · ${years} yr${years > 1 ? "s" : ""}` : ""}
              {isApproved ? ` · ${directory.length} member${directory.length === 1 ? "" : "s"}` : ""}
            </p>
          </div>
        </section>

        {membership?.status === "needs_info" && (
          <section className="mt-6 rounded-2xl border border-accent/40 bg-surface p-5 shadow-soft">
            <h2 className="font-display text-lg font-semibold text-text">More info requested</h2>
            {membership.info_request && <p className="mt-1 text-muted">{membership.info_request}</p>}
            <div className="mt-3">
              <SafetyNote />
            </div>
            <form action={respondInfoAction} className="mt-3 space-y-2">
              <input type="hidden" name="cohortId" value={cohort.id} />
              <input type="hidden" name="handle" value={cohort.handle} />
              <textarea name="response" required rows={3} placeholder="Your response…" className={fieldClass} />
              <Button type="submit">Send response</Button>
            </form>
          </section>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Main: feed + projects */}
          <div className="space-y-6 lg:col-span-2">
            {isApproved && (
              <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold text-text">Active projects</h2>
                  {isManager && (
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/${cohort.handle}/advisor`}
                        className="inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text transition hover:bg-surface-2"
                      >
                        <Sparkles className="h-4 w-4 text-primary" /> Advisor
                      </Link>
                      <AddProjectButton
                        cohortId={cohort.id}
                        handle={cohort.handle}
                        cohortKind={(cohort as { kind?: "service" | "group_buy" }).kind ?? "service"}
                      />
                    </div>
                  )}
                </div>
                {projects.length === 0 ? (
                  <p className="mt-3 text-muted">
                    {isManager ? "No projects yet — add one." : "No projects yet."}
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {projects.map((p) => {
                      const done = p.status === "completed";
                      const price =
                        p.agreed_amount_cents != null
                          ? fmtMoney(p.agreed_amount_cents, p.currency)
                          : p.benchmark_low_cents != null && p.benchmark_high_cents != null
                            ? `${fmtMoney(p.benchmark_low_cents, p.currency)}–${fmtMoney(p.benchmark_high_cents, p.currency)} est.`
                            : null;
                      const isMine = p.my_status === "joined";
                      const pending = p.my_status === "requested";
                      const joinable = !p.locked && !done && JOINABLE_STATUSES.includes(p.status);
                      return (
                        <li key={p.id} className="rounded-xl border border-border px-4 py-3 transition hover:bg-surface-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link href={`/requests/${p.id}`} className="font-medium text-text hover:text-primary">{p.title}</Link>
                              <p className="mt-0.5 text-xs text-subtle">
                                {p.category || (p.project_type === "group_buy" ? "Group buy" : "Service")}
                              </p>
                            </div>
                            <span className={"shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium " + (done ? "bg-primary/10 text-primary" : "bg-surface-2 text-text")}>
                              {STAGE_LABELS[p.status]}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-subtle" /> {p.participants}/{p.min_size}+ joined
                            </span>
                            {p.target_date && (
                              <span className="inline-flex items-center gap-1">
                                <CalendarClock className="h-3.5 w-3.5 text-subtle" /> by {fmtCardDate(p.target_date)}
                              </span>
                            )}
                            {price && (
                              <span className="inline-flex items-center gap-1">
                                <Tag className="h-3.5 w-3.5 text-subtle" /> {price}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            {isMine && p.my_role ? (
                              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                                You · {PARTICIPANT_ROLE_LABELS[p.my_role]}
                              </span>
                            ) : pending ? (
                              <span className="text-xs text-subtle">Request pending</span>
                            ) : joinable ? (
                              <form action={joinRequestAction}>
                                <input type="hidden" name="requestId" value={p.id} />
                                <button type="submit" className="inline-flex min-h-touch items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary-hover">
                                  {p.join_policy === "approval" ? "Request to join" : "Join"}
                                </button>
                              </form>
                            ) : (
                              <span className="text-xs text-subtle">{p.locked ? "Joining locked" : "Joining closed"}</span>
                            )}
                            <Link href={`/requests/${p.id}`} className="text-xs font-medium text-primary hover:underline">View →</Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              {isManager && <PostComposer cohortId={cohort.id} handle={cohort.handle} />}
              <div className={isManager ? "mt-5" : ""}>
                {posts.length === 0 ? (
                  <p className="text-muted">No posts yet{isManager ? " — share the first update." : "."}</p>
                ) : (
                  <ul className="space-y-5">
                    {posts.map((po) => (
                      <li key={po.id} className="border-b border-border pb-5 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar url={po.author_avatar} name={po.author_name} />
                            <div>
                              <p className="text-sm font-medium text-text">{po.author_name ?? "Admin"}</p>
                              <p className="text-xs text-subtle">{timeAgo(po.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + (po.visibility === "public" ? "bg-primary/10 text-primary" : "bg-surface-2 text-subtle")}>
                              {po.visibility === "public" ? "Public" : "Members"}
                            </span>
                            {(isManager || po.author_id === user.id) && (
                              <PostActions
                                post={{
                                  id: po.id,
                                  body: po.body,
                                  visibility: po.visibility,
                                  image_url: po.image_url,
                                  author_name: po.author_name,
                                  author_avatar: po.author_avatar,
                                }}
                                handle={cohort.handle}
                                cohortName={cohort.name}
                              />
                            )}
                          </div>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-text">{po.body}</p>
                        {po.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={po.image_url} alt="" className="mt-3 w-full rounded-xl border border-border object-cover" />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          {/* Side: members + manage */}
          <div className="space-y-6">
            {isApproved && (
              <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <div className="flex items-center justify-between border-b-2 border-primary/15 pb-3">
                  <h2 className="font-display text-lg font-semibold text-text">
                    Members <span className="text-subtle font-normal">· {directory.length}</span>
                  </h2>
                  {onlineCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      {onlineCount} online
                    </span>
                  )}
                </div>
                <ul className="mt-2 divide-y divide-border/60">
                  {directory.map((m) => {
                    const owner = m.user_id === cohort.created_by;
                    const role = owner ? "Owner" : m.access_level === "manager" ? "Co-admin" : "Member";
                    const roleClass = owner
                      ? "bg-primary/10 text-primary"
                      : m.access_level === "manager"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-surface-2 text-subtle";
                    const canManage = isManager && !owner;
                    const rowMain = (
                      <>
                        <div className="relative shrink-0">
                          <Avatar url={m.avatar_url} name={m.display_name} />
                          <span className={"absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface " + (isOnline(m.last_seen_at) ? "bg-green-500" : "bg-subtle")} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text">
                            {m.display_name ?? "Member"}
                            {m.user_id === user.id && <span className="text-subtle font-normal"> (you)</span>}
                          </p>
                          <p className="truncate text-xs text-subtle">
                            {m.title ? `${m.title} · ` : ""}since {monthYear(m.member_since)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + roleClass}>
                            {role}
                          </span>
                          {canManage && (
                            <span
                              className="text-subtle transition-colors group-hover:text-muted group-open:text-primary"
                              title="Edit member"
                              aria-label="Edit member"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                      </>
                    );
                    return (
                      <li key={m.user_id} className="py-3 first:pt-1">
                        {canManage ? (
                          <details className="group">
                            <summary className="flex cursor-pointer list-none items-center gap-3">
                              {rowMain}
                            </summary>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-12">
                              <form action={setTitleAction} className="flex items-center gap-1">
                                <input type="hidden" name="cohortId" value={cohort.id} />
                                <input type="hidden" name="userId" value={m.user_id} />
                                <input type="hidden" name="handle" value={cohort.handle} />
                                <input name="title" defaultValue={m.title ?? ""} placeholder="Title" className="h-8 w-28 rounded-lg border border-border bg-surface-2 px-2 text-xs text-text outline-none focus:ring-2 focus:ring-ring" />
                                <Button type="submit" size="md" variant="secondary">Set</Button>
                              </form>
                              {isOwner && (
                                <form action={setComanagerAction}>
                                  <input type="hidden" name="cohortId" value={cohort.id} />
                                  <input type="hidden" name="userId" value={m.user_id} />
                                  <input type="hidden" name="handle" value={cohort.handle} />
                                  <input type="hidden" name="make" value={m.access_level === "manager" ? "false" : "true"} />
                                  <Button type="submit" size="md" variant="ghost">
                                    {m.access_level === "manager" ? "Demote" : "Make co-admin"}
                                  </Button>
                                </form>
                              )}
                            </div>
                          </details>
                        ) : (
                          <div className="flex items-center gap-3">{rowMain}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {isManager && (
              <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <h2 className="font-display text-lg font-semibold text-text">Manage</h2>
                <div className="mt-3">
                  <p className="text-sm font-medium text-muted">Requests to join ({requests.length})</p>
                  {requests.length === 0 ? (
                    <p className="mt-1 text-sm text-subtle">None pending.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {requests.map((req) => (
                        <li key={req.user_id} className="rounded-xl border border-border px-3 py-2.5">
                          <p className="text-sm font-medium text-text">{req.display_name ?? "Member"}</p>
                          {req.answers && req.answers.length > 0 && (
                            <dl className="mt-1.5 space-y-1.5">
                              {req.answers.map((a, i) => (
                                <div key={i}>
                                  <dt className="text-xs font-medium text-muted">{a.question}</dt>
                                  <dd className="text-sm text-text">{a.answer || "—"}</dd>
                                </div>
                              ))}
                            </dl>
                          )}
                          {req.info_response && (
                            <p className="mt-1.5 text-xs text-muted">Follow-up: {req.info_response}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {(["approve", "reject"] as const).map((d) => (
                              <form key={d} action={reviewAction}>
                                <input type="hidden" name="cohortId" value={cohort.id} />
                                <input type="hidden" name="userId" value={req.user_id} />
                                <input type="hidden" name="handle" value={cohort.handle} />
                                <input type="hidden" name="decision" value={d} />
                                <Button type="submit" size="md" variant={d === "approve" ? "primary" : "secondary"}>{d}</Button>
                              </form>
                            ))}
                          </div>
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs font-medium text-primary">Ask for more info</summary>
                            <form action={reviewAction} className="mt-2 space-y-1.5">
                              <input type="hidden" name="cohortId" value={cohort.id} />
                              <input type="hidden" name="userId" value={req.user_id} />
                              <input type="hidden" name="handle" value={cohort.handle} />
                              <input type="hidden" name="decision" value="needs_info" />
                              <textarea name="message" required rows={2} placeholder="What should they clarify?" className="w-full rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-sm text-text outline-none focus:ring-2 focus:ring-ring" />
                              <Button type="submit" size="md" variant="secondary">Send request</Button>
                            </form>
                          </details>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function Avatar({ url, name, big, ring }: { url: string | null; name: string | null; big?: boolean; ring?: boolean }) {
  const size = big ? "h-20 w-20 text-2xl" : "h-10 w-10 text-sm";
  const ringCls = ring ? "ring-4 ring-surface" : "";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name ?? "avatar"} className={`${size} ${ringCls} shrink-0 rounded-2xl object-cover`} />;
  }
  return (
    <div className={`${size} ${ringCls} flex shrink-0 items-center justify-center rounded-2xl bg-primary font-display font-semibold text-primary-foreground`}>
      {initials(name)}
    </div>
  );
}
