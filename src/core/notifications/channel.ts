import type { NotificationChannel } from "../domain/notification";

export interface OutboundMessage {
  to: string;
  channel: NotificationChannel;
  body: string;
}

export interface SendResult {
  ok: boolean;
  ref?: string;
  error?: string;
}

/**
 * A delivery channel (SMS / WhatsApp / email). Swap the concrete implementation
 * behind this interface — console now, Twilio/WhatsApp-BSP/email API later —
 * without changing the notification service. (Same adapter pattern as VendorSource.)
 */
export interface Channel {
  key: NotificationChannel;
  send(msg: OutboundMessage): Promise<SendResult>;
}
