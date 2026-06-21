import { z } from "zod";

export interface GroupBuyVariant {
  id: string;
  request_id: string;
  label: string;
  specs: string | null;
  unit_price_cents: number | null;
  currency: string;
  sort: number;
}

export interface GroupBuyOrderRow {
  id: string;
  user_id: string;
  variant_id: string;
  quantity: number;
  member_name: string | null;
  member_avatar: string | null;
}

/** A variant plus the demand rolled up across all members. */
export interface VariantWithStats extends GroupBuyVariant {
  committed_qty: number;
  line_total_cents: number;
}

export interface DealSummary {
  variants: VariantWithStats[];
  myOrders: Record<string, number>; // variantId -> my quantity
  totalUnits: number;
  totalValueCents: number;
  currency: string;
  buyers: number; // distinct members with at least one unit
}

export const SetVariantInput = z.object({
  requestId: z.string().uuid(),
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(120),
  specs: z.string().trim().max(2000).optional(),
  priceCents: z.number().int().nonnegative().max(100_000_000).nullable().optional(),
  currency: z.string().trim().length(3).optional(),
});
export type SetVariantInput = z.infer<typeof SetVariantInput>;

export const DeleteVariantInput = z.object({ id: z.string().uuid() });
export const SetOrderInput = z.object({
  variantId: z.string().uuid(),
  qty: z.coerce.number().int().min(0).max(100000),
});
export const RequestIdInput = z.object({ requestId: z.string().uuid() });
