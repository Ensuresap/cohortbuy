import type { ZodTypeAny } from "zod";
import type { Ctx } from "../context";
import type { Result } from "../result";

/**
 * A Tool exposes a service as a named, schema'd capability.
 * The SAME registry is consumed by the AI agent runtime and the (future)
 * MCP server — define a capability once, expose it everywhere.
 */
export interface Tool<O = unknown> {
  name: string;
  description: string;
  input: ZodTypeAny; // Zod schema -> JSON Schema for the LLM / MCP
  handler: (ctx: Ctx, input: unknown) => Promise<Result<O>>;
}
