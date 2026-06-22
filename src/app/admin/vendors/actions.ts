"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addVendor } from "@/core/vendors/services/vendorService";

export async function addVendorAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const ctx = { db: supabase, actor: { id: user.id } };
  await addVendor(ctx, {
    name: String(formData.get("name") ?? ""),
    website: String(formData.get("website") ?? "") || undefined,
    contactEmail: String(formData.get("contactEmail") ?? "") || undefined,
    contactPhone: String(formData.get("contactPhone") ?? "") || undefined,
    categories: String(formData.get("categories") ?? ""),
    coverageZips: String(formData.get("coverageZips") ?? ""),
    notes: String(formData.get("notes") ?? "") || undefined,
    vettingStatus: (String(formData.get("vettingStatus") ?? "unverified") || "unverified") as "unverified" | "vetted",
  });
  revalidatePath("/admin/vendors");
}
