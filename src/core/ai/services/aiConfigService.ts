import type { Ctx } from "../../context";
import { isStaff } from "../../authz";
import {
  AiModelSetting,
  DEFAULT_MODEL,
  ResolveModelInput,
  SetCohortModelInput,
} from "../domain/aiConfig";
import * as repo from "../repositories/aiSettingsRepo";
import { ok, err, type Result } from "../../result";

/**
 * Resolve the model to use: per-cohort override → global default → fallback.
 * Safe to call from the agent runtime before every run.
 */
export async function resolveModel(
  ctx: Ctx,
  raw: unknown
): Promise<Result<AiModelSetting>> {
  const parsed = ResolveModelInput.safeParse(raw ?? {});
  if (!parsed.success) return err("invalid_input", "Invalid input");
  if (!ctx.db) return ok(DEFAULT_MODEL);

  if (parsed.data.cohortId) {
    const { data } = await repo.getCohortOverride(ctx.db, parsed.data.cohortId);
    if (data?.provider && data?.model) {
      return ok({ provider: data.provider, model: data.model });
    }
  }
  const { data: g } = await repo.getGlobal(ctx.db);
  if (g?.provider && g?.model) return ok({ provider: g.provider, model: g.model });

  // Env override (no DB row needed): AI_DEFAULT_PROVIDER + AI_DEFAULT_MODEL.
  const envProvider = process.env.AI_DEFAULT_PROVIDER;
  const envModel = process.env.AI_DEFAULT_MODEL;
  if (envProvider && envModel) return ok({ provider: envProvider, model: envModel });

  return ok(DEFAULT_MODEL);
}

/** Admin-only: set a cohort's model override. */
export async function setCohortModel(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!isStaff(ctx)) return err("forbidden", "Admin only");
  const parsed = SetCohortModelInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid");
  if (!ctx.db) return err("not_configured", "Database is not configured");

  const { error } = await repo.upsertCohortOverride(ctx.db, {
    cohort_id: parsed.data.cohortId,
    provider: parsed.data.provider,
    model: parsed.data.model,
    updated_by: ctx.actor?.id,
  });
  if (error) return err("db_error", error.message);
  return ok(true);
}

/** Admin-only: set the global default model. */
export async function setGlobalModel(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!isStaff(ctx)) return err("forbidden", "Admin only");
  const parsed = AiModelSetting.safeParse(raw);
  if (!parsed.success) return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid");
  if (!ctx.db) return err("not_configured", "Database is not configured");

  const { error } = await repo.upsertGlobal(ctx.db, {
    provider: parsed.data.provider,
    model: parsed.data.model,
    updated_by: ctx.actor?.id,
  });
  if (error) return err("db_error", error.message);
  return ok(true);
}
