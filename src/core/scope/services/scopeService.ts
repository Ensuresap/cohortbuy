import type { Ctx } from "../../context";
import { AddScopeInput, UpdateScopeInput, type ScopeItem } from "../domain/scope";
import * as repo from "../repositories/scopeRepo";
import { ok, err, type Result } from "../../result";

function mapEntryErr(message?: string) {
  if (message?.includes("forbidden")) return err("forbidden", "You can't change this entry");
  if (message?.includes("not_found")) return err("not_found", "Entry not found");
  return err("db_error", message ?? "Unknown error");
}

export async function addScopeItem(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = AddScopeInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid");

  const { error } = await repo.insertScope(ctx.db, parsed.data, ctx.actor.id);
  if (error) return err("db_error", error.message);
  return ok(true);
}

export async function updateScopeItem(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = UpdateScopeInput.safeParse(raw);
  if (!p.success) return err("invalid_input", p.error.issues[0]?.message ?? "Invalid");
  const { error } = await repo.updateScope(ctx.db, p.data);
  if (error) return mapEntryErr(error.message);
  return ok(true);
}

export async function deleteScopeItem(ctx: Ctx, id: string): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { error } = await repo.deleteScope(ctx.db, id);
  if (error) return mapEntryErr(error.message);
  return ok(true);
}

export async function listScope(ctx: Ctx, requestId: string): Promise<Result<ScopeItem[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.listByRequest(ctx.db, requestId);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as ScopeItem[]);
}
