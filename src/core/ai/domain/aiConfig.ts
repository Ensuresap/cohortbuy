import { z } from "zod";

export const AiModelSetting = z.object({
  provider: z.string().min(1), // e.g. "anthropic", "openai"
  model: z.string().min(1), // e.g. "claude-sonnet-4-6"
});
export type AiModelSetting = z.infer<typeof AiModelSetting>;

export const ResolveModelInput = z.object({
  cohortId: z.string().uuid().optional(),
});
export type ResolveModelInput = z.infer<typeof ResolveModelInput>;

export const SetCohortModelInput = z.object({
  cohortId: z.string().uuid(),
  provider: z.string().min(1),
  model: z.string().min(1),
});
export type SetCohortModelInput = z.infer<typeof SetCohortModelInput>;

/** Last-resort fallback if nothing is configured in the DB. */
export const DEFAULT_MODEL: AiModelSetting = {
  provider: "anthropic",
  model: "claude-sonnet-4-6",
};
