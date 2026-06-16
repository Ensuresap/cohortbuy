"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "@/core/profiles/services/profileService";

export async function completeOnboardingAction(formData: FormData) {
  const supabase = createClient();
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

  const ctx = { db: supabase, actor: { id: user.id } };
  const res = await completeOnboarding(ctx, input);
  if (!res.ok) {
    redirect(`/onboarding?error=${encodeURIComponent(res.error.message)}`);
  }
  redirect("/dashboard");
}
