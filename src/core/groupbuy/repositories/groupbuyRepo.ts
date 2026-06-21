import type { SupabaseClient } from "@supabase/supabase-js";

export function listVariants(db: SupabaseClient, requestId: string) {
  return db
    .from("group_buy_variants")
    .select("id, request_id, label, specs, unit_price_cents, currency, sort")
    .eq("request_id", requestId)
    .order("sort", { ascending: true });
}

export function listOrders(db: SupabaseClient, requestId: string) {
  return db
    .from("group_buy_orders")
    .select("id, user_id, variant_id, quantity, profile:profiles(display_name, avatar_url)")
    .eq("request_id", requestId);
}

export function setVariant(
  db: SupabaseClient,
  args: { requestId: string; id: string | null; label: string; specs: string; priceCents: number | null; currency: string }
) {
  return db.rpc("set_group_buy_variant", {
    p_request: args.requestId,
    p_id: args.id,
    p_label: args.label,
    p_specs: args.specs,
    p_price_cents: args.priceCents,
    p_currency: args.currency,
  });
}

export function deleteVariant(db: SupabaseClient, id: string) {
  return db.rpc("delete_group_buy_variant", { p_id: id });
}

export function setMyOrder(db: SupabaseClient, variantId: string, qty: number) {
  return db.rpc("set_my_order", { p_variant: variantId, p_qty: qty });
}

export function generateShares(db: SupabaseClient, requestId: string) {
  return db.rpc("generate_group_buy_shares", { p_request: requestId });
}
