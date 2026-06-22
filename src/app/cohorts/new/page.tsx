import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTagCatalog } from "@/core/cohorts/services/cohortService";
import { getMyProfile } from "@/core/profiles/services/profileService";
import { getBalance } from "@/core/tokens/services/tokenService";
import { MIN_LIFETIME_TO_CREATE_COHORT } from "@/core/tokens/domain/tokens";
import type { TagCatalogItem } from "@/core/cohorts/domain/cohort";
import CreateCohortForm from "./CreateCohortForm";
import AppShell from "@/components/app/AppShell";

export default async function NewCohortPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ctx = { db: supabase, actor: { id: user.id } };

  const [catRes, profRes, balRes] = await Promise.all([
    getTagCatalog(ctx),
    getMyProfile(ctx),
    getBalance(ctx, { userId: user.id }),
  ]);
  const tagCatalog = (catRes.ok ? catRes.data : []) as TagCatalogItem[];
  const isStaff = profRes.ok && (profRes.data?.role === "staff" || profRes.data?.role === "admin");
  const lifetime = balRes.ok ? balRes.data.lifetimeEarned : 0;
  const gated = !isStaff && lifetime < MIN_LIFETIME_TO_CREATE_COHORT;

  return (
    <AppShell>
    <main className="mx-auto w-full max-w-lg px-6 py-12">
      <h1 className="font-display text-3xl font-semibold text-text">Create a cohort</h1>
      <p className="mt-2 text-muted">
        You&rsquo;ll be its manager and approve who joins.
      </p>

      {gated ? (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <p className="font-medium text-text">Earn {MIN_LIFETIME_TO_CREATE_COHORT} tokens first</p>
          <p className="mt-1 text-sm text-muted">
            Starting a cohort is for engaged members. You&rsquo;ve earned <span className="font-medium text-text">{lifetime}</span> of {MIN_LIFETIME_TO_CREATE_COHORT} tokens — join a project (+50 on completion) or invite a neighbor (+25) to unlock it.
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.round((lifetime / MIN_LIFETIME_TO_CREATE_COHORT) * 100))}%` }} />
          </div>
          <div className="mt-5 flex gap-2">
            <Link href="/cohorts" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Browse cohorts to join</Link>
            <Link href="/dashboard" className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-2">Back to dashboard</Link>
          </div>
        </div>
      ) : (
        <CreateCohortForm error={searchParams.error} tagCatalog={tagCatalog} />
      )}
    </main>
    </AppShell>
  );
}
