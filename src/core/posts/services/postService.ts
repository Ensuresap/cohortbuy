import type { Ctx } from "../../context";
import {
  CreatePostInput,
  SetPostVisibilityInput,
  UpdatePostInput,
  type FeedPost,
} from "../domain/post";
import * as repo from "../repositories/postRepo";
import { ok, err, type Result } from "../../result";

/** Post to a cohort feed (managers / co-admins only — enforced by RLS). */
export async function createPost(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = CreatePostInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid");

  const { error } = await repo.insertPost(ctx.db, parsed.data, ctx.actor.id);
  if (error) {
    if (error.message?.toLowerCase().includes("row-level security")) {
      return err("forbidden", "Only admins/co-admins can post");
    }
    return err("db_error", error.message);
  }
  return ok(true);
}

/** Change a post's visibility (author or cohort manager — enforced in the fn). */
export async function setPostVisibility(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = SetPostVisibilityInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", "Invalid input");
  const { error } = await repo.setVisibility(ctx.db, parsed.data);
  if (error) {
    if (error.message?.includes("forbidden")) return err("forbidden", "Not allowed");
    return err("db_error", error.message);
  }
  return ok(true);
}

/** Edit a post's body (author or manager — enforced by RLS). */
export async function updatePost(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = UpdatePostInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid");
  const { data, error } = await repo.updatePost(ctx.db, {
    postId: parsed.data.postId,
    body: parsed.data.body,
  });
  if (error) return err("db_error", error.message);
  if (!data || data.length === 0) return err("forbidden", "Not allowed");
  return ok(true);
}

/** Delete a post (author or manager — enforced by RLS). */
export async function deletePost(ctx: Ctx, postId: string): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.deletePost(ctx.db, postId);
  if (error) return err("db_error", error.message);
  if (!data || data.length === 0) return err("forbidden", "Not allowed");
  return ok(true);
}

export async function listFeed(ctx: Ctx, cohortId: string): Promise<Result<FeedPost[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.feed(ctx.db, cohortId);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as FeedPost[]);
}
