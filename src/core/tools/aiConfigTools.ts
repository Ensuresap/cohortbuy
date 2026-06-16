import { SetCohortModelInput } from "../ai/domain/aiConfig";
import { setCohortModel } from "../ai/services/aiConfigService";
import type { Tool } from "./types";

export const setCohortModelTool: Tool = {
  name: "set_cohort_model",
  description:
    "Admin: set the AI model override for a specific cohort. Falls back to the global default when unset.",
  input: SetCohortModelInput,
  handler: (ctx, input) => setCohortModel(ctx, input),
};
