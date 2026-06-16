import { z } from "zod";

/** Channels a user can be reached on. */
export const NOTIFICATION_CHANNELS = ["sms", "whatsapp", "email"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/** Events that warrant an "action due" notification (tied to approval gates). */
export const ActionDueEvent = z.enum([
  "approval_needed",
  "payment_due",
  "vote_open",
  "scope_signoff",
  "signature_needed",
  "milestone_confirm",
  "completion_signoff",
  "generic_action",
]);
export type ActionDueEvent = z.infer<typeof ActionDueEvent>;

/** E.164 phone, e.g. +14155550123 */
export const PhoneE164 = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, "Phone must be E.164 format, e.g. +14155550123");

export const NotifyActionDueInput = z.object({
  userId: z.string().uuid(),
  event: ActionDueEvent,
  message: z.string().min(1).max(480),
  link: z.string().url().optional(),
});
export type NotifyActionDueInput = z.infer<typeof NotifyActionDueInput>;

export type NotificationStatus = "sent" | "failed" | "skipped";
