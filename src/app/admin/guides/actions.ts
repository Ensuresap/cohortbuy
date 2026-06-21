"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { saveGuide, deleteGuide } from "@/core/guides/services/guideService";
import { logAudit } from "@/core/audit/services/auditService";

async function ctxOrLogin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { db: supabase, actor: { id: user.id } };
}

export async function saveGuideAction(formData: FormData) {
  const ctx = await ctxOrLogin();
  const res = await saveGuide(ctx, {
    id: String(formData.get("id") ?? "") || undefined,
    slug: String(formData.get("slug") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "") || undefined,
    category: String(formData.get("category") ?? "") || undefined,
    body: String(formData.get("body") ?? ""),
    readMins: String(formData.get("readMins") ?? "4"),
    status: String(formData.get("status") ?? "draft"),
  });
  if (!res.ok) {
    redirect(`/admin/guides/editor?error=${encodeURIComponent(res.error.message)}${formData.get("id") ? `&id=${formData.get("id")}` : ""}`);
  }
  await logAudit(ctx, { action: "guide_save", targetType: "guide", targetId: res.data.id });
  revalidatePath("/guides");
  revalidatePath(`/guides/${formData.get("slug")}`);
  redirect("/admin/guides");
}

export async function deleteGuideAction(formData: FormData) {
  const ctx = await ctxOrLogin();
  const id = String(formData.get("id") ?? "");
  await deleteGuide(ctx, id);
  await logAudit(ctx, { action: "guide_delete", targetType: "guide", targetId: id });
  revalidatePath("/guides");
  redirect("/admin/guides");
}
