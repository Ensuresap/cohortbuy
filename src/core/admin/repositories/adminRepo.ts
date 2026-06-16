import type { SupabaseClient } from "@supabase/supabase-js";

export function overview(db: SupabaseClient) {
  return db.rpc("admin_overview");
}

export function recentProjects(db: SupabaseClient, limit: number) {
  return db.rpc("admin_recent_projects", { p_limit: limit });
}

export function inactiveCohorts(db: SupabaseClient, days: number) {
  return db.rpc("admin_inactive_cohorts", { p_days: days });
}
