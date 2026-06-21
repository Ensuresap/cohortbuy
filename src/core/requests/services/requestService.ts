import type { Ctx } from "../../context";
import {
  CreateRequestInput,
  RequestIdInput,
  AdvanceStatusInput,
  AddCommentInput,
  UpdateCommentInput,
  EditRequestInput,
  SelectQuoteInput,
  SetContractInput,
  SetSharePaidInput,
  SetTermsInput,
  CompleteProjectInput,
  AssignRoleInput,
  SetAgreedAmountInput,
  JOINABLE_STATUSES,
  type ServiceRequest,
  type ProjectCard,
  type MyActiveProject,
  type ActionItem,
  type DiscoverProject,
  type Participant,
  type ParticipantFeedItem,
  type JoinRequestItem,
  type ProjectComment,
  type ProjectTeaser,
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

/** Richer project cards for the cohort page (with participant count + price). */
export async function listCohortProjectCards(ctx: Ctx, cohortId: string): Promise<Result<ProjectCard[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.cohortProjectCards(ctx.db, cohortId);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as ProjectCard[]);
}

/** Active (in-flight) projects for the dashboard, with last activity + latest chat. */
export async function listMyActiveProjects(ctx: Ctx): Promise<Result<MyActiveProject[]>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.myActiveProjects(ctx.db);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as MyActiveProject[]);
}

/** "Your turn" todos: stage-specific personal actions + join requests to review. */
export async function listMyActionItems(ctx: Ctx): Promise<Result<ActionItem[]>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.myActionItems(ctx.db);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as ActionItem[]);
}

/** Joinable projects in my cohorts I haven't joined yet (Discover). */
export async function listDiscoverProjects(ctx: Ctx): Promise<Result<DiscoverProject[]>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.discoverableProjects(ctx.db);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as DiscoverProject[]);
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
    serviceScope: p.data.serviceScope ?? "service",
    splitMethod: p.data.splitMethod ?? "even",
    minSize: p.data.minSize ?? 2,
    locked: p.data.locked ?? false,
    joinPolicy: p.data.joinPolicy ?? "auto",
    decisionPolicy: p.data.decisionPolicy ?? "coordinator",
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

  const status = project.join_policy === "approval" ? "requested" : "joined";
  const { error } = await repo.joinRequest(ctx.db, {
    requestId: parsed.data.requestId,
    userId: ctx.actor.id,
    status,
  });
  if (error) {
    if (error.code === "23505") return err("already_joined", "You're already in this project");
    return err("db_error", error.message);
  }
  return ok(true);
}

export async function castVote(ctx: Ctx, args: { requestId: string; quoteId: string }): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { error } = await repo.castVote(ctx.db, args);
  if (error) {
    if (error.message?.includes("not_participant")) return err("forbidden", "Join the project to vote");
    return err("db_error", error.message);
  }
  return ok(true);
}

export async function clearVote(ctx: Ctx, requestId: string): Promise<Result<true>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { error } = await repo.clearVote(ctx.db, requestId);
  if (error) return err("db_error", error.message);
  return ok(true);
}

export async function myVote(ctx: Ctx, requestId: string): Promise<Result<string | null>> {
  if (!ctx.actor?.id) return ok(null);
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.myVote(ctx.db, requestId);
  if (error) return err("db_error", error.message);
  return ok((data as string | null) ?? null);
}

export async function getVoteTally(ctx: Ctx, requestId: string): Promise<Result<Record<string, number>>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.voteTally(ctx.db, requestId);
  if (error) return err("db_error", error.message);
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{ quote_id: string; votes: number }>) map[row.quote_id] = Number(row.votes);
  return ok(map);
}

export async function setAiRecommendation(ctx: Ctx, args: { requestId: string; quoteId: string; text: string }): Promise<Result<true>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { error } = await repo.setAiRecommendation(ctx.db, args);
  if (error) {
    if (error.message?.includes("not_coordinator")) return err("forbidden", "Only the coordinator can set this");
    return err("db_error", error.message);
  }
  return ok(true);
}

/** Coordinator/manager saves the RFQ draft text. */
export async function setRfqDraft(ctx: Ctx, args: { requestId: string; text: string }): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { error } = await repo.setRfqDraft(ctx.db, args);
  if (error) {
    if (error.message?.includes("not_coordinator")) return err("forbidden", "Only the coordinator can edit the RFQ");
    return err("db_error", error.message);
  }
  return ok(true);
}

/** The caller's own participation status, or null. */
export async function myParticipation(ctx: Ctx, requestId: string): Promise<Result<string | null>> {
  if (!ctx.actor?.id) return ok(null);
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.myParticipation(ctx.db, requestId);
  if (error) return err("db_error", error.message);
  return ok((data as string | null) ?? null);
}

/** Pending join requests (coordinator/manager only). */
export async function listJoinRequests(ctx: Ctx, requestId: string): Promise<Result<JoinRequestItem[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.joinRequestFeed(ctx.db, requestId);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as JoinRequestItem[]);
}

/** Coordinator/manager approves or declines a pending join request. */
export async function respondJoin(ctx: Ctx, args: { requestId: string; userId: string; approve: boolean }): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { error } = await repo.respondJoin(ctx.db, args);
  if (error) {
    if (error.message?.includes("not_coordinator")) return err("forbidden", "Only the coordinator can respond to requests");
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
    stage: p.data.stage,
    kind: p.data.kind,
  });
  if (error) return err("db_error", error.message);
  return ok(true);
}

/** Public light teaser for an invite link (works for non-members / logged-out). */
export async function getProjectTeaser(ctx: Ctx, requestId: string): Promise<Result<ProjectTeaser | null>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.projectTeaser(ctx.db, requestId);
  if (error) return err("db_error", error.message);
  return ok((data as ProjectTeaser) ?? null);
}

/** Public light teaser looked up by the human-friendly slug. */
export async function getProjectTeaserBySlug(ctx: Ctx, slug: string): Promise<Result<ProjectTeaser | null>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.projectTeaserBySlug(ctx.db, slug);
  if (error) return err("db_error", error.message);
  return ok((data as ProjectTeaser) ?? null);
}

export async function updateComment(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = UpdateCommentInput.safeParse(raw);
  if (!p.success) return err("invalid_input", "Invalid");
  const { error } = await repo.updateComment(ctx.db, { id: p.data.id, body: p.data.body });
  if (error) {
    if (error.message?.includes("forbidden")) return err("forbidden", "You can only edit your own comment");
    return err("db_error", error.message);
  }
  return ok(true);
}

export async function deleteComment(ctx: Ctx, id: string): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { error } = await repo.deleteComment(ctx.db, id);
  if (error) {
    if (error.message?.includes("forbidden")) return err("forbidden", "You can't delete this comment");
    return err("db_error", error.message);
  }
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

export async function listParticipantsFeed(ctx: Ctx, requestId: string): Promise<Result<ParticipantFeedItem[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.participantsFeed(ctx.db, requestId);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as ParticipantFeedItem[]);
}

/** Coordinator assigns a role (treasurer / co-coordinator / member) to a participant. */
export async function assignRole(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = AssignRoleInput.safeParse(raw);
  if (!p.success) return err("invalid_input", "Invalid role");
  const { error } = await repo.setParticipantRole(ctx.db, {
    requestId: p.data.requestId,
    userId: p.data.userId,
    role: p.data.role,
  });
  if (error) {
    if (error.message?.includes("not_coordinator"))
      return err("forbidden", "Only the project coordinator can assign roles");
    if (error.message?.includes("cannot_change_creator"))
      return err("forbidden", "The project creator stays a coordinator");
    return err("db_error", error.message);
  }
  return ok(true);
}

/** Coordinator sets the agreed amount directly (group-buy projects without an RFQ). */
export async function setProjectAmount(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = SetAgreedAmountInput.safeParse(raw);
  if (!p.success) return err("invalid_input", p.error.issues[0]?.message ?? "Invalid");
  const { error } = await repo.setAgreedAmount(ctx.db, {
    requestId: p.data.requestId,
    amountCents: Math.round(p.data.amount * 100),
    currency: p.data.currency.toUpperCase(),
  });
  if (error) {
    if (error.message?.includes("not_coordinator"))
      return err("forbidden", "Only the project coordinator can set the price");
    return err("db_error", error.message);
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
