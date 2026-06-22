"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "@/core/profiles/services/profileService";

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const input = {
    displayName: String(formData.get("displayName") ?? ""),
    phone: (String(formData.get("phone") ?? "").trim() || undefined) as string | undefined,
    smsOptIn: formData.get("smsOptIn") === "on",
    preferredChannel: String(formData.get("preferredChannel") ?? "sms"),
    country: String(formData.get("country") ?? "US"),
  };

  const res = await completeOnboarding({ db: supabase, actor: { id: user.id } }, input);
  if (!res.ok) {
    redirect(`/account/profile?error=${encodeURIComponent(res.error.message)}`);
  }
  redirect("/account");
}
