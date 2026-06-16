import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreateCohortForm from "./CreateCohortForm";

export default async function NewCohortPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-12">
      <h1 className="font-display text-3xl font-semibold text-text">Create a cohort</h1>
      <p className="mt-2 text-muted">
        You&rsquo;ll be its manager and approve who joins.
      </p>
      <CreateCohortForm error={searchParams.error} />
    </main>
  );
}
