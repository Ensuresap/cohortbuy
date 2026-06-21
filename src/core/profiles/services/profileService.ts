import type { Ctx } from "../../context";
import { OnboardingInput, SetLocationInput, type Profile } from "../domain/profile";
import * as repo from "../repositories/profileRepo";
import { ok, err, type Result } from "../../result";

/** Export everything the platform holds about the signed-in user (their own data). */
export async function exportMyData(ctx: Ctx): Promise<Result<unknown>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.exportMyData(ctx.db);
  if (error) return err("db_error", error.message);
  return ok(data);
}

/** Close the account: anonymize PII + mark for deletion (handoff required if coordinating). */
export async function requestAccountDeletion(ctx: Ctx): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { error } = await repo.requestAccountDeletion(ctx.db);
  if (error) {
    if (error.message?.includes("reassign_first"))
      return err("reassign_first", "Hand off or finish the projects you coordinate before deleting your account.");
    return err("db_error", error.message);
  }
  return ok(true);
}

/** The signed-in user's profile (null if none yet). */
export async function getMyProfile(ctx: Ctx): Promise<Result<Profile | null>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.getById(ctx.db, ctx.actor.id);
  if (error) return err("db_error", error.message);
  return ok((data as Profile) ?? null);
}

/** Save the signed-in user's location (ZIP-based) for local discovery. */
export async function setMyLocation(ctx: Ctx, raw: unknown): Promise<Result<true>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const parsed = SetLocationInput.safeParse(raw);
  if (!parsed.success) return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid");
  const { error } = await repo.setLocation(ctx.db, ctx.actor.id, {
    postal_code: parsed.data.postalCode,
    city: parsed.data.city ?? null,
    ...(parsed.data.country ? { country: parsed.data.country } : {}),
  });
  if (error) return err("db_error", error.message);
  return ok(true);
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
