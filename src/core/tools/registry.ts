import type { Tool } from "./types";
import { joinWaitlistTool } from "./waitlistTools";
import { notifyActionDueTool } from "./notificationTools";
import { setCohortModelTool } from "./aiConfigTools";
import { recordMemoryTool, recallMemoryTool } from "./memoryTools";
import {
  awardTokensTool,
  grantTokensTool,
  spendTokensTool,
  getTokenBalanceTool,
} from "./tokenTools";
import {
  createCohortTool,
  requestToJoinTool,
  reviewJoinRequestTool,
  searchPublicCohortsTool,
} from "./cohortTools";
import {
  createServiceRequestTool,
  joinServiceRequestTool,
} from "./requestTools";

/**
 * Central tool registry. Add a capability's tool here and it becomes
 * available to the AI agent and the MCP server automatically.
 *
 * Agent runtime:  map each tool -> the LLM's tool schema (input -> JSON Schema)
 *                 and dispatch tool calls to `tool.handler(ctx, args)`.
 * MCP server:     expose `tools` as MCP tools, same handlers, same Ctx.
 */
export const tools: Tool[] = [
  joinWaitlistTool,
  notifyActionDueTool,
  setCohortModelTool,
  recordMemoryTool,
  recallMemoryTool,
  awardTokensTool,
  grantTokensTool,
  spendTokensTool,
  getTokenBalanceTool,
  createCohortTool,
  requestToJoinTool,
  reviewJoinRequestTool,
  searchPublicCohortsTool,
  createServiceRequestTool,
  joinServiceRequestTool,
];

export const toolMap: Record<string, Tool> = Object.fromEntries(
  tools.map((t) => [t.name, t])
);
