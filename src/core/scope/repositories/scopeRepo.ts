import type { SupabaseClient } from "@supabase/supabase-js";
import type { AddScopeInput } from "../domain/scope";

export function insertScope(
  db: SupabaseClient,
  input: AddScopeInput,
  userId: string
) {
  return db.from("scope_items").insert({
    request_id: input.requestId,
    user_id: userId,
    description: input.description,
    quantity: input.quantity ?? null,
    notes: input.notes ?? null,
  });
}

export function updateScope(
  db: SupabaseClient,
  input: { id: string; description: string; quantity?: string; notes?: string }
) {
  return db.rpc("update_scope_item", {
    p_id: input.id,
    p_description: input.description,
    p_quantity: input.quantity ?? "",
    p_notes: input.notes ?? "",
  });
}

export function deleteScope(db: SupabaseClient, id: string) {
  return db.rpc("delete_scope_item", { p_id: id });
}

export function listByRequest(db: SupabaseClient, requestId: string) {
  return db
    .from("scope_items")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
}
