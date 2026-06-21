"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createServiceRequest,
  joinServiceRequest,
  leaveProject,
  respondJoin,
  setRfqDraft,
  castVote,
  clearVote,
  setAiRecommendation,
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
import { getRequest, listComments } from "@/core/requests/services/requestService";
import { addScopeItem, updateScopeItem, deleteScopeItem, listScope } from "@/core/scope/services/scopeService";
import { addQuote, updateQuote, deleteQuote } from "@/core/quotes/services/quoteService";
import {
  addCandidate,
  setCandidateStatus,
  deleteCandidate,
  setResearch,
  setBenchmark,
  setProductInfo,
  approveShortlist,
} from "@/core/research/services/researchService";
import { estimateBenchmark, estimateProductPrice, suggestVendors, draftRfq, recommendQuote, answerDiscussion } from "@/core/research/services/researchAiService";
import { listQuotes } from "@/core/quotes/services/quoteService";
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
    joinPolicy: (String(formData.get("joinPolicy") ?? "") || undefined) as "auto" | "approval" | undefined,
    decisionPolicy: (String(formData.get("decisionPolicy") ?? "") || undefined) as "coordinator" | "vote" | undefined,
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
    joinPolicy: (String(formData.get("joinPolicy") ?? "") || undefined) as "auto" | "approval" | undefined,
    decisionPolicy: (String(formData.get("decisionPolicy") ?? "") || undefined) as "coordinator" | "vote" | undefined,
  });
  revalidatePath(`/requests/${requestId}`);
}

export async function voteAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  const quoteId = String(formData.get("quoteId") ?? "");
  if (quoteId) await castVote(ctx, { requestId, quoteId });
  else await clearVote(ctx, requestId);
  revalidatePath(`/requests/${requestId}`);
}

export async function aiRecommendQuoteAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  const ctxData = await researchContext(ctx, requestId);
  const quotesRes = await listQuotes(ctx, requestId);
  const quotes = quotesRes.ok ? quotesRes.data : [];
  if (ctxData && quotes.length) {
    const list = quotes
      .map((q, i) => `${i + 1}. ${q.vendor_name} — ${(q.amount_cents / 100).toFixed(0)} ${q.currency}${q.timeline ? `, ${q.timeline}` : ""}${q.warranty ? `, ${q.warranty} warranty` : ""}${q.notes ? ` (${q.notes})` : ""}`)
      .join("\n");
    const context = `${ctxData.context}\n\nQuotes:\n${list}`;
    const rec = await recommendQuote(ctx, { cohortId: ctxData.request.cohort_id, context });
    if (rec.ok) {
      const idx = Math.min(Math.max(rec.data.choice, 1), quotes.length) - 1;
      await setAiRecommendation(ctx, { requestId, quoteId: quotes[idx].id, text: rec.data.rationale });
    }
  }
  revalidatePath(`/requests/${requestId}`);
}

export async function respondJoinAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await respondJoin(ctx, {
    requestId,
    userId: String(formData.get("userId") ?? ""),
    approve: String(formData.get("approve") ?? "") === "true",
  });
  revalidatePath(`/requests/${requestId}`);
}

export async function joinRequestAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await joinServiceRequest(ctx, { requestId });
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/dashboard");
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
  await addComment(ctx, {
    requestId,
    body: String(formData.get("body") ?? ""),
    stage: String(formData.get("stage") ?? "") || undefined,
  });
  revalidatePath(`/requests/${requestId}`);
}

export async function askAiDiscussionAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  const stage = String(formData.get("stage") ?? "") || undefined;
  const question = String(formData.get("body") ?? "").trim();
  if (!question) return;
  // Post the member's question, then an AI reply in the same thread.
  await addComment(ctx, { requestId, body: question, stage, kind: "member" });
  const ctxData = await researchContext(ctx, requestId);
  const commentsRes = await listComments(ctx, requestId);
  const recent = (commentsRes.ok ? commentsRes.data : [])
    .slice(-8)
    .map((c) => `${c.kind === "ai" ? "AI" : c.author_name ?? "Member"}: ${c.body}`)
    .join("\n");
  if (ctxData) {
    const context = `${ctxData.context}\n\nRecent discussion:\n${recent}`;
    const ans = await answerDiscussion(ctx, { cohortId: ctxData.request.cohort_id, context, question });
    if (ans.ok) await addComment(ctx, { requestId, body: ans.data, stage, kind: "ai" });
  }
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
    address: String(formData.get("address") ?? "") || undefined,
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

async function researchContext(ctx: Awaited<ReturnType<typeof getCtx>>, requestId: string) {
  const reqRes = await getRequest(ctx, { requestId });
  const r = reqRes.ok ? reqRes.data : null;
  if (!r) return null;
  const scopeRes = await listScope(ctx, requestId);
  const scope = scopeRes.ok ? scopeRes.data : [];
  const scopeText = scope.map((s) => `- ${s.description}${s.quantity ? ` (${s.quantity})` : ""}`).join("\n") || "(none yet)";
  const loc = [r.cohort?.city, r.cohort?.region].filter(Boolean).join(", ");
  const zips = r.cohort?.coverage_zips?.length ? r.cohort.coverage_zips.join(", ") : "";
  const location = [loc, zips ? `ZIP codes: ${zips}` : ""].filter(Boolean).join(" · ") || "location not specified";
  const context = [
    `Project: ${r.title}`,
    r.category ? `Category: ${r.category}` : "",
    r.description ? `Description: ${r.description}` : "",
    r.driver ? `Why now: ${r.driver}` : "",
    r.cohort?.name ? `Community: ${r.cohort.name}` : "",
    `Location: ${location}`,
    `Group size aim: ${r.min_size}+ homes`,
    `Member scope items:\n${scopeText}`,
  ].filter(Boolean).join("\n");
  return { request: r, context };
}

export async function aiEstimateBenchmarkAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  const ctxData = await researchContext(ctx, requestId);
  if (ctxData) {
    const est = await estimateBenchmark(ctx, { cohortId: ctxData.request.cohort_id, context: ctxData.context });
    if (est.ok) {
      const basis =
        est.data.assumptions.map((a) => `• ${a}`).join("\n") +
        (est.data.rationale ? `\n\n${est.data.rationale}` : "");
      await setBenchmark(ctx, {
        requestId,
        lowCents: Math.round(est.data.low * 100),
        highCents: Math.round(est.data.high * 100),
        currency: est.data.currency,
        basis,
      });
    }
  }
  revalidatePath(`/requests/${requestId}`);
}

export async function setProductInfoAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await setProductInfo(ctx, {
    requestId,
    name: String(formData.get("name") ?? ""),
    url: String(formData.get("url") ?? ""),
    specs: String(formData.get("specs") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
  });
  revalidatePath(`/requests/${requestId}`);
}

export async function aiEstimateProductPriceAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  const r = await getRequest(ctx, { requestId });
  if (r.ok && r.data) {
    const req = r.data;
    const context = [
      `Product: ${req.product_name ?? req.title}`,
      req.product_specs ? `Specs: ${req.product_specs}` : "",
      req.product_url ? `Listing: ${req.product_url}` : "",
      req.category ? `Category: ${req.category}` : "",
      `This is a neighbor group bulk-buy; estimate the typical per-unit retail price.`,
    ].filter(Boolean).join("\n");
    const est = await estimateProductPrice(ctx, { cohortId: req.cohort_id, context });
    if (est.ok) {
      const basis =
        est.data.assumptions.map((a) => `• ${a}`).join("\n") +
        (est.data.rationale ? `\n\n${est.data.rationale}` : "");
      await setBenchmark(ctx, {
        requestId,
        lowCents: Math.round(est.data.low * 100),
        highCents: Math.round(est.data.high * 100),
        currency: est.data.currency,
        basis,
      });
    }
  }
  revalidatePath(`/requests/${requestId}`);
}

export async function aiSuggestVendorsAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  const ctxData = await researchContext(ctx, requestId);
  if (ctxData) {
    const sug = await suggestVendors(ctx, { cohortId: ctxData.request.cohort_id, context: ctxData.context });
    if (sug.ok) {
      for (const v of sug.data.slice(0, 5)) {
        await addCandidate(ctx, {
          requestId,
          name: v.name,
          website: v.website || undefined,
          address: v.address || undefined,
          notes: v.note || undefined,
          source: "ai",
        });
      }
    }
  }
  revalidatePath(`/requests/${requestId}`);
}

export async function aiDraftRfqAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  const ctxData = await researchContext(ctx, requestId);
  if (ctxData) {
    const draft = await draftRfq(ctx, { cohortId: ctxData.request.cohort_id, context: ctxData.context });
    if (draft.ok) await setRfqDraft(ctx, { requestId, text: draft.data });
  }
  revalidatePath(`/requests/${requestId}`);
}

export async function saveRfqDraftAction(formData: FormData) {
  const ctx = await getCtx();
  const requestId = String(formData.get("requestId") ?? "");
  await setRfqDraft(ctx, { requestId, text: String(formData.get("body") ?? "") });
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
