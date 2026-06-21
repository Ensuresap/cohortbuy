import type { Ctx } from "../context";
import { VendorLeadInput } from "../domain/vendorLead";
import * as repo from "../repositories/vendorLeadRepo";
import { ok, err, type Result } from "../result";

/** Capture an inbound vendor/seller lead from the public "For vendors" page. */
export async function submitVendorLead(ctx: Ctx, raw: unknown): Promise<Result<{ business: string }>> {
  const parsed = VendorLeadInput.safeParse(raw);
  if (!parsed.success) {
    return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { error } = await repo.insertLead(ctx.db, parsed.data);
  if (error) return err("db_error", error.message);
  return ok({ business: parsed.data.business });
}
