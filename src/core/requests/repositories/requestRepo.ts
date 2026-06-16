import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateRequestInput } from "../domain/request";

export function createRequest(db: SupabaseClient, input: CreateRequestInput) {
  return db.rpc("create_service_request", {
    p_cohort: input.cohortId,
    p_title: input.title,
    p_category: input.category ?? null,
    p_description: input.description ?? null,
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
  return db.from("service_requests").select("*").eq("id", id).maybeSingle();
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

export function listParticipants(db: SupabaseClient, requestId: string) {
  return db
    .from("request_participants")
    .select("*")
    .eq("request_id", requestId)
    .eq("status", "joined")
    .order("created_at", { ascending: true });
}
