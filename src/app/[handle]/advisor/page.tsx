import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCohortByHandle, listMyCohorts } from "@/core/cohorts/services/cohortService";
import AppShell from "@/components/app/AppShell";
import AdvisorChat from "@/components/app/AdvisorChat";

export const dynamic = "force-dynamic";

export default async function AdvisorPage(props: { params: Promise<{ handle: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ctx = { db: supabase, actor: { id: user.id } };

  const cohortRes = await getCohortByHandle(ctx, { handle: params.handle });
  const cohort = cohortRes.ok ? cohortRes.data : null;
  if (!cohort) notFound();

  const mineRes = await listMyCohorts(ctx);
  const mine = (mineRes.ok ? mineRes.data : []) as Array<{ status: string; cohort: { id: string } | null }>;
  const approved = mine.some((m) => m.cohort?.id === cohort.id && m.status === "approved");
  if (!approved) redirect(`/${cohort.handle}`);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <Link href={`/${cohort.handle}`} className="text-sm text-subtle hover:text-primary">
          ← {cohort.name}
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-text">Project advisor</h1>
            <p className="text-sm text-muted">Shape an idea into a project — I&rsquo;ll check the fit first.</p>
          </div>
        </div>

        <div className="mt-6">
          <AdvisorChat cohortId={cohort.id} handle={cohort.handle} />
        </div>
      </main>
    </AppShell>
  );
}
