import type { Ctx } from "../../context";
import { RecordMemoryInput, RecallMemoryInput, type MemoryEntry } from "../domain/memory";
import * as repo from "../repositories/memoryRepo";
import { ok, err, type Result } from "../../result";

/** Save a memory at cohort or work-item scope so the agent can recall it later. */
export async function recordMemory(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  const parsed = RecordMemoryInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid");
  if (!ctx.db) return err("not_configured", "Database is not configured");

  const createdBy = ctx.actor?.role === "agent" ? "agent" : ctx.actor?.id ?? "system";
  const { error } = await repo.insertMemory(ctx.db, parsed.data, createdBy);
  if (error) return err("db_error", error.message);
  return ok(true);
}

/** Recall memory for a cohort (and, if given, a specific work item + cohort memory). */
export async function recallMemory(
  ctx: Ctx,
  raw: unknown
): Promise<Result<MemoryEntry[]>> {
  const parsed = RecallMemoryInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid");
  if (!ctx.db) return err("not_configured", "Database is not configured");

  const { data, error } = await repo.recallMemory(ctx.db, {
    cohortId: parsed.data.cohortId,
    workItemId: parsed.data.workItemId,
    limit: parsed.data.limit,
  });
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as MemoryEntry[]);
}
