import type { Channel } from "../channel";
import type { NotificationChannel } from "../../domain/notification";

/**
 * Dev/no-op channel: logs instead of sending. Replace with provider adapters
 * (Twilio SMS, WhatsApp BSP, email API) selected by config in ./index.ts.
 */
export function consoleChannel(key: NotificationChannel): Channel {
  return {
    key,
    async send(msg) {
      // eslint-disable-next-line no-console
      console.log(`[notify:${msg.channel}] -> ${msg.to}: ${msg.body}`);
      return { ok: true, ref: "console" };
    },
  };
}
