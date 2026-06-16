import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreatePostInput } from "../domain/post";

export function insertPost(db: SupabaseClient, input: CreatePostInput, authorId: string) {
  return db.from("cohort_posts").insert({
    cohort_id: input.cohortId,
    author_id: authorId,
    body: input.body,
    image_url: input.imageUrl || null,
  });
}

export function feed(db: SupabaseClient, cohortId: string) {
  return db.rpc("cohort_posts_feed", { p_cohort: cohortId });
}
