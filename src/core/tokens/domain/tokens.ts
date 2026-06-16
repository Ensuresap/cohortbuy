import { z } from "zod";

/**
 * Earn rules (system-issued). Amounts are non-cash points; tokens are NEVER
 * redeemable for money — they unlock in-app perks/status only.
 */
export const EARN_RULES = {
  join_cohort: 10,
  complete_project: 50,
  refer_neighbor: 25,
  run_cohort: 100, // community-manager incentive
  leave_rating: 5,
} as const;

export const EarnEvent = z.enum([
  "join_cohort",
  "complete_project",
  "refer_neighbor",
  "run_cohort",
  "leave_rating",
]);
export type EarnEvent = z.infer<typeof EarnEvent>;

export const AwardEventInput = z.object({
  userId: z.string().uuid(),
  event: EarnEvent,
  ref: z.record(z.any()).optional(),
});
export type AwardEventInput = z.infer<typeof AwardEventInput>;

export const AdminGrantInput = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().positive().max(100000),
  reason: z.string().min(1).max(200),
});
export type AdminGrantInput = z.infer<typeof AdminGrantInput>;

export const SpendInput = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().positive().max(100000),
  reason: z.string().min(1).max(200),
  ref: z.record(z.any()).optional(),
});
export type SpendInput = z.infer<typeof SpendInput>;

export const BalanceInput = z.object({ userId: z.string().uuid() });
export type BalanceInput = z.infer<typeof BalanceInput>;

/** Reputation/status tiers derived from lifetime tokens earned. */
export const STATUS_TIERS = [
  { min: 0, name: "Newcomer" },
  { min: 100, name: "Neighbor" },
  { min: 500, name: "Connector" },
  { min: 1500, name: "Pillar" },
] as const;

export function statusTier(lifetimeEarned: number): string {
  let name = STATUS_TIERS[0].name as string;
  for (const t of STATUS_TIERS) if (lifetimeEarned >= t.min) name = t.name;
  return name;
}
