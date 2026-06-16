import type { Ctx } from "../../context";
import { OnboardingInput, type Profile } from "../domain/profile";
import * as repo from "../repositories/profileRepo";
import { ok, err, type Result } from "../../result";

/** The signed-in user's profile (null if none yet). */
export async function getMyProfile(ctx: Ctx): Promise<Result<Profile | null>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.getById(ctx.db, ctx.actor.id);
  if (error) return err("db_error", error.message);
  return ok((data as Profile) ?? null);
}

/** Update the signed-in user's last-seen timestamp (presence heartbeat). */
export async function touchPresence(ctx: Ctx): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { error } = await repo.touchLastSeen(ctx.db, ctx.actor.id);
  if (error) return err("db_error", error.message);
  return ok(true);
}

/** Save onboarding details for the signed-in user. */
export async function completeOnboarding(
  ctx: Ctx,
  raw: unknown
): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");

  const parsed = OnboardingInput.safeParse(raw);
  if (!parsed.success) {
    return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const d = parsed.data;
  const { error } = await repo.upsertProfile(ctx.db, {
    id: ctx.actor.id,
    display_name: d.displayName,
    phone: d.phone ?? null,
    sms_opt_in: d.smsOptIn,
    sms_opt_in_at: d.smsOptIn ? new Date().toISOString() : null,
    preferred_channel: d.preferredChannel,
    country: d.country,
  });
  if (error) return err("db_error", error.message);
  return ok(true);
}
