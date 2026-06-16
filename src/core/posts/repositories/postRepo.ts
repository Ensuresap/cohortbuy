import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreatePostInput } from "../domain/post";

export function insertPost(db: SupabaseClient, input: CreatePostInput, authorId: string) {
  return db.from("cohort_posts").insert({
    cohort_id: input.cohortId,
    author_id: authorId,
    body: input.body,
    image_url: input.imageUrl || null,
    visibility: input.visibility,
  });
}

export function feed(db: SupabaseClient, cohortId: string) {
  return db.rpc("cohort_posts_feed", { p_cohort: cohortId });
}

export function setVisibility(
  db: SupabaseClient,
  args: { postId: string; visibility: string }
) {
  return db.rpc("set_post_visibility", {
    p_post: args.postId,
    p_visibility: args.visibility,
  });
}
