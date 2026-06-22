import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/core/profiles/services/profileService";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getMyProfile({ db: supabase, actor: { id: user.id } });
  const profile = res.ok ? res.data : null;
  if (profile?.display_name) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <h1 className="font-display text-3xl font-semibold text-text">
          Welcome — let&rsquo;s set you up
        </h1>
        <p className="mt-2 text-muted">
          A few details so the agent can reach you when something needs your call.
        </p>
        <OnboardingForm error={searchParams.error} />
      </div>
    </main>
  );
}
