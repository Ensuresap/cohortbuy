"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requestAccountDeletion } from "@/core/profiles/services/profileService";
import { logAudit } from "@/core/audit/services/auditService";

export async function deleteAccountAction(formData: FormData) {
  const confirm = String(formData.get("confirm") ?? "");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (confirm !== "DELETE") {
    redirect("/account?delete=confirm");
  }
  const ctx = { db: supabase, actor: { id: user.id } };
  const res = await requestAccountDeletion(ctx);
  if (!res.ok) {
    redirect(res.error.code === "reassign_first" ? "/account?delete=reassign" : "/account?delete=error");
  }
  await logAudit(ctx, { action: "account_deletion", targetType: "self", targetId: user.id });
  await supabase.auth.signOut();
  redirect("/?closed=1");
}
