import type { Ctx } from "../../context";
import * as repo from "../repositories/adminRepo";
import { ok, err, type Result } from "../../result";
import type {
  AdminOverview,
  AdminRecentProject,
  AdminInactiveCohort,
  AdminVendorLead,
  AdminWaitlistEntry,
} from "../domain/admin";

function mapErr(message?: string) {
  if (message?.includes("forbidden")) return err("forbidden", "Platform staff only");
  return err("db_error", message ?? "Unknown error");
}

export async function getOverview(ctx: Ctx): Promise<Result<AdminOverview>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.overview(ctx.db);
  if (error) return mapErr(error.message);
  return ok(data as AdminOverview);
}

export async function getRecentProjects(
  ctx: Ctx,
  limit = 12
): Promise<Result<AdminRecentProject[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.recentProjects(ctx.db, limit);
  if (error) return mapErr(error.message);
  return ok((data ?? []) as AdminRecentProject[]);
}

export async function getInactiveCohorts(
  ctx: Ctx,
  days = 30
): Promise<Result<AdminInactiveCohort[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.inactiveCohorts(ctx.db, days);
  if (error) return mapErr(error.message);
  return ok((data ?? []) as AdminInactiveCohort[]);
}

export async function getVendorLeads(ctx: Ctx, limit = 50): Promise<Result<AdminVendorLead[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.vendorLeads(ctx.db, limit);
  if (error) return mapErr(error.message);
  return ok((data ?? []) as AdminVendorLead[]);
}

export async function getWaitlist(ctx: Ctx, limit = 100): Promise<Result<AdminWaitlistEntry[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.waitlist(ctx.db, limit);
  if (error) return mapErr(error.message);
  return ok((data ?? []) as AdminWaitlistEntry[]);
}
