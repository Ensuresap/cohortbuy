import { z } from "zod";

export const MemoryScope = z.enum(["cohort", "work"]);
export type MemoryScope = z.infer<typeof MemoryScope>;

export const RecordMemoryInput = z
  .object({
    scope: MemoryScope,
    cohortId: z.string().uuid(),
    workItemId: z.string().uuid().optional(),
    key: z.string().max(120).optional(),
    content: z.string().min(1).max(8000),
  })
  .refine((v) => v.scope !== "work" || !!v.workItemId, {
    message: "workItemId is required for work-scoped memory",
    path: ["workItemId"],
  });
export type RecordMemoryInput = z.infer<typeof RecordMemoryInput>;

export const RecallMemoryInput = z.object({
  cohortId: z.string().uuid(),
  workItemId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
export type RecallMemoryInput = z.infer<typeof RecallMemoryInput>;

export interface MemoryEntry {
  id: string;
  scope: MemoryScope;
  cohort_id: string;
  work_item_id: string | null;
  key: string | null;
  content: string;
  created_at: string;
}
