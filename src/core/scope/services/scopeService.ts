import type { Ctx } from "../../context";
import { AddScopeInput, type ScopeItem } from "../domain/scope";
import * as repo from "../repositories/scopeRepo";
import { ok, err, type Result } from "../../result";

export async function addScopeItem(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = AddScopeInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid");

  const { error } = await repo.insertScope(ctx.db, parsed.data, ctx.actor.id);
  if (error) return err("db_error", error.message);
  return ok(true);
}

export async function listScope(ctx: Ctx, requestId: string): Promise<Result<ScopeItem[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.listByRequest(ctx.db, requestId);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as ScopeItem[]);
}
