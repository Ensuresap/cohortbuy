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
    .select("*, cohort:cohorts(handle, name)")
    .eq("id", id)
    .maybeSingle();
}

export function insertComment(
  db: SupabaseClient,
  args: { requestId: string; userId: string; body: string }
) {
  return db.from("request_comments").insert({
    request_id: args.requestId,
    user_id: args.userId,
    body: args.body,
  });
}

export function commentsFeed(db: SupabaseClient, requestId: string) {
  return db.rpc("request_comments_feed", { p_request: requestId });
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
  args: { requestId: string; userId: string }
) {
  return db.from("request_participants").insert({
    request_id: args.requestId,
    user_id: args.userId,
    role: "participant",
    status: "joined",
  });
}

export function updateProject(
  db: SupabaseClient,
  args: { requestId: string; title: string; category: string | null; description: string | null; driver: string | null; targetDate: string | null }
) {
  return db
    .from("service_requests")
    .update({
      title: args.title,
      category: args.category,
      description: args.description,
      driver: args.driver,
      target_date: args.targetDate,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", args.requestId)
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

export function listParticipants(db: SupabaseClient, requestId: string) {
  return db
    .from("request_participants")
    .select("*")
    .eq("request_id", requestId)
    .eq("status", "joined")
    .order("created_at", { ascending: true });
}
