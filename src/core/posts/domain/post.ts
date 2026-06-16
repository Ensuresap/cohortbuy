import { z } from "zod";

export const CreatePostInput = z.object({
  cohortId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
  imageUrl: z.union([z.string().url().max(500), z.literal("")]).optional(),
});
export type CreatePostInput = z.infer<typeof CreatePostInput>;

export interface FeedPost {
  id: string;
  body: string;
  image_url: string | null;
  created_at: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
}
