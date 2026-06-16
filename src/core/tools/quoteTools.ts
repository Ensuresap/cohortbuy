import { AddQuoteInput } from "../quotes/domain/quote";
import { addQuote } from "../quotes/services/quoteService";
import type { Tool } from "./types";

export const addQuoteTool: Tool = {
  name: "add_quote",
  description: "Record a vendor quote (price + terms) on a project.",
  input: AddQuoteInput,
  handler: (ctx, input) => addQuote(ctx, input),
};
