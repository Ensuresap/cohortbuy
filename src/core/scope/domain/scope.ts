import { z } from "zod";

export const AddScopeInput = z.object({
  requestId: z.string().uuid(),
  description: z.string().trim().min(1).max(1000),
  quantity: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type AddScopeInput = z.infer<typeof AddScopeInput>;

export const UpdateScopeInput = z.object({
  id: z.string().uuid(),
  description: z.string().trim().min(1).max(1000),
  quantity: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type UpdateScopeInput = z.infer<typeof UpdateScopeInput>;

export interface ScopeItem {
  id: string;
  request_id: string;
  user_id: string;
  description: string;
  quantity: string | null;
  notes: string | null;
  created_at: string;
}
