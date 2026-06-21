import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateCohortInput } from "../domain/cohort";

export function platformPublicStats(db: SupabaseClient) {
  return db.rpc("platform_public_stats");
}

export function createCohort(db: SupabaseClient, input: CreateCohortInput) {
  return db.rpc("create_cohort", {
    p_name: input.name,
    p_handle: input.handle,
    p_description: input.description ?? null,
    p_visibility: input.visibility,
    p_country: input.country,
    p_kind: input.kind,
    p_tags: input.tags,
    p_coverage_zips: input.coverageZips,
    p_city: input.city ?? null,
    p_region: input.region ?? null,
  });
}

export function listTagCatalog(db: SupabaseClient) {
  return db.from("tag_catalog").select("slug, label, kind, sort").order("sort").order("label");
}

export function listMyCohortCards(db: SupabaseClient) {
  return db.rpc("my_cohort_cards");
}

export function getByHandle(db: SupabaseClient, handle: string) {
  return db.from("cohorts").select("*").eq("handle", handle.toLowerCase()).maybeSingle();
}

export function getById(db: SupabaseClient, id: string) {
  return db.from("cohorts").select("id, name, handle, kind").eq("id", id).maybeSingle();
}

export function searchPublic(
  db: SupabaseClient,
  args: { query?: string; limit: number }
) {
  let q = db.from("cohorts").select("*").eq("visibility", "public");
  if (args.query) q = q.ilike("name", `%${args.query}%`);
  return q.order("last_activity_at", { ascending: false }).limit(args.limit);
}

export function discover(
  db: SupabaseClient,
  args: { query?: string; country?: string; zip?: string; tag?: string; scope?: string; limit: number }
) {
  return db.rpc("discover_cohorts", {
    p_query: args.query ?? null,
    p_country: args.country ?? null,
    p_zip: args.zip ?? null,
    p_tag: args.tag ?? null,
    p_scope: args.scope ?? "all",
    p_limit: args.limit,
  });
}

export function requestJoin(
  db: SupabaseClient,
  args: { cohortId: string; answers: unknown }
) {
  return db.rpc("request_join", { p_cohort: args.cohortId, p_answers: args.answers });
}

export function reviewJoin(
  db: SupabaseClient,
  args: { cohortId: string; userId: string; decision: string; message?: string }
) {
  return db.rpc("review_join", {
    p_cohort: args.cohortId,
    p_user: args.userId,
    p_decision: args.decision,
    p_message: args.message ?? null,
  });
}

export function respondInfo(
  db: SupabaseClient,
  args: { cohortId: string; response: string }
) {
  return db.rpc("respond_join_info", {
    p_cohort: args.cohortId,
    p_response: args.response,
  });
}

export function listMyMemberships(db: SupabaseClient, userId: string) {
  return db
    .from("cohort_members")
    .select("status, access_level, info_request, cohort:cohorts(*)")
    .eq("user_id", userId);
}

export function memberDirectory(db: SupabaseClient, cohortId: string) {
  return db.rpc("cohort_member_directory", { p_cohort: cohortId });
}

export function setTitle(
  db: SupabaseClient,
  args: { cohortId: string; userId: string; title: string }
) {
  return db.rpc("set_member_title", {
    p_cohort: args.cohortId,
    p_user: args.userId,
    p_title: args.title,
  });
}

export function setComanager(
  db: SupabaseClient,
  args: { cohortId: string; userId: string; make: boolean }
) {
  return db.rpc("set_cohort_comanager", {
    p_cohort: args.cohortId,
    p_user: args.userId,
    p_make_manager: args.make,
  });
}

export function leaveCohort(db: SupabaseClient, cohortId: string) {
  return db.rpc("leave_cohort", { p_cohort: cohortId });
}

export function updateCohort(
  db: SupabaseClient,
  cohortId: string,
  fields: Record<string, unknown>
) {
  return db.from("cohorts").update(fields).eq("id", cohortId).select();
}

export function listRequests(db: SupabaseClient, cohortId: string) {
  // SECURITY DEFINER fn returns requester display_name/avatar (managers only).
  return db.rpc("cohort_join_requests", { p_cohort: cohortId });
}
