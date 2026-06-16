import type { NotificationChannel } from "../domain/notification";
import type { Channel } from "./channel";
import { consoleChannel } from "./channels/consoleChannel";

/**
 * Channel registry. Phase 1 uses console adapters; swap entries for real
 * providers (Twilio for SMS, WhatsApp BSP, an email API) as they're added —
 * nothing in the notification service changes.
 */
const channels: Record<NotificationChannel, Channel> = {
  sms: consoleChannel("sms"),
  whatsapp: consoleChannel("whatsapp"),
  email: consoleChannel("email"),
};

export function getChannel(channel: NotificationChannel): Channel {
  return channels[channel];
}
