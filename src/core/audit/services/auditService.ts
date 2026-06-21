import type { Ctx } from "../../context";
import { ok, err, type Result } from "../../result";
import * as repo from "../repositories/auditRepo";

export interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Append a sensitive-action entry to the audit log. Best-effort; never throws. */
export async function logAudit(
  ctx: Ctx,
  args: { action: string; targetType?: string; targetId?: string; metadata?: Record<string, unknown> }
): Promise<void> {
  if (!ctx.db) return;
  try {
    await repo.recordAudit(ctx.db, {
      action: args.action,
      targetType: args.targetType ?? "",
      targetId: args.targetId ?? "",
      metadata: args.metadata ?? {},
    });
  } catch {
    /* auditing must never break the user action */
  }
}

/** Read the audit log (platform staff only, enforced in SQL). */
export async function getAuditLog(ctx: Ctx, limit = 100): Promise<Result<AuditEntry[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.adminAuditLog(ctx.db, limit);
  if (error) {
    if (error.message?.includes("forbidden")) return err("forbidden", "Platform staff only");
    return err("db_error", error.message);
  }
  return ok((data ?? []) as AuditEntry[]);
}
