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
  assignRole,
  setProjectAmount,
  updateComment,
  deleteComment,
} from "@/core/requests/services/requestService";
import { addScopeItem, updateScopeItem, deleteScopeItem } from "@/core/scope/services/scopeService";
import { addQuote, updateQuote, deleteQuote } from "@/core/quotes/services/quoteService";
import {
  addCandidate,
  setCandidateStatus,
  deleteCandidate,
  setResearch,
  approveShortlist,
} from "@/core/research/services/researchService";
import { createPost } from "@/core/posts/services/postService";

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
    joinDeadline: String(formData.get("joinDeadline") ?? "") || undefined,
    projectType: (String(formData.get("projectType") ?? "") || undefined) as
      | "service"
      | "group_buy"
      | undefined,
    serviceScope: (String(formData.get("serviceScope") ?? "") || undefined) as
      | "service"
      | "equipment"
      | "both"
      | undefined,
    splitMethod: (String(formData.get("splitMethod") ?? "") || undefined) as
      | "even"
      | "by_quantity"
      | "by_usage"
      | "custom"
      | undefined,
    minSize: Number(formData.get("minSize")) || undefined,
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
    serviceScope: (String(formData.get("serviceScope") ?? "") || undefined) as
      | "service"
      | "equipment"
      | "both"
      | undefined,
    splitMethod: (String(formData.get("splitMethod") ?? "") || undefined) as
      | "even"
      | "by_quantity"
      | "by_usage"
      | "custom"
      | undefined,
    minSize: Number(formData.get("minSize")) || undefined,
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

export async function announceProjectAction(formData: FormData) {
  const ctx = await getCtx();
  const cohortId = String(formData.get("cohortId") ?? "");
  const requestId = String(formData.get("requestId") ?? "");
  const handle = String(formData.get("handle") ?? "");
  const title = String(formData.get("title") ?? "a new project");
  const url = String(formData.get("url") ?? `/requests/${requestId}`);
  const body = `📣 New project: ${title}\n\nA few of us are teaming up to get a better group price — the more neighbors who join, the bigger the saving. Tap to take a look and count yourself in:\n${url}`;
  await createPost(ctx, { cohortId, body, visibility: "members" });
  revalidatePath(`/${handle}`);
  revalidatePath(`/requests/${requestId}`);
}

export async function assignRoleAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await assignRole(ctx, {
    requestId,
    userId: String(formData.get("userId") ?? ""),
    role: String(formData.get("role") ?? "participant"),
  });
  revalidatePath(`/requests/${requestId}`);
}

export async function setAgreedAmountAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await setProjectAmount(ctx, {
    requestId,
    amount: String(formData.get("amount") ?? "0"),
    currency: String(formData.get("currency") ?? "USD"),
  });
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
  const status = String(formData.get("status") ?? "");
  const res = await advanceStatus(ctx, { requestId, status });
  revalidatePath(`/requests/${requestId}`);
  // Land the coordinator on the new stage's tab.
  if (res.ok && status) redirect(`/requests/${requestId}?step=${status}`);
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

export async function updateScopeAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await updateScopeItem(ctx, {
    id: String(formData.get("id") ?? ""),
    description: String(formData.get("description") ?? ""),
    quantity: String(formData.get("quantity") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  revalidatePath(`/requests/${requestId}`);
}

export async function deleteScopeAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await deleteScopeItem(ctx, String(formData.get("id") ?? ""));
  revalidatePath(`/requests/${requestId}`);
}

export async function updateQuoteAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await updateQuote(ctx, {
    id: String(formData.get("id") ?? ""),
    vendorName: String(formData.get("vendorName") ?? ""),
    amount: String(formData.get("amount") ?? "0"),
    currency: String(formData.get("currency") ?? "USD"),
    timeline: String(formData.get("timeline") ?? "") || undefined,
    warranty: String(formData.get("warranty") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
    kind: String(formData.get("kind") ?? "indicative"),
  });
  revalidatePath(`/requests/${requestId}`);
}

export async function deleteQuoteAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await deleteQuote(ctx, String(formData.get("id") ?? ""));
  revalidatePath(`/requests/${requestId}`);
}

export async function updateCommentAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await updateComment(ctx, { id: String(formData.get("id") ?? ""), body: String(formData.get("body") ?? "") });
  revalidatePath(`/requests/${requestId}`);
}

export async function deleteCommentAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await deleteComment(ctx, String(formData.get("id") ?? ""));
  revalidatePath(`/requests/${requestId}`);
}

export async function addCandidateAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await addCandidate(ctx, {
    requestId,
    name: String(formData.get("name") ?? ""),
    contact: String(formData.get("contact") ?? "") || undefined,
    website: String(formData.get("website") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
    source: (String(formData.get("source") ?? "member") || "member") as "member" | "registry" | "ai" | "web",
    vendorId: String(formData.get("vendorId") ?? "") || undefined,
  });
  revalidatePath(`/requests/${requestId}`);
}

export async function setCandidateStatusAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await setCandidateStatus(ctx, {
    id: String(formData.get("id") ?? ""),
    status: String(formData.get("status") ?? "considering"),
  });
  revalidatePath(`/requests/${requestId}`);
}

export async function deleteCandidateAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await deleteCandidate(ctx, String(formData.get("id") ?? ""));
  revalidatePath(`/requests/${requestId}`);
}

export async function setResearchAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await setResearch(ctx, {
    requestId,
    low: String(formData.get("low") ?? "0"),
    high: String(formData.get("high") ?? "0"),
    currency: String(formData.get("currency") ?? "USD"),
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  revalidatePath(`/requests/${requestId}`);
}

export async function approveShortlistAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await approveShortlist(ctx, requestId);
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
