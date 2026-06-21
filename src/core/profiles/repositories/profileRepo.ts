import type { SupabaseClient } from "@supabase/supabase-js";

export function getById(db: SupabaseClient, id: string) {
  return db.from("profiles").select("*").eq("id", id).maybeSingle();
}

export function exportMyData(db: SupabaseClient) {
  return db.rpc("export_my_data");
}

export function requestAccountDeletion(db: SupabaseClient) {
  return db.rpc("request_account_deletion");
}

export function touchLastSeen(db: SupabaseClient, userId: string) {
  return db
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", userId);
}

export function upsertProfile(
  db: SupabaseClient,
  row: Record<string, unknown> & { id: string }
) {
  return db.from("profiles").upsert(row);
}

export function setLocation(
  db: SupabaseClient,
  userId: string,
  fields: { postal_code: string; city?: string | null; country?: string }
) {
  return db.from("profiles").update(fields).eq("id", userId);
}
