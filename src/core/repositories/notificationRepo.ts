import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationChannel, NotificationStatus } from "../domain/notification";

export interface NotifyProfileRow {
  phone: string | null;
  email: string | null;
  sms_opt_in: boolean;
  preferred_channel: NotificationChannel;
}

export function getNotifyProfile(db: SupabaseClient, userId: string) {
  return db
    .from("profiles")
    .select("phone, email, sms_opt_in, preferred_channel")
    .eq("id", userId)
    .single();
}

export function listForUser(db: SupabaseClient, userId: string, limit: number) {
  return db
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export function logNotification(
  db: SupabaseClient,
  row: {
    user_id: string;
    event: string;
    channel: NotificationChannel;
    status: NotificationStatus;
    payload: unknown;
  }
) {
  return db.from("notifications").insert(row);
}
