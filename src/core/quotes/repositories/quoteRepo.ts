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

export function listByRequest(db: SupabaseClient, requestId: string) {
  return db
    .from("quotes")
    .select("*")
    .eq("request_id", requestId)
    .order("amount_cents", { ascending: true });
}
