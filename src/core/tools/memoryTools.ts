import { RecordMemoryInput, RecallMemoryInput } from "../memory/domain/memory";
import { recordMemory, recallMemory } from "../memory/services/memoryService";
import type { Tool } from "./types";

export const recordMemoryTool: Tool = {
  name: "record_memory",
  description:
    "Save a memory at cohort or work-item scope so the agent can use it as context later.",
  input: RecordMemoryInput,
  handler: (ctx, input) => recordMemory(ctx, input),
};

export const recallMemoryTool: Tool = {
  name: "recall_memory",
  description:
    "Recall recent memories for a cohort (and a specific work item, if given) to load into context.",
  input: RecallMemoryInput,
  handler: (ctx, input) => recallMemory(ctx, input),
};
