import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getMyCohortCards,
  discoverCohorts,
  getTagCatalog,
} from "@/core/cohorts/services/cohortService";
import { getMyProfile } from "@/core/profiles/services/profileService";
import type {
  PublicCohortCard,
  MyCohortCard,
  TagCatalogItem,
} from "@/core/cohorts/domain/cohort";
import { Button } from "@/components/ui/Button";
import AppShell from "@/components/app/AppShell";
import CohortCard from "@/components/app/CohortCard";
import TagFilter, { type TagFilterItem } from "@/components/app/TagFilter";
import SetZipForm from "@/components/app/SetZipForm";

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  IN: "India",
  AU: "Australia",
};
const countryName = (code?: string) => (code ? COUNTRY_NAMES[code] ?? code : "");
function statusLabelFor(c: MyCohortCard) {
  if (c.my_status === "approved") return c.my_access === "manager" ? "Manager" : "Member";
  if (c.my_status === "needs_info") return "Needs info";
  return c.my_status.charAt(0).toUpperCase() + c.my_status.slice(1);
}

export default async function CohortsPage({
  searchParams,
}: {
  searchParams: { q?: string; tag?: string; loc?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ctx = { db: supabase, actor: { id: user.id } };
  const query = searchParams.q?.trim() || undefined;
  const tag = searchParams.tag?.trim() || undefined;
  const showAllLocations = searchParams.loc === "all";

  const [myCardsRes, profileRes, catRes] = await Promise.all([
    getMyCohortCards(ctx),
    getMyProfile(ctx),
    getTagCatalog(ctx),
  ]);
  const myCardsAll = (myCardsRes.ok ? myCardsRes.data : []) as MyCohortCard[];
  const myIds = new Set(myCardsAll.map((c) => c.id));
  // When searching, narrow "your cohorts" by name too.
  const myCards = query
    ? myCardsAll.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : myCardsAll;
  const profile = profileRes.ok ? profileRes.data : null;
  const country = profile?.country;
  const viewerZip = profile?.postal_code ?? undefined;
  const viewerCity = profile?.city ?? undefined;
  const tagCatalog = (catRes.ok ? catRes.data : []) as TagCatalogItem[];
  const activeTagLabel = tagCatalog.find((t) => t.slug === tag)?.label;

  // Country is the hard boundary. Local-first within it: with a ZIP, show
  // cohorts covering it; "browse all" widens to the whole country (never
  // worldwide). Search composes with the active scope — it filters within your
  // ZIP by default, with a one-click "search all of <country>" when empty.
  const scope: "zip" | "country" | "all" =
    !showAllLocations && viewerZip ? "zip" : country ? "country" : "all";
  const canWiden = !showAllLocations && !!viewerZip;

  // Always pass the ZIP so `covers` is computed (used to flag local cohorts in
  // the wider views). Fetch without the tag filter so chips stay stable.
  const discRes = await discoverCohorts(ctx, {
    query,
    country,
    zip: viewerZip,
    scope,
    limit: 48,
  });
  // Exclude the viewer's own cohorts — they're shown first, above discovery.
  const base = (discRes.ok ? discRes.data : []).filter(
    (c: PublicCohortCard) => !myIds.has(c.id)
  ) as PublicCohortCard[];

  // Only offer tags that actually appear in the current results.
  const tagsInUse = new Set(base.flatMap((c) => c.tags));

  const visible = tag ? base.filter((c) => c.tags.includes(tag)) : base;
  const services = visible.filter((c) => c.kind === "service");
  const groupBuys = visible.filter((c) => c.kind === "group_buy");

  // Hrefs preserve query + location while toggling tag / location.
  const hrefWith = (over: { tag?: string | null; loc?: string | null }) => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    const t = over.tag === undefined ? tag : over.tag;
    const l = over.loc === undefined ? (showAllLocations ? "all" : null) : over.loc;
    if (t) p.set("tag", t);
    if (l) p.set("loc", l);
    const qs = p.toString();
    return qs ? `/cohorts?${qs}` : "/cohorts";
  };

  const tagItems: TagFilterItem[] = tagCatalog
    .filter((t) => tagsInUse.has(t.slug))
    .map((t) => ({
      slug: t.slug,
      label: t.label,
      href: hrefWith({ tag: t.slug }),
      active: tag === t.slug,
    }));

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        {/* Hero — image background, purpose headline, local search */}
        <section className="relative overflow-hidden rounded-3xl bg-brand-forest-dark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-cohorts.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/25" />
          <div className="relative px-6 py-8 sm:px-9 sm:py-10">
            <h1 className="max-w-2xl font-display text-2xl font-semibold leading-tight text-white sm:text-4xl">
              Group buying for your neighborhood
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/90 sm:text-base">
              Pool with neighbors on home services and bulk orders — one shared contract, split the cost.
            </p>
            <div className="mt-4 max-w-xl">
              <SetZipForm defaultZip={viewerZip ?? ""} variant="hero" />
            </div>
            {viewerZip && (
              <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/90">
                <span>
                  {scope === "zip" ? (
                    <>
                      Showing cohorts serving{" "}
                      <span className="font-semibold">{viewerZip}</span>
                      {viewerCity ? ` · ${viewerCity}` : ""}
                    </>
                  ) : (
                    <>Showing all cohorts in {countryName(country)}</>
                  )}
                </span>
                <Link
                  href={hrefWith({ loc: showAllLocations ? null : "all" })}
                  className="font-semibold text-white underline underline-offset-2 hover:text-white/80"
                >
                  {showAllLocations
                    ? `Show only my area (${viewerZip})`
                    : `Browse all of ${countryName(country) || "my country"}`}
                </Link>
              </p>
            )}
          </div>
        </section>

        {/* Your cohorts — shown first, as cards with status */}
        {myCards.length > 0 && (
          <section className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-semibold text-text">Your cohorts</h2>
              <Link href="/cohorts/new">
                <Button variant="secondary" size="md">
                  Create cohort
                </Button>
              </Link>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myCards.map((c) => (
                <CohortCard key={c.id} cohort={c} statusLabel={statusLabelFor(c)} />
              ))}
            </div>
          </section>
        )}

        {/* Discover */}
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold text-text">
              {query
                ? `Results for “${query}”`
                : activeTagLabel
                  ? `${activeTagLabel} cohorts`
                  : scope === "zip"
                    ? "Near you"
                    : `Cohorts in ${countryName(country) || "all locations"}`}
            </h2>
            {myCards.length === 0 && (
              <Link href="/cohorts/new">
                <Button variant="secondary" size="md">
                  Create cohort
                </Button>
              </Link>
            )}
          </div>

          <TagFilter items={tagItems} allHref={hrefWith({ tag: null })} allActive={!tag} />

          {visible.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
              <p className="text-text">
                {query
                  ? `No${canWiden ? " local" : ""} cohorts match “${query}”.`
                  : tag
                    ? `No${canWiden ? " local" : ""} cohorts with this tag.`
                    : scope === "zip"
                      ? `No cohorts cover ${viewerZip} yet.`
                      : `No public cohorts in ${countryName(country)} yet.`}
              </p>
              <p className="mt-1 text-sm text-muted">
                {canWiden
                  ? `Widen your search beyond ${viewerZip}, or start one for your neighborhood.`
                  : "Be the first to start one."}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {canWiden && (
                  <Link href={hrefWith({ loc: "all" })}>
                    <Button variant="secondary">
                      {query ? `Search all of ${countryName(country)}` : `Browse all of ${countryName(country)}`}
                    </Button>
                  </Link>
                )}
                <Link href="/cohorts/new">
                  <Button>Create a cohort</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-10">
              <CohortSection
                title="Services"
                subtitle="Work quoted & done per home"
                cohorts={services}
                showNear={scope !== "zip" && !!viewerZip}
              />
              <CohortSection
                title="Group buys"
                subtitle="Shared volume product orders"
                cohorts={groupBuys}
                showNear={scope !== "zip" && !!viewerZip}
              />
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}

function CohortSection({
  title,
  subtitle,
  cohorts,
  showNear,
}: {
  title: string;
  subtitle: string;
  cohorts: PublicCohortCard[];
  showNear: boolean;
}) {
  if (cohorts.length === 0) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-text">
          {title} <span className="text-sm font-normal text-subtle">({cohorts.length})</span>
        </h3>
        <span className="text-xs text-subtle">{subtitle}</span>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cohorts.map((c) => (
          <CohortCard key={c.id} cohort={c} showNear={showNear} />
        ))}
      </div>
    </div>
  );
}
