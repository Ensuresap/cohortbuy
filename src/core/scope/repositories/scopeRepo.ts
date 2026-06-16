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

export function listByRequest(db: SupabaseClient, requestId: string) {
  return db
    .from("scope_items")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
}
