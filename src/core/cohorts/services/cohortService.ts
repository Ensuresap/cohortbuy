import type { Ctx } from "../../context";
import {
  CreateCohortInput,
  RequestToJoinInput,
  ReviewJoinInput,
  SearchCohortsInput,
  HandleInput,
  RESERVED_HANDLES,
  decisionToStatus,
  type Cohort,
} from "../domain/cohort";
import * as repo from "../repositories/cohortRepo";
import { ok, err, type Result } from "../../result";

function dup(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "23505" || !!error?.message?.includes("duplicate");
}

/** Create a cohort; the creator becomes its manager (via SECURITY DEFINER RPC). */
export async function createCohort(
  ctx: Ctx,
  raw: unknown
): Promise<Result<{ cohortId: string }>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");

  const parsed = CreateCohortInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid");
  if (RESERVED_HANDLES.includes(parsed.data.handle)) {
    return err("handle_reserved", "That handle is reserved");
  }

  const { data, error } = await repo.createCohort(ctx.db, parsed.data);
  if (error) {
    if (dup(error)) return err("handle_taken", "That handle is already taken");
    return err("db_error", error.message);
  }
  return ok({ cohortId: data as string });
}

/** Request to join a cohort (member, pending manager approval). */
export async function requestToJoin(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");

  const parsed = RequestToJoinInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid");

  const { error } = await repo.insertJoinRequest(ctx.db, {
    cohortId: parsed.data.cohortId,
    userId: ctx.actor.id,
    note: parsed.data.note,
  });
  if (error) {
    if (dup(error)) return err("already_requested", "You've already requested or joined this cohort");
    return err("db_error", error.message);
  }
  return ok(true);
}

/** Manager decision on a join request: approve / reject / ask for more info. */
export async function reviewJoinRequest(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");

  const parsed = ReviewJoinInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid");

  const { data, error } = await repo.updateMemberStatus(ctx.db, {
    cohortId: parsed.data.cohortId,
    userId: parsed.data.userId,
    status: decisionToStatus(parsed.data.decision),
    note: parsed.data.note,
  });
  if (error) return err("db_error", error.message);
  // RLS lets only managers update; empty result means not permitted / not found.
  if (!data || data.length === 0) return err("forbidden", "Only the cohort manager can review requests");
  return ok(true);
}

/** Search public cohorts (post-login discovery). */
export async function searchPublicCohorts(
  ctx: Ctx,
  raw: unknown
): Promise<Result<Cohort[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = SearchCohortsInput.safeParse(raw ?? {});
  if (!parsed.success) return err("invalid_input", "Invalid input");
  const { data, error } = await repo.searchPublic(ctx.db, parsed.data);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as Cohort[]);
}

/** Resolve a cohort by its vanity handle (RLS limits to public or member). */
export async function getCohortByHandle(ctx: Ctx, raw: unknown): Promise<Result<Cohort | null>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = HandleInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", "Invalid handle");
  const { data, error } = await repo.getByHandle(ctx.db, parsed.data.handle);
  if (error) return err("db_error", error.message);
  return ok((data as Cohort) ?? null);
}

/** Pending join requests for a cohort (RLS returns rows only to its managers). */
export async function listJoinRequests(
  ctx: Ctx,
  cohortId: string
): Promise<Result<unknown[]>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.listRequests(ctx.db, cohortId);
  if (error) return err("db_error", error.message);
  return ok(data ?? []);
}

/** The signed-in user's cohorts (with status + access level). */
export async function listMyCohorts(ctx: Ctx): Promise<Result<unknown[]>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.listMyMemberships(ctx.db, ctx.actor.id);
  if (error) return err("db_error", error.message);
  return ok(data ?? []);
}
