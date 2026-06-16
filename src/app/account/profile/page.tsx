import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/core/profiles/services/profileService";
import AppShell from "@/components/app/AppShell";
import ProfileForm from "./ProfileForm";

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getMyProfile({ db: supabase, actor: { id: user.id } });
  const profile = res.ok ? res.data : null;
  if (!profile?.display_name) redirect("/onboarding");

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-lg px-6 py-12">
        <h1 className="font-display text-3xl font-semibold text-text">Edit profile</h1>
        <p className="mt-2 text-muted">Update your details and how we reach you.</p>
        <ProfileForm profile={profile} error={searchParams.error} />
      </main>
    </AppShell>
  );
}
