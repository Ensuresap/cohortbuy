import type { Ctx } from "../../context";
import { AddVendorInput, type Vendor } from "../domain/vendor";
import * as repo from "../repositories/vendorRepo";
import { ok, err, type Result } from "../../result";

/** Staff-only: add a vendor to the platform registry. */
export async function addVendor(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = AddVendorInput.safeParse(raw);
  if (!p.success) return err("invalid_input", p.error.issues[0]?.message ?? "Invalid");
  const { error } = await repo.insertVendor(ctx.db, p.data, ctx.actor.id);
  if (error) {
    if (error.message?.toLowerCase().includes("row-level security")) return err("forbidden", "Platform staff only");
    return err("db_error", error.message);
  }
  return ok(true);
}

export async function listVendors(ctx: Ctx): Promise<Result<Vendor[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.listVendors(ctx.db);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as Vendor[]);
}

export async function searchVendors(ctx: Ctx, category: string): Promise<Result<Vendor[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  if (!category) return listVendors(ctx);
  const { data, error } = await repo.searchByCategory(ctx.db, category);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as Vendor[]);
}
