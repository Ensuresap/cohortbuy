import Link from "next/link";
import { Users, CircleDollarSign, FolderKanban } from "lucide-react";
import { COHORT_KIND_LABELS, humanizeTag, type PublicCohortCard } from "@/core/cohorts/domain/cohort";

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: cents >= 100_000 ? 0 : 1,
  }).format(cents / 100);
}

/** Cohort card with a compact image banner (content overlaid) + body. */
export default function CohortCard({
  cohort,
  showNear = true,
  statusLabel,
}: {
  cohort: PublicCohortCard;
  showNear?: boolean;
  statusLabel?: string;
}) {
  const hasValue = cohort.value_cents > 0;
  const place = cohort.city
    ? `${cohort.city}${cohort.region ? `, ${cohort.region}` : ""}`
    : cohort.country;
  const badge = statusLabel ?? (showNear && cohort.covers ? "Serves your area" : null);

  return (
    <Link
      href={`/${cohort.handle}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Banner */}
      <div className="relative h-24 bg-gradient-to-br from-brand-forest to-brand-forest-dark">
        {cohort.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cohort.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        {badge && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-semibold text-primary backdrop-blur">
            {badge}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 p-3">
          {cohort.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cohort.avatar_url}
              alt=""
              className="h-10 w-10 shrink-0 rounded-xl object-cover ring-2 ring-white/70"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 font-display text-sm font-semibold text-white ring-2 ring-white/40 backdrop-blur">
              {initials(cohort.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-base font-semibold leading-tight text-white">
              {cohort.name}
            </h3>
            <p className="truncate text-xs text-white/85">
              {COHORT_KIND_LABELS[cohort.kind]} · {place}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        {cohort.tagline && <p className="text-sm font-medium text-text">{cohort.tagline}</p>}
        {cohort.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{cohort.description}</p>
        )}

        {cohort.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cohort.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted"
              >
                {humanizeTag(t)}
              </span>
            ))}
            {cohort.tags.length > 3 && (
              <span className="px-1 py-0.5 text-[11px] text-subtle">+{cohort.tags.length - 3}</span>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span className="font-semibold text-text">{compact.format(cohort.member_count)}</span>
            member{cohort.member_count === 1 ? "" : "s"}
          </span>
          {hasValue && (
            <span className="inline-flex items-center gap-1.5">
              <CircleDollarSign className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="font-semibold text-text">{money(cohort.value_cents)}</span>
              coordinated
            </span>
          )}
          {cohort.project_count > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <FolderKanban className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="font-semibold text-text">{cohort.project_count}</span>
              project{cohort.project_count === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
