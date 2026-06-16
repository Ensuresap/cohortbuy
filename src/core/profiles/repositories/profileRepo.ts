import type { SupabaseClient } from "@supabase/supabase-js";

export function getById(db: SupabaseClient, id: string) {
  return db.from("profiles").select("*").eq("id", id).maybeSingle();
}

export function upsertProfile(
  db: SupabaseClient,
  row: Record<string, unknown> & { id: string }
) {
  return db.from("profiles").upsert(row);
}
