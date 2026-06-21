import type { SupabaseClient } from "@supabase/supabase-js";

const COLS = "id, slug, title, description, category, body, read_mins, status, published_at, updated_at";

export function listPublished(db: SupabaseClient) {
  return db.from("guides").select(COLS).eq("status", "published").order("published_at", { ascending: false });
}

export function getBySlug(db: SupabaseClient, slug: string) {
  return db.from("guides").select(COLS).eq("slug", slug).eq("status", "published").maybeSingle();
}

export function adminList(db: SupabaseClient) {
  return db.from("guides").select(COLS).order("updated_at", { ascending: false });
}

export function adminGet(db: SupabaseClient, id: string) {
  return db.from("guides").select(COLS).eq("id", id).maybeSingle();
}

export function insertGuide(db: SupabaseClient, row: Record<string, unknown>) {
  return db.from("guides").insert(row).select("id").single();
}

export function updateGuide(db: SupabaseClient, id: string, row: Record<string, unknown>) {
  return db.from("guides").update(row).eq("id", id).select("id").single();
}

export function deleteGuide(db: SupabaseClient, id: string) {
  return db.from("guides").delete().eq("id", id);
}
