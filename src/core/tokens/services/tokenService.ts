import type { Ctx } from "../../context";
import { isStaff } from "../../authz";
import {
  AwardEventInput,
  AdminGrantInput,
  SpendInput,
  BalanceInput,
  EARN_RULES,
  statusTier,
} from "../domain/tokens";
import * as repo from "../repositories/tokenRepo";
import { ok, err, type Result } from "../../result";

function actorId(ctx: Ctx): string {
  return ctx.actor?.role === "agent" ? "agent" : ctx.actor?.id ?? "system";
}

/** System-issued reward for an earn event (join cohort, complete project, …). */
export async function awardForEvent(
  ctx: Ctx,
  raw: unknown
): Promise<Result<{ balance: number }>> {
  const p = AwardEventInput.safeParse(raw);
  if (!p.success) return err("invalid_input", p.error.issues[0]?.message ?? "Invalid");
  if (!ctx.db) return err("not_configured", "Database is not configured");

  const amount = EARN_RULES[p.data.event];
  const { data, error } = await repo.applyTx(ctx.db, {
    userId: p.data.userId,
    amount,
    type: "earn",
    reason: p.data.event,
    createdBy: actorId(ctx),
    ref: p.data.ref,
  });
  if (error) return err("db_error", error.message);
  return ok({ balance: data as number });
}

/** Admin-only manual grant. */
export async function adminGrant(
  ctx: Ctx,
  raw: unknown
): Promise<Result<{ balance: number }>> {
  if (!isStaff(ctx)) return err("forbidden", "Admin only");
  const p = AdminGrantInput.safeParse(raw);
  if (!p.success) return err("invalid_input", p.error.issues[0]?.message ?? "Invalid");
  if (!ctx.db) return err("not_configured", "Database is not configured");

  const { data, error } = await repo.applyTx(ctx.db, {
    userId: p.data.userId,
    amount: p.data.amount,
    type: "grant",
    reason: p.data.reason,
    createdBy: ctx.actor?.id ?? "admin",
  });
  if (error) return err("db_error", error.message);
  return ok({ balance: data as number });
}

/** Spend tokens on an in-app perk (never cash). Blocks overspend atomically. */
export async function spendTokens(
  ctx: Ctx,
  raw: unknown
): Promise<Result<{ balance: number }>> {
  const p = SpendInput.safeParse(raw);
  if (!p.success) return err("invalid_input", p.error.issues[0]?.message ?? "Invalid");
  if (!ctx.db) return err("not_configured", "Database is not configured");

  const { data, error } = await repo.applyTx(ctx.db, {
    userId: p.data.userId,
    amount: -p.data.amount,
    type: "spend",
    reason: p.data.reason,
    createdBy: actorId(ctx),
    ref: p.data.ref,
  });
  if (error) {
    if (error.message?.includes("insufficient_tokens")) {
      return err("insufficient_tokens", "Not enough tokens");
    }
    return err("db_error", error.message);
  }
  return ok({ balance: data as number });
}

/** Read a user's balance, lifetime earned, and status tier. */
export async function getBalance(
  ctx: Ctx,
  raw: unknown
): Promise<Result<{ balance: number; lifetimeEarned: number; tier: string }>> {
  const p = BalanceInput.safeParse(raw);
  if (!p.success) return err("invalid_input", p.error.issues[0]?.message ?? "Invalid");
  if (!ctx.db) return err("not_configured", "Database is not configured");

  const { data, error } = await repo.getAccount(ctx.db, p.data.userId);
  if (error) return err("db_error", error.message);

  const balance = data?.balance ?? 0;
  const lifetimeEarned = data?.lifetime_earned ?? 0;
  return ok({ balance, lifetimeEarned, tier: statusTier(lifetimeEarned) });
}
