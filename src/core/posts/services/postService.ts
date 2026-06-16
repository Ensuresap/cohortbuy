import type { Ctx } from "../../context";
import { CreatePostInput, type FeedPost } from "../domain/post";
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

export async function listFeed(ctx: Ctx, cohortId: string): Promise<Result<FeedPost[]>> {
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.feed(ctx.db, cohortId);
  if (error) return err("db_error", error.message);
  return ok((data ?? []) as FeedPost[]);
}
