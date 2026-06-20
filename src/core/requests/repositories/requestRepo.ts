import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateRequestInput } from "../domain/request";

export function createRequest(db: SupabaseClient, input: CreateRequestInput) {
  return db.rpc("create_service_request", {
    p_cohort: input.cohortId,
    p_title: input.title,
    p_category: input.category ?? null,
    p_description: input.description ?? null,
    p_driver: input.driver ?? null,
    p_target: input.targetDate || null,
    p_deadline: input.joinDeadline || null,
    p_type: input.projectType ?? "service",
    p_service_scope: input.serviceScope ?? "service",
    p_split: input.splitMethod ?? "even",
    p_locked: input.locked ?? false,
    p_join_policy: input.joinPolicy ?? "auto",
    p_decision_policy: input.decisionPolicy ?? "coordinator",
    p_min_size: input.minSize,
  });
}

export function listByCohort(db: SupabaseClient, cohortId: string) {
  return db
    .from("service_requests")
    .select("*")
    .eq("cohort_id", cohortId)
    .order("last_activity_at", { ascending: false });
}

export function getById(db: SupabaseClient, id: string) {
  return db
    .from("service_requests")
    .select("*, cohort:cohorts(handle, name, city, region, coverage_zips)")
    .eq("id", id)
    .maybeSingle();
}

export function insertComment(
  db: SupabaseClient,
  args: { requestId: string; userId: string; body: string; stage?: string; kind?: string }
) {
  return db.from("request_comments").insert({
    request_id: args.requestId,
    user_id: args.userId,
    body: args.body,
    stage: args.stage ?? null,
    kind: args.kind ?? "member",
  });
}

export function commentsFeed(db: SupabaseClient, requestId: string) {
  return db.rpc("request_comments_feed", { p_request: requestId });
}

export function updateComment(db: SupabaseClient, args: { id: string; body: string }) {
  return db.rpc("update_comment", { p_id: args.id, p_body: args.body });
}

export function deleteComment(db: SupabaseClient, id: string) {
  return db.rpc("delete_comment", { p_id: id });
}

export function projectTeaser(db: SupabaseClient, requestId: string) {
  return db.rpc("project_teaser", { p_request: requestId });
}

export function projectTeaserBySlug(db: SupabaseClient, slug: string) {
  return db.rpc("project_teaser_by_slug", { p_slug: slug });
}

export function selectQuote(db: SupabaseClient, quoteId: string) {
  return db.rpc("select_quote", { p_quote: quoteId });
}

export function setContract(
  db: SupabaseClient,
  args: { requestId: string; url: string; note: string }
) {
  return db.rpc("set_contract", { p_request: args.requestId, p_url: args.url, p_note: args.note });
}

export function generateCostShares(db: SupabaseClient, requestId: string) {
  return db.rpc("generate_cost_shares", { p_request: requestId });
}

export function setSharePaid(db: SupabaseClient, args: { shareId: string; paid: boolean }) {
  return db.rpc("set_share_paid", { p_share: args.shareId, p_paid: args.paid });
}

export function setProjectTerms(
  db: SupabaseClient,
  args: { requestId: string; contractStructure: string; paymentMode: string }
) {
  return db.rpc("set_project_terms", {
    p_request: args.requestId,
    p_structure: args.contractStructure,
    p_payment: args.paymentMode,
  });
}

export function completeProject(
  db: SupabaseClient,
  args: { requestId: string; note: string }
) {
  return db.rpc("complete_project", { p_request: args.requestId, p_note: args.note });
}

export function costSharesFeed(db: SupabaseClient, requestId: string) {
  return db.rpc("cost_shares_feed", { p_request: requestId });
}

export function listMyParticipations(db: SupabaseClient, userId: string) {
  return db
    .from("request_participants")
    .select("role, request:service_requests(id, title, status, cohort:cohorts(handle, name))")
    .eq("user_id", userId)
    .eq("status", "joined")
    .order("created_at", { ascending: false });
}

export function joinRequest(
  db: SupabaseClient,
  args: { requestId: string; userId: string; status: string }
) {
  return db.from("request_participants").insert({
    request_id: args.requestId,
    user_id: args.userId,
    role: "participant",
    status: args.status,
  });
}

export function castVote(db: SupabaseClient, args: { requestId: string; quoteId: string }) {
  return db.rpc("cast_vote", { p_request: args.requestId, p_quote: args.quoteId });
}
export function clearVote(db: SupabaseClient, requestId: string) {
  return db.rpc("clear_vote", { p_request: requestId });
}
export function myVote(db: SupabaseClient, requestId: string) {
  return db.rpc("my_vote", { p_request: requestId });
}
export function voteTally(db: SupabaseClient, requestId: string) {
  return db.rpc("vote_tally", { p_request: requestId });
}
export function setAiRecommendation(db: SupabaseClient, args: { requestId: string; quoteId: string; text: string }) {
  return db.rpc("set_ai_recommendation", { p_request: args.requestId, p_quote: args.quoteId, p_text: args.text });
}

export function setRfqDraft(db: SupabaseClient, args: { requestId: string; text: string }) {
  return db.rpc("set_rfq_draft", { p_request: args.requestId, p_text: args.text });
}

export function myParticipation(db: SupabaseClient, requestId: string) {
  return db.rpc("my_participation", { p_request: requestId });
}

export function joinRequestFeed(db: SupabaseClient, requestId: string) {
  return db.rpc("request_join_feed", { p_request: requestId });
}

export function respondJoin(db: SupabaseClient, args: { requestId: string; userId: string; approve: boolean }) {
  return db.rpc("respond_join", { p_request: args.requestId, p_user: args.userId, p_approve: args.approve });
}

export function updateProject(
  db: SupabaseClient,
  args: {
    requestId: string;
    title: string;
    category: string | null;
    description: string | null;
    driver: string | null;
    targetDate: string | null;
    serviceScope: string;
    splitMethod: string;
    minSize: number;
    locked: boolean;
    joinPolicy: string;
    decisionPolicy: string;
  }
) {
  return db
    .from("service_requests")
    .update({
      title: args.title,
      category: args.category,
      description: args.description,
      driver: args.driver,
      target_date: args.targetDate,
      service_scope: args.serviceScope,
      split_method: args.splitMethod,
      min_size: args.minSize,
      locked: args.locked,
      join_policy: args.joinPolicy,
      decision_policy: args.decisionPolicy,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", args.requestId)
    .select();
}

/** Mark the signed-in user's participation as left (RLS: own row only). */
export function leaveRequest(db: SupabaseClient, args: { requestId: string; userId: string }) {
  return db
    .from("request_participants")
    .update({ status: "left" })
    .eq("request_id", args.requestId)
    .eq("user_id", args.userId)
    .select();
}

export function updateStatus(
  db: SupabaseClient,
  args: { requestId: string; status: string }
) {
  return db
    .from("service_requests")
    .update({ status: args.status, last_activity_at: new Date().toISOString() })
    .eq("id", args.requestId)
    .select();
}

export function participantsFeed(db: SupabaseClient, requestId: string) {
  return db.rpc("request_participants_feed", { p_request: requestId });
}

export function setParticipantRole(
  db: SupabaseClient,
  args: { requestId: string; userId: string; role: string }
) {
  return db.rpc("set_participant_role", {
    p_request: args.requestId,
    p_user: args.userId,
    p_role: args.role,
  });
}

export function setAgreedAmount(
  db: SupabaseClient,
  args: { requestId: string; amountCents: number; currency: string }
) {
  return db.rpc("set_agreed_amount", {
    p_request: args.requestId,
    p_amount_cents: args.amountCents,
    p_currency: args.currency,
  });
}

export function listParticipants(db: SupabaseClient, requestId: string) {
  return db
    .from("request_participants")
    .select("*")
    .eq("request_id", requestId)
    .eq("status", "joined")
    .order("created_at", { ascending: true });
}
