import type { Ctx } from "../../context";
import { ok, err, type Result } from "../../result";
import * as repo from "../repositories/groupbuyRepo";
import {
  SetVariantInput,
  DeleteVariantInput,
  SetOrderInput,
  type GroupBuyVariant,
  type DealSummary,
  type VariantWithStats,
} from "../domain/groupbuy";

/** Full deal view for a group-buy project: variants + demand rollup + my orders. */
export async function getDeal(ctx: Ctx, requestId: string): Promise<Result<DealSummary>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const me = ctx.actor?.id ?? "";
  const [vRes, oRes] = await Promise.all([
    repo.listVariants(ctx.db, requestId),
    repo.listOrders(ctx.db, requestId),
  ]);
  if (vRes.error) return err("db_error", vRes.error.message);
  if (oRes.error) return err("db_error", oRes.error.message);

  const variants = (vRes.data ?? []) as GroupBuyVariant[];
  const orders = (oRes.data ?? []) as Array<{ user_id: string; variant_id: string; quantity: number }>;

  const qtyByVariant = new Map<string, number>();
  const myOrders: Record<string, number> = {};
  const buyerSet = new Set<string>();
  for (const o of orders) {
    qtyByVariant.set(o.variant_id, (qtyByVariant.get(o.variant_id) ?? 0) + o.quantity);
    if (o.quantity > 0) buyerSet.add(o.user_id);
    if (o.user_id === me) myOrders[o.variant_id] = o.quantity;
  }

  let totalUnits = 0;
  let totalValueCents = 0;
  const withStats: VariantWithStats[] = variants.map((v) => {
    const committed = qtyByVariant.get(v.id) ?? 0;
    const lineTotal = committed * (v.unit_price_cents ?? 0);
    totalUnits += committed;
    totalValueCents += lineTotal;
    return { ...v, committed_qty: committed, line_total_cents: lineTotal };
  });

  return ok({
    variants: withStats,
    myOrders,
    totalUnits,
    totalValueCents,
    currency: variants[0]?.currency ?? "USD",
    buyers: buyerSet.size,
  });
}

export async function setVariant(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = SetVariantInput.safeParse(raw);
  if (!p.success) return err("invalid_input", "Check the variant fields");
  const { error } = await repo.setVariant(ctx.db, {
    requestId: p.data.requestId,
    id: p.data.id ?? null,
    label: p.data.label,
    specs: p.data.specs ?? "",
    priceCents: p.data.priceCents ?? null,
    currency: p.data.currency ?? "USD",
  });
  if (error) {
    if (error.message?.includes("not_coordinator")) return err("forbidden", "Only the coordinator can edit options");
    return err("db_error", error.message);
  }
  return ok(true);
}

export async function deleteVariant(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = DeleteVariantInput.safeParse(raw);
  if (!p.success) return err("invalid_input", "Bad id");
  const { error } = await repo.deleteVariant(ctx.db, p.data.id);
  if (error) {
    if (error.message?.includes("not_coordinator")) return err("forbidden", "Only the coordinator can delete options");
    return err("db_error", error.message);
  }
  return ok(true);
}

export async function setMyOrder(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = SetOrderInput.safeParse(raw);
  if (!p.success) return err("invalid_input", "Bad quantity");
  const { error } = await repo.setMyOrder(ctx.db, p.data.variantId, p.data.qty);
  if (error) {
    if (error.message?.includes("not_participant")) return err("forbidden", "Join the project before ordering");
    if (error.message?.includes("not_member")) return err("forbidden", "Not a member of this cohort");
    return err("db_error", error.message);
  }
  return ok(true);
}

export async function generateShares(ctx: Ctx, requestId: string): Promise<Result<true>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { error } = await repo.generateShares(ctx.db, requestId);
  if (error) {
    if (error.message?.includes("not_coordinator")) return err("forbidden", "Only the coordinator can do this");
    return err("db_error", error.message);
  }
  return ok(true);
}
