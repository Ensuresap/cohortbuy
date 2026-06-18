import type { Ctx } from "../../context";
import {
  CreateRequestInput,
  RequestIdInput,
  AdvanceStatusInput,
  AddCommentInput,
  EditRequestInput,
  SelectQuoteInput,
  SetContractInput,
  SetSharePaidInput,
  SetTermsInput,
  CompleteProjectInput,
  JOINABLE_STATUSES,
  type ServiceRequest,
  type Participant,
  type ProjectComment,
  type CostShare,
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

/** Edit a project's core details (coordinator/creator or cohort manager via RLS). */
export async function editProject(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = EditRequestInput.safeParse(raw);
  if (!p.success) return err("invalid_input", p.error.issues[0]?.message ?? "Invalid");
  const { data, error } = await repo.updateProject(ctx.db, {
    requestId: p.data.requestId,
    title: p.data.title,
    category: p.data.category ?? null,
    description: p.data.description ?? null,
    driver: p.data.driver ?? null,
    targetDate: p.data.targetDate || null,
    locked: p.data.locked ?? false,
  });
  if (error) return err("db_error", error.message);
  if (!data || data.length === 0)
    return err("forbidden", "Only the coordinator or a cohort manager can edit this project");
  return ok(true);
}

export async function joinServiceRequest(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = RequestIdInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", "Invalid request id");

  // Gate joining: project must be open (not locked) and still in an early stage.
  const { data: reqRow, error: getErr } = await repo.getById(ctx.db, parsed.data.requestId);
  if (getErr) return err("db_error", getErr.message);
  const project = reqRow as ServiceRequest | null;
  if (!project) return err("not_found", "Project not found");
  if (project.locked) return err("locked", "This project is locked — joining is closed");
  if (!JOINABLE_STATUSES.includes(project.status))
    return err("closed", "This project has moved past the joining stage");

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

/** Leave a project (non-coordinator participant; blocked when the project is locked). */
export async function leaveProject(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = RequestIdInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", "Invalid request id");

  const { data: reqRow, error: getErr } = await repo.getById(ctx.db, parsed.data.requestId);
  if (getErr) return err("db_error", getErr.message);
  const project = reqRow as ServiceRequest | null;
  if (!project) return err("not_found", "Project not found");
  if (project.created_by === ctx.actor.id)
    return err("forbidden", "The coordinator can't leave their own project");
  if (project.locked) return err("locked", "This project is locked — leaving is closed");

  const { error } = await repo.leaveRequest(ctx.db, {
    requestId: parsed.data.requestId,
    userId: ctx.actor.id,
  });
  if (error) return err("db_error", error.message);
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

export async function addComment(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = AddCommentInput.safeParse(raw);
  if (!p.success) return err("invalid_input", p.error.issues[0]?.message ?? "Invalid");
  const { error } = await repo.insertComment(ctx.db, {
    requestId: p.data.requestId,
    userId: ctx.actor.id,
    body: p.data.body,
  });
  if (error) return err("db_error", error.message);
  return ok(true);
}

export async function listComments(ctx: Ctx, requestId: string): Promise<Result<ProjectComment[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.commentsFeed(ctx.db, requestId);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as ProjectComment[]);
}

/** Coordinator selects a winning quote (records agreed amount + vendor). */
export async function selectWinningQuote(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = SelectQuoteInput.safeParse(raw);
  if (!p.success) return err("invalid_input", "Invalid quote");
  const { error } = await repo.selectQuote(ctx.db, p.data.quoteId);
  if (error) {
    if (error.message?.includes("not_coordinator"))
      return err("forbidden", "Only the project coordinator can select a quote");
    return err("db_error", error.message);
  }
  return ok(true);
}

/** Coordinator records the off-platform contract reference (e.g. Google Drive link). */
export async function recordContract(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = SetContractInput.safeParse(raw);
  if (!p.success) return err("invalid_input", p.error.issues[0]?.message ?? "Invalid");
  const { error } = await repo.setContract(ctx.db, {
    requestId: p.data.requestId,
    url: p.data.url ?? "",
    note: p.data.note ?? "",
  });
  if (error) {
    if (error.message?.includes("not_coordinator"))
      return err("forbidden", "Only the project coordinator can record the contract");
    return err("db_error", error.message);
  }
  return ok(true);
}

/** Coordinator generates an even split of the agreed amount across participants. */
export async function generateCostShares(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = RequestIdInput.safeParse(raw);
  if (!p.success) return err("invalid_input", "Invalid request id");
  const { error } = await repo.generateCostShares(ctx.db, p.data.requestId);
  if (error) {
    if (error.message?.includes("not_coordinator"))
      return err("forbidden", "Only the project coordinator can generate cost shares");
    if (error.message?.includes("no_agreed_amount"))
      return err("invalid_input", "Select a winning quote first to set the agreed amount");
    return err("db_error", error.message);
  }
  return ok(true);
}

/** Mark a member's share paid/unpaid (off-platform settlement; tracking only). */
export async function setSharePaid(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = SetSharePaidInput.safeParse(raw);
  if (!p.success) return err("invalid_input", "Invalid share");
  const { error } = await repo.setSharePaid(ctx.db, { shareId: p.data.shareId, paid: p.data.paid });
  if (error) return err("db_error", error.message);
  return ok(true);
}

/** Coordinator sets contract structure + payment mode (Addendum D). */
export async function setProjectTerms(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = SetTermsInput.safeParse(raw);
  if (!p.success) return err("invalid_input", p.error.issues[0]?.message ?? "Invalid");
  const { error } = await repo.setProjectTerms(ctx.db, {
    requestId: p.data.requestId,
    contractStructure: p.data.contractStructure,
    paymentMode: p.data.paymentMode,
  });
  if (error) {
    if (error.message?.includes("not_coordinator"))
      return err("forbidden", "Only the coordinator or a cohort manager can set terms");
    return err("db_error", error.message);
  }
  return ok(true);
}

/** Coordinator signs off project completion. */
export async function completeProject(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = CompleteProjectInput.safeParse(raw);
  if (!p.success) return err("invalid_input", p.error.issues[0]?.message ?? "Invalid");
  const { error } = await repo.completeProject(ctx.db, {
    requestId: p.data.requestId,
    note: p.data.note ?? "",
  });
  if (error) {
    if (error.message?.includes("not_coordinator"))
      return err("forbidden", "Only the project coordinator can complete the project");
    return err("db_error", error.message);
  }
  return ok(true);
}

export async function listCostShares(ctx: Ctx, requestId: string): Promise<Result<CostShare[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.costSharesFeed(ctx.db, requestId);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as CostShare[]);
}

export async function listParticipants(ctx: Ctx, raw: unknown): Promise<Result<Participant[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = RequestIdInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", "Invalid request id");
  const { data, error } = await repo.listParticipants(ctx.db, parsed.data.requestId);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as Participant[]);
}
