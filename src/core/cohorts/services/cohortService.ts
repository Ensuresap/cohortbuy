import type { Ctx } from "../../context";
import {
  CreateCohortInput,
  RequestToJoinInput,
  ReviewJoinInput,
  SearchCohortsInput,
  DiscoverCohortsInput,
  HandleInput,
  UpdateCohortProfileInput,
  SetTitleInput,
  SetComanagerInput,
  RespondInfoInput,
  RESERVED_HANDLES,
  type Cohort,
  type DirectoryMember,
  type PublicCohortCard,
  type MyCohortCard,
  type TagCatalogItem,
} from "../domain/cohort";
import * as repo from "../repositories/cohortRepo";
import { MIN_LIFETIME_TO_CREATE_COHORT } from "../../tokens/domain/tokens";
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
    if (error.message?.includes("need_tokens"))
      return err("need_tokens", `You need ${MIN_LIFETIME_TO_CREATE_COHORT} earned tokens to start a cohort — join a project or invite a neighbor first.`);
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

  const { error } = await repo.requestJoin(ctx.db, {
    cohortId: parsed.data.cohortId,
    answers: parsed.data.answers ?? [],
    invitedBy: parsed.data.invitedBy ?? null,
  });
  if (error) return err("db_error", error.message);
  return ok(true);
}

/** Manager decision on a join request: approve / reject / ask for more info. */
export async function reviewJoinRequest(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");

  const parsed = ReviewJoinInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid");

  const { error } = await repo.reviewJoin(ctx.db, {
    cohortId: parsed.data.cohortId,
    userId: parsed.data.userId,
    decision: parsed.data.decision,
    message: parsed.data.message,
  });
  if (error) {
    if (error.message?.includes("forbidden")) {
      return err("forbidden", "Only the cohort manager can review requests");
    }
    return err("db_error", error.message);
  }
  return ok(true);
}

/** Requestor replies to a manager's "need more info" request. */
export async function respondJoinInfo(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = RespondInfoInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid");
  const { error } = await repo.respondInfo(ctx.db, {
    cohortId: parsed.data.cohortId,
    response: parsed.data.response,
  });
  if (error) return err("db_error", error.message);
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

/**
 * Discover public cohorts enriched with aggregates (members, value coordinated,
 * projects) and ordered "near you" first, then by popularity. The viewer's
 * country is supplied by the entry point (resolved from their profile).
 */
export async function discoverCohorts(
  ctx: Ctx,
  raw: unknown
): Promise<Result<PublicCohortCard[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = DiscoverCohortsInput.safeParse(raw ?? {});
  if (!parsed.success) return err("invalid_input", "Invalid input");
  const { data, error } = await repo.discover(ctx.db, parsed.data);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as PublicCohortCard[]);
}

/** The caller's own cohorts as cards (with aggregates + membership status). */
export async function getMyCohortCards(ctx: Ctx): Promise<Result<MyCohortCard[]>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.listMyCohortCards(ctx.db);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as MyCohortCard[]);
}

export interface PublicStats {
  cohorts: number;
  members: number;
  projects: number;
  value_cents: number;
  saved_cents: number;
}

/** Aggregate, non-identifying platform stats for the public landing page. */
export async function getPublicStats(ctx: Ctx): Promise<Result<PublicStats>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.platformPublicStats(ctx.db);
  if (error) return err("db_error", error.message);
  const row = (Array.isArray(data) ? data[0] : data) as PublicStats | undefined;
  return ok(row ?? { cohorts: 0, members: 0, projects: 0, value_cents: 0, saved_cents: 0 });
}

/** Platform-managed common tags (for suggestions + discover filter chips). */
export async function getTagCatalog(ctx: Ctx): Promise<Result<TagCatalogItem[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.listTagCatalog(ctx.db);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as TagCatalogItem[]);
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

/** Leave a cohort (owner must transfer first). */
export async function leaveCohort(ctx: Ctx, cohortId: string): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { error } = await repo.leaveCohort(ctx.db, cohortId);
  if (error) {
    if (error.message?.includes("owner_cannot_leave")) {
      return err("forbidden", "The owner can't leave; transfer ownership first");
    }
    return err("db_error", error.message);
  }
  return ok(true);
}

/** Member directory of a cohort (names, role, title, presence) for its members. */
export async function getMemberDirectory(
  ctx: Ctx,
  cohortId: string
): Promise<Result<DirectoryMember[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.memberDirectory(ctx.db, cohortId);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as DirectoryMember[]);
}

/** Manager: assign or clear a member's title (e.g. Treasurer). */
export async function setMemberTitle(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = SetTitleInput.safeParse(raw);
  if (!p.success) return err("invalid_input", p.error.issues[0]?.message ?? "Invalid");
  const { error } = await repo.setTitle(ctx.db, p.data);
  if (error) {
    if (error.message?.includes("forbidden")) return err("forbidden", "Only a manager can set titles");
    return err("db_error", error.message);
  }
  return ok(true);
}

/** Owner: promote/demote a member to/from co-admin (co-manager). */
export async function setComanager(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = SetComanagerInput.safeParse(raw);
  if (!p.success) return err("invalid_input", "Invalid input");
  const { error } = await repo.setComanager(ctx.db, p.data);
  if (error) {
    if (error.message?.includes("forbidden")) return err("forbidden", "Only the owner can change co-admins");
    return err("db_error", error.message);
  }
  return ok(true);
}

/** Manager: edit cohort profile (name, tagline, description, avatar). */
export async function updateCohortProfile(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const p = UpdateCohortProfileInput.safeParse(raw);
  if (!p.success) return err("invalid_input", p.error.issues[0]?.message ?? "Invalid");

  const fields: Record<string, unknown> = {};
  if (p.data.name !== undefined) fields.name = p.data.name;
  if (p.data.tagline !== undefined) fields.tagline = p.data.tagline || null;
  if (p.data.description !== undefined) fields.description = p.data.description || null;
  if (p.data.avatarUrl !== undefined) fields.avatar_url = p.data.avatarUrl || null;
  if (p.data.coverUrl !== undefined) fields.cover_url = p.data.coverUrl || null;
  if (p.data.joinQuestions !== undefined) fields.join_questions = p.data.joinQuestions;
  if (p.data.tags !== undefined) fields.tags = p.data.tags;
  if (p.data.kind !== undefined) fields.kind = p.data.kind;
  if (p.data.city !== undefined) fields.city = p.data.city || null;
  if (p.data.region !== undefined) fields.region = p.data.region || null;
  if (p.data.coverageZips !== undefined) fields.coverage_zips = p.data.coverageZips;
  if (Object.keys(fields).length === 0) return ok(true);

  const { data, error } = await repo.updateCohort(ctx.db, p.data.cohortId, fields);
  if (error) return err("db_error", error.message);
  if (!data || data.length === 0) return err("forbidden", "Only a manager can edit the cohort");
  return ok(true);
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
