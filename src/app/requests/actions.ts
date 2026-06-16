"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createServiceRequest,
  joinServiceRequest,
  advanceStatus,
} from "@/core/requests/services/requestService";
import { addScopeItem } from "@/core/scope/services/scopeService";

async function getCtx() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { db: supabase, actor: { id: user.id } };
}

export async function createRequestAction(formData: FormData) {
  const ctx = await getCtx();
  const handle = String(formData.get("handle") ?? "");
  const res = await createServiceRequest(ctx, {
    cohortId: String(formData.get("cohortId") ?? ""),
    title: String(formData.get("title") ?? ""),
    category: String(formData.get("category") ?? "") || undefined,
    description: String(formData.get("description") ?? "") || undefined,
  });
  if (!res.ok) {
    redirect(`/${handle}?error=${encodeURIComponent(res.error.message)}`);
  }
  redirect(`/requests/${res.data.requestId}`);
}

export async function joinRequestAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await joinServiceRequest(ctx, { requestId });
  revalidatePath(`/requests/${requestId}`);
}

export async function addScopeAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await addScopeItem(ctx, {
    requestId,
    description: String(formData.get("description") ?? ""),
    quantity: String(formData.get("quantity") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  revalidatePath(`/requests/${requestId}`);
}

export async function advanceRequestAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await advanceStatus(ctx, {
    requestId,
    status: String(formData.get("status") ?? ""),
  });
  revalidatePath(`/requests/${requestId}`);
}
