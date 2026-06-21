import type { SupabaseClient } from "@supabase/supabase-js";

export function recordAudit(
  db: SupabaseClient,
  args: { action: string; targetType: string; targetId: string; metadata: Record<string, unknown> }
) {
  return db.rpc("record_audit", {
    p_action: args.action,
    p_target_type: args.targetType,
    p_target_id: args.targetId,
    p_meta: args.metadata,
  });
}

export function adminAuditLog(db: SupabaseClient, limit: number) {
  return db.rpc("admin_audit_log", { p_limit: limit });
}
