import {
  AwardEventInput,
  AdminGrantInput,
  SpendInput,
  BalanceInput,
} from "../tokens/domain/tokens";
import {
  awardForEvent,
  adminGrant,
  spendTokens,
  getBalance,
} from "../tokens/services/tokenService";
import type { Tool } from "./types";

export const awardTokensTool: Tool = {
  name: "award_tokens",
  description: "Award tokens to a user for an earn event (system/agent rules).",
  input: AwardEventInput,
  handler: (ctx, input) => awardForEvent(ctx, input),
};

export const grantTokensTool: Tool = {
  name: "grant_tokens",
  description: "Admin: manually grant tokens to a user.",
  input: AdminGrantInput,
  handler: (ctx, input) => adminGrant(ctx, input),
};

export const spendTokensTool: Tool = {
  name: "spend_tokens",
  description: "Spend a user's tokens on an in-app perk (non-cash). Blocks overspend.",
  input: SpendInput,
  handler: (ctx, input) => spendTokens(ctx, input),
};

export const getTokenBalanceTool: Tool = {
  name: "get_token_balance",
  description: "Get a user's token balance, lifetime earned, and status tier.",
  input: BalanceInput,
  handler: (ctx, input) => getBalance(ctx, input),
};
