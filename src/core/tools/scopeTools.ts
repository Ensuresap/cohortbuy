import { AddScopeInput } from "../scope/domain/scope";
import { addScopeItem } from "../scope/services/scopeService";
import type { Tool } from "./types";

export const addScopeItemTool: Tool = {
  name: "add_scope_item",
  description: "Add a scope item (a member's needs) to a project.",
  input: AddScopeInput,
  handler: (ctx, input) => addScopeItem(ctx, input),
};
