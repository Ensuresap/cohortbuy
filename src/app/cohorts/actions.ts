"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createCohort,
  requestToJoin,
  reviewJoinRequest,
} from "@/core/cohorts/services/cohortService";

async function getCtx() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { db: supabase, actor: { id: user.id } };
}

export async function createCohortAction(formData: FormData) {
  const ctx = await getCtx();
  const handle = String(formData.get("handle") ?? "").toLowerCase();
  const res = await createCohort(ctx, {
    name: String(formData.get("name") ?? ""),
    handle,
    description: String(formData.get("description") ?? "") || undefined,
    visibility: String(formData.get("visibility") ?? "public"),
    category: String(formData.get("category") ?? "") || undefined,
    country: String(formData.get("country") ?? "US"),
  });
  if (!res.ok) {
    redirect(`/cohorts/new?error=${encodeURIComponent(res.error.message)}`);
  }
  redirect(`/${handle}`);
}

export async function requestJoinAction(formData: FormData) {
  const ctx = await getCtx();
  const handle = String(formData.get("handle") ?? "");
  await requestToJoin(ctx, {
    cohortId: String(formData.get("cohortId") ?? ""),
    note: String(formData.get("note") ?? "") || undefined,
  });
  revalidatePath(`/${handle}`);
}

export async function reviewAction(formData: FormData) {
  const ctx = await getCtx();
  const handle = String(formData.get("handle") ?? "");
  await reviewJoinRequest(ctx, {
    cohortId: String(formData.get("cohortId") ?? ""),
    userId: String(formData.get("userId") ?? ""),
    decision: String(formData.get("decision") ?? "approve") as
      | "approve"
      | "reject"
      | "needs_info",
  });
  revalidatePath(`/${handle}`);
}
