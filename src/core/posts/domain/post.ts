import { z } from "zod";

export const PostVisibility = z.enum(["members", "public"]);
export type PostVisibility = z.infer<typeof PostVisibility>;

export const CreatePostInput = z.object({
  cohortId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
  imageUrl: z.union([z.string().url().max(500), z.literal("")]).optional(),
  visibility: PostVisibility.default("members"),
});
export type CreatePostInput = z.infer<typeof CreatePostInput>;

export const SetPostVisibilityInput = z.object({
  postId: z.string().uuid(),
  visibility: PostVisibility,
});

export const UpdatePostInput = z.object({
  postId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
});
export type UpdatePostInput = z.infer<typeof UpdatePostInput>;
export type SetPostVisibilityInput = z.infer<typeof SetPostVisibilityInput>;

export interface FeedPost {
  id: string;
  body: string;
  image_url: string | null;
  visibility: "members" | "public";
  created_at: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
}
