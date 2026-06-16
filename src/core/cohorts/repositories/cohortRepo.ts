import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateCohortInput, MemberStatus } from "../domain/cohort";

export function createCohort(db: SupabaseClient, input: CreateCohortInput) {
  return db.rpc("create_cohort", {
    p_name: input.name,
    p_handle: input.handle,
    p_description: input.description ?? null,
    p_visibility: input.visibility,
    p_category: input.category ?? null,
    p_country: input.country,
  });
}

export function getByHandle(db: SupabaseClient, handle: string) {
  return db.from("cohorts").select("*").eq("handle", handle.toLowerCase()).maybeSingle();
}

export function searchPublic(
  db: SupabaseClient,
  args: { query?: string; limit: number }
) {
  let q = db.from("cohorts").select("*").eq("visibility", "public");
  if (args.query) q = q.ilike("name", `%${args.query}%`);
  return q.order("last_activity_at", { ascending: false }).limit(args.limit);
}

export function insertJoinRequest(
  db: SupabaseClient,
  args: { cohortId: string; userId: string; note?: string }
) {
  return db.from("cohort_members").insert({
    cohort_id: args.cohortId,
    user_id: args.userId,
    access_level: "member",
    status: "requested",
    note: args.note ?? null,
  });
}

export function updateMemberStatus(
  db: SupabaseClient,
  args: { cohortId: string; userId: string; status: MemberStatus; note?: string }
) {
  return db
    .from("cohort_members")
    .update({ status: args.status, note: args.note ?? null, updated_at: new Date().toISOString() })
    .eq("cohort_id", args.cohortId)
    .eq("user_id", args.userId)
    .select();
}

export function listMyMemberships(db: SupabaseClient, userId: string) {
  return db
    .from("cohort_members")
    .select("status, access_level, cohort:cohorts(*)")
    .eq("user_id", userId);
}

export function listRequests(db: SupabaseClient, cohortId: string) {
  return db
    .from("cohort_members")
    .select("*")
    .eq("cohort_id", cohortId)
    .eq("status", "requested")
    .order("created_at", { ascending: true });
}
