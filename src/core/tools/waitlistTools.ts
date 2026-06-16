import { WaitlistSignupInput } from "../domain/waitlist";
import { joinWaitlist } from "../services/waitlistService";
import type { Tool } from "./types";

export const joinWaitlistTool: Tool<{ email: string }> = {
  name: "join_waitlist",
  description: "Add an email (with optional ZIP) to the CohortBuy waitlist.",
  input: WaitlistSignupInput,
  handler: (ctx, input) => joinWaitlist(ctx, input),
};
