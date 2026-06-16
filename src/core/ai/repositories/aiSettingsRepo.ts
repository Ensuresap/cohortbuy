import type { SupabaseClient } from "@supabase/supabase-js";

export function getGlobal(db: SupabaseClient) {
  return db.from("ai_settings").select("provider, model").eq("id", "global").maybeSingle();
}

export function getCohortOverride(db: SupabaseClient, cohortId: string) {
  return db
    .from("cohort_ai_settings")
    .select("provider, model")
    .eq("cohort_id", cohortId)
    .maybeSingle();
}

export function upsertCohortOverride(
  db: SupabaseClient,
  row: { cohort_id: string; provider: string; model: string; updated_by?: string }
) {
  return db.from("cohort_ai_settings").upsert(row, { onConflict: "cohort_id" });
}

export function upsertGlobal(
  db: SupabaseClient,
  row: { provider: string; model: string; updated_by?: string }
) {
  return db.from("ai_settings").upsert({ id: "global", ...row });
}
