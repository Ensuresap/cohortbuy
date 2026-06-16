import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  listMyCohorts,
  searchPublicCohorts,
} from "@/core/cohorts/services/cohortService";
import { Button } from "@/components/ui/Button";

export default async function CohortsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ctx = { db: supabase, actor: { id: user.id } };

  const mineRes = await listMyCohorts(ctx);
  const mine = (mineRes.ok ? mineRes.data : []) as Array<{
    status: string;
    access_level: string;
    cohort: { id: string; handle: string; name: string } | null;
  }>;

  const searchRes = await searchPublicCohorts(ctx, {
    query: searchParams.q,
    limit: 20,
  });
  const results = (searchRes.ok ? searchRes.data : []) as Array<{
    id: string;
    handle: string;
    name: string;
    description: string | null;
  }>;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-text">Cohorts</h1>
        <Link href="/cohorts/new">
          <Button>Create cohort</Button>
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted">Your cohorts</h2>
        {mine.length === 0 ? (
          <p className="mt-2 text-muted">
            You haven&rsquo;t joined any cohorts yet. Search below or create one.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {mine.map((m) => (
              <li key={m.cohort?.id ?? Math.random()}>
                <Link
                  href={`/${m.cohort?.handle}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 hover:bg-surface-2"
                >
                  <span className="font-medium text-text">{m.cohort?.name}</span>
                  <span className="text-xs text-subtle">
                    {m.access_level} · {m.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-muted">Discover public cohorts</h2>
        <form className="mt-3 flex gap-2" action="/cohorts">
          <input
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Search by name…"
            className="min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none placeholder:text-subtle focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        <ul className="mt-4 space-y-2">
          {results.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${c.handle}`}
                className="block rounded-xl border border-border bg-surface px-4 py-3 hover:bg-surface-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text">{c.name}</span>
                  <span className="text-xs text-subtle">/{c.handle}</span>
                </div>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{c.description}</p>
                )}
              </Link>
            </li>
          ))}
          {results.length === 0 && (
            <p className="text-muted">No public cohorts found.</p>
          )}
        </ul>
      </section>
    </main>
  );
}
