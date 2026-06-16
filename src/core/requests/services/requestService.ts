import type { Ctx } from "../../context";
import {
  CreateRequestInput,
  RequestIdInput,
  AdvanceStatusInput,
  type ServiceRequest,
  type Participant,
} from "../domain/request";
import * as repo from "../repositories/requestRepo";
import { ok, err, type Result } from "../../result";

/** Create a project in a cohort (creator becomes coordinator; member-gated). */
export async function createServiceRequest(
  ctx: Ctx,
  raw: unknown
): Promise<Result<{ requestId: string }>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = CreateRequestInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid");

  const { data, error } = await repo.createRequest(ctx.db, parsed.data);
  if (error) {
    if (error.message?.includes("not_a_member")) {
      return err("forbidden", "You must be an approved cohort member to start a project");
    }
    return err("db_error", error.message);
  }
  return ok({ requestId: data as string });
}

export async function listCohortRequests(
  ctx: Ctx,
  cohortId: string
): Promise<Result<ServiceRequest[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.listByCohort(ctx.db, cohortId);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as ServiceRequest[]);
}

/** Projects the signed-in user participates in (with cohort + stage). */
export async function listMyProjects(ctx: Ctx): Promise<Result<unknown[]>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.listMyParticipations(ctx.db, ctx.actor.id);
  if (error) return err("db_error", error.message);
  return ok(data ?? []);
}

export async function getRequest(ctx: Ctx, raw: unknown): Promise<Result<ServiceRequest | null>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = RequestIdInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", "Invalid request id");
  const { data, error } = await repo.getById(ctx.db, parsed.data.requestId);
  if (error) return err("db_error", error.message);
  return ok((data as ServiceRequest) ?? null);
}

export async function joinServiceRequest(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = RequestIdInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", "Invalid request id");

  const { error } = await repo.joinRequest(ctx.db, {
    requestId: parsed.data.requestId,
    userId: ctx.actor.id,
  });
  if (error) {
    if (error.code === "23505") return err("already_joined", "You're already in this project");
    return err("db_error", error.message);
  }
  return ok(true);
}

/** Move a project to a new stage (coordinator/creator or cohort manager via RLS). */
export async function advanceStatus(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = AdvanceStatusInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", "Invalid status");

  const { data, error } = await repo.updateStatus(ctx.db, {
    requestId: parsed.data.requestId,
    status: parsed.data.status,
  });
  if (error) return err("db_error", error.message);
  if (!data || data.length === 0) {
    return err("forbidden", "Only the coordinator or a cohort manager can change the stage");
  }
  return ok(true);
}

export async function listParticipants(ctx: Ctx, raw: unknown): Promise<Result<Participant[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = RequestIdInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", "Invalid request id");
  const { data, error } = await repo.listParticipants(ctx.db, parsed.data.requestId);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as Participant[]);
}
