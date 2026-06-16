import type { Ctx } from "../context";
import { WaitlistSignupInput } from "../domain/waitlist";
import * as repo from "../repositories/waitlistRepo";
import { ok, err, type Result } from "../result";

/**
 * Business logic for joining the waitlist. Framework-free: callable from an
 * API route, the AI agent (via the tool registry), or an MCP server.
 */
export async function joinWaitlist(
  ctx: Ctx,
  raw: unknown
): Promise<Result<{ email: string }>> {
  const parsed = WaitlistSignupInput.safeParse(raw);
  if (!parsed.success) {
    return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  if (!ctx.db) {
    return err("not_configured", "Database is not configured");
  }

  const { error } = await repo.insertSignup(ctx.db, parsed.data);
  if (error) {
    // Unique violation = already on the list; treat as success.
    if ((error as { code?: string }).code === "23505") {
      return ok({ email: parsed.data.email });
    }
    return err("db_error", error.message);
  }

  return ok({ email: parsed.data.email });
}
