import { z } from "zod";

/**
 * Single source of truth for the waitlist signup shape.
 * Reused for API validation AND as the agent/MCP tool input schema
 * (Zod converts cleanly to JSON Schema).
 */
export const WaitlistSignupInput = z.object({
  email: z.string().email(),
  zip: z.string().trim().max(12).optional(),
  source: z.string().default("landing"),
});

export type WaitlistSignupInput = z.infer<typeof WaitlistSignupInput>;

export interface WaitlistEntry {
  id: string;
  email: string;
  zip: string | null;
  source: string;
  created_at: string;
}
