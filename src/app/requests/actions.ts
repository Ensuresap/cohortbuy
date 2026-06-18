"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createServiceRequest,
  joinServiceRequest,
  leaveProject,
  advanceStatus,
  addComment,
  editProject,
  selectWinningQuote,
  recordContract,
  setProjectTerms,
  generateCostShares,
  setSharePaid,
  completeProject,
} from "@/core/requests/services/requestService";
import { addScopeItem } from "@/core/scope/services/scopeService";
import { addQuote } from "@/core/quotes/services/quoteService";

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
    driver: String(formData.get("driver") ?? "") || undefined,
    targetDate: String(formData.get("targetDate") ?? "") || undefined,
    locked: formData.get("locked") === "on" || formData.get("locked") === "true",
  });
  if (!res.ok) {
    redirect(`/${handle}?error=${encodeURIComponent(res.error.message)}`);
  }
  redirect(`/requests/${res.data.requestId}`);
}

export async function updateProjectAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await editProject(ctx, {
    requestId,
    title: String(formData.get("title") ?? ""),
    category: String(formData.get("category") ?? "") || undefined,
    description: String(formData.get("description") ?? "") || undefined,
    driver: String(formData.get("driver") ?? "") || undefined,
    targetDate: String(formData.get("targetDate") ?? "") || undefined,
    locked: formData.get("locked") === "on" || formData.get("locked") === "true",
  });
  revalidatePath(`/requests/${requestId}`);
}

export async function joinRequestAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await joinServiceRequest(ctx, { requestId });
  revalidatePath(`/requests/${requestId}`);
}

export async function leaveProjectAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await leaveProject(ctx, { requestId });
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

export async function addCommentAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await addComment(ctx, { requestId, body: String(formData.get("body") ?? "") });
  revalidatePath(`/requests/${requestId}`);
}

export async function selectQuoteAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await selectWinningQuote(ctx, { quoteId: String(formData.get("quoteId") ?? "") });
  revalidatePath(`/requests/${requestId}`);
}

export async function setTermsAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await setProjectTerms(ctx, {
    requestId,
    contractStructure: String(formData.get("contractStructure") ?? "individual"),
    paymentMode: String(formData.get("paymentMode") ?? "individual_direct"),
  });
  revalidatePath(`/requests/${requestId}`);
}

export async function recordContractAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await recordContract(ctx, {
    requestId,
    url: String(formData.get("url") ?? ""),
    note: String(formData.get("note") ?? "") || undefined,
  });
  revalidatePath(`/requests/${requestId}`);
}

export async function generateCostSharesAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await generateCostShares(ctx, { requestId });
  revalidatePath(`/requests/${requestId}`);
}

export async function setSharePaidAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await setSharePaid(ctx, {
    shareId: String(formData.get("shareId") ?? ""),
    paid: String(formData.get("paid") ?? "") === "true",
  });
  revalidatePath(`/requests/${requestId}`);
}

export async function completeProjectAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await completeProject(ctx, {
    requestId,
    note: String(formData.get("note") ?? "") || undefined,
  });
  revalidatePath(`/requests/${requestId}`);
}

export async function addQuoteAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await addQuote(ctx, {
    requestId,
    vendorName: String(formData.get("vendorName") ?? ""),
    amount: String(formData.get("amount") ?? "0"),
    currency: String(formData.get("currency") ?? "USD").toUpperCase(),
    timeline: String(formData.get("timeline") ?? "") || undefined,
    warranty: String(formData.get("warranty") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
    kind: String(formData.get("kind") ?? "indicative"),
  });
  revalidatePath(`/requests/${requestId}`);
}
