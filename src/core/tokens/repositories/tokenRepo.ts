import type { SupabaseClient } from "@supabase/supabase-js";

export function applyTx(
  db: SupabaseClient,
  args: {
    userId: string;
    amount: number;
    type: "earn" | "grant" | "spend" | "adjust";
    reason: string;
    createdBy: string;
    ref?: Record<string, unknown>;
  }
) {
  return db.rpc("apply_token_tx", {
    p_user: args.userId,
    p_amount: args.amount,
    p_type: args.type,
    p_reason: args.reason,
    p_created_by: args.createdBy,
    p_ref: args.ref ?? {},
  });
}

export function getAccount(db: SupabaseClient, userId: string) {
  return db
    .from("token_accounts")
    .select("balance, lifetime_earned")
    .eq("user_id", userId)
    .maybeSingle();
}
