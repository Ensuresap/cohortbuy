import type { SupabaseClient } from "@supabase/supabase-js";
import type { AddQuoteInput } from "../domain/quote";

export function insertQuote(
  db: SupabaseClient,
  input: AddQuoteInput,
  amountCents: number,
  userId: string
) {
  return db.from("quotes").insert({
    request_id: input.requestId,
    vendor_name: input.vendorName,
    amount_cents: amountCents,
    currency: input.currency.toUpperCase(),
    kind: input.kind,
    timeline: input.timeline ?? null,
    warranty: input.warranty ?? null,
    notes: input.notes ?? null,
    created_by: userId,
  });
}

export function updateQuote(
  db: SupabaseClient,
  input: { id: string; vendorName: string; currency: string; timeline?: string; warranty?: string; notes?: string; kind: string },
  amountCents: number
) {
  return db.rpc("update_quote", {
    p_id: input.id,
    p_vendor: input.vendorName,
    p_amount_cents: amountCents,
    p_currency: input.currency.toUpperCase(),
    p_timeline: input.timeline ?? "",
    p_warranty: input.warranty ?? "",
    p_notes: input.notes ?? "",
    p_kind: input.kind,
  });
}

export function deleteQuote(db: SupabaseClient, id: string) {
  return db.rpc("delete_quote", { p_id: id });
}

export function listByRequest(db: SupabaseClient, requestId: string) {
  return db
    .from("quotes")
    .select("*")
    .eq("request_id", requestId)
    .order("amount_cents", { ascending: true });
}
