import type { Ctx } from "../../context";
import { AddQuoteInput, type Quote } from "../domain/quote";
import * as repo from "../repositories/quoteRepo";
import { ok, err, type Result } from "../../result";

export async function addQuote(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = AddQuoteInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid");

  const amountCents = Math.round(parsed.data.amount * 100);
  const { error } = await repo.insertQuote(ctx.db, parsed.data, amountCents, ctx.actor.id);
  if (error) return err("db_error", error.message);
  return ok(true);
}

export async function listQuotes(ctx: Ctx, requestId: string): Promise<Result<Quote[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.listByRequest(ctx.db, requestId);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as Quote[]);
}
