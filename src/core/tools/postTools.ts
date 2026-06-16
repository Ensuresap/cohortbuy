import { CreatePostInput } from "../posts/domain/post";
import { createPost } from "../posts/services/postService";
import type { Tool } from "./types";

export const createPostTool: Tool = {
  name: "create_cohort_post",
  description: "Post an update to a cohort feed (admins / co-admins only).",
  input: CreatePostInput,
  handler: (ctx, input) => createPost(ctx, input),
};
