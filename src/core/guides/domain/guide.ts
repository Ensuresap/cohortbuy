import { z } from "zod";

/** Unified public shape used by the guide pages (DB rows + file guides). */
export interface PublicGuide {
  slug: string;
  title: string;
  description: string;
  category: string;
  readMins: number;
  updated: string;
  body: string;
  source: "db" | "file";
}

/** A DB guide row for the admin editor (includes drafts). */
export interface GuideRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  body: string;
  read_mins: number;
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
}

export const SaveGuideInput = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens"),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(400).optional(),
  category: z.string().trim().max(60).optional(),
  body: z.string().trim().min(1).max(40000),
  readMins: z.coerce.number().int().min(1).max(60).default(4),
  status: z.enum(["draft", "published"]).default("draft"),
});
export type SaveGuideInput = z.infer<typeof SaveGuideInput>;

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

/** Rough read-time estimate from word count (~200 wpm). */
export function estimateReadMins(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
