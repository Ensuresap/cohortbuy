import type { Ctx } from "../context";
import {
  NotifyActionDueInput,
  type NotificationChannel,
  type NotificationStatus,
} from "../domain/notification";
import * as repo from "../repositories/notificationRepo";
import { getChannel } from "../notifications";
import { ok, err, type Result } from "../result";

/** Recent notifications for the signed-in user (for the dashboard). */
export async function listMyNotifications(
  ctx: Ctx,
  limit = 10
): Promise<Result<unknown[]>> {
  if (!ctx.actor?.id) return err("unauthenticated", "Sign in required");
  if (!ctx.db) return err("not_configured", "Database is not configured");
  const { data, error } = await repo.listForUser(ctx.db, ctx.actor.id, limit);
  if (error) return err("db_error", error.message);
  return ok(data ?? []);
}

/**
 * Send an "action due" notification to a user via their preferred, CONSENTED
 * channel. Consent is enforced here: SMS/WhatsApp require sms_opt_in. If no
 * valid destination exists, the notification is logged as "skipped" (not an
 * error) so the in-app surface can still show it.
 *
 * Called by capability services whenever an action gate opens for a user.
 */
export async function notifyActionDue(
  ctx: Ctx,
  raw: unknown
): Promise<Result<{ channel: NotificationChannel; status: NotificationStatus }>> {
  const parsed = NotifyActionDueInput.safeParse(raw);
  if (!parsed.success) {
    return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  if (!ctx.db) return err("not_configured", "Database is not configured");

  const { data: profile, error } = await repo.getNotifyProfile(ctx.db, parsed.data.userId);
  if (error || !profile) return err("no_profile", "User profile not found");

  // Resolve channel + destination, enforcing consent.
  let channel: NotificationChannel = profile.preferred_channel ?? "sms";
  let to: string | null = null;

  if (channel === "sms" || channel === "whatsapp") {
    if (profile.sms_opt_in && profile.phone) {
      to = profile.phone;
    } else if (profile.email) {
      channel = "email"; // fall back to email when no SMS consent/number
      to = profile.email;
    }
  } else if (channel === "email") {
    to = profile.email;
  }

  const body =
    parsed.data.message + (parsed.data.link ? ` ${parsed.data.link}` : "");

  let status: NotificationStatus;
  if (!to) {
    status = "skipped"; // no consented destination — surfaced in-app instead
  } else {
    const res = await getChannel(channel).send({ to, channel, body });
    status = res.ok ? "sent" : "failed";
  }

  await repo.logNotification(ctx.db, {
    user_id: parsed.data.userId,
    event: parsed.data.event,
    channel,
    status,
    payload: { message: parsed.data.message, link: parsed.data.link ?? null },
  });

  return ok({ channel, status });
}
