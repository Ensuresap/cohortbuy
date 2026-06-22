import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Users, CalendarClock, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProjectTeaserBySlug, getProjectTeaser } from "@/core/requests/services/requestService";
import { listMyCohorts } from "@/core/cohorts/services/cohortService";
import { STAGE_LABELS, PROJECT_TYPE_LABELS } from "@/core/requests/domain/request";

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function InvitePage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ctx = { db: supabase, actor: user ? { id: user.id } : undefined };

  const res = await getProjectTeaserBySlug(ctx, params.slug);
  let t = res.ok ? res.data : null;
  // Back-compat: an old UUID invite link still resolves.
  if (!t && /^[0-9a-f-]{36}$/i.test(params.slug)) {
    const byId = await getProjectTeaser(ctx, params.slug);
    t = byId.ok ? byId.data : null;
  }
  if (!t) notFound();

  // Already an approved member → straight to the project.
  if (user) {
    const mineRes = await listMyCohorts(ctx);
    const mine = (mineRes.ok ? mineRes.data : []) as Array<{ status: string; cohort: { id: string } | null }>;
    const isMember = mine.some((m) => m.cohort?.id === t.cohort_id && m.status === "approved");
    if (isMember) redirect(`/requests/${t.id}`);
  }

  const ctaHref = user ? `/${t.cohort_handle}` : `/login`;
  const ctaLabel = user ? `Join ${t.cohort_name} to take part` : "Sign in to join";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center gap-2">
          <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
            <circle cx="16" cy="16" r="15" fill="#8B7355" />
            <circle cx="12" cy="13" r="3.2" fill="#FAF8F5" />
            <circle cx="20" cy="13" r="3.2" fill="#C9B99A" />
            <circle cx="16" cy="20" r="3.2" fill="#5E4B36" />
          </svg>
          <span className="font-display text-lg font-semibold text-primary">CohortBuy</span>
        </div>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          <div className="h-20 bg-gradient-to-br from-brand-forest to-brand-forest-dark" />
          <div className="p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">
              You&rsquo;re invited to a group buy
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-text">{t.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">{STAGE_LABELS[t.status]}</span>
              {t.category && <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-medium text-text">{t.category}</span>}
              <span className="text-subtle">in {t.cohort_name}</span>
            </div>

            {t.description && <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{t.description}</p>}

            <dl className="mt-4 space-y-2 text-sm">
              <Row Icon={UserRound} label="Coordinated by" value={t.coordinator_name ?? "a neighbor"} />
              <Row Icon={Users} label="Joined so far" value={`${t.participants} · aiming for ${t.min_size}+`} />
              {t.join_deadline && <Row Icon={CalendarClock} label="Join by" value={fmtDate(t.join_deadline)} />}
            </dl>

            <Link
              href={ctaHref}
              className="mt-5 flex min-h-touch w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover"
            >
              {ctaLabel}
            </Link>
            <p className="mt-3 text-center text-xs text-subtle">
              {PROJECT_TYPE_LABELS[t.project_type]} · CohortBuy organizes the group; the agreement and
              payment stay between members and the vendor.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Row({
  Icon,
  label,
  value,
}: {
  Icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-subtle" />
      <dt className="text-subtle">{label}:</dt>
      <dd className="font-medium text-text">{value}</dd>
    </div>
  );
}
