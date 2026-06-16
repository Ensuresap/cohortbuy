import { NotifyActionDueInput } from "../domain/notification";
import { notifyActionDue } from "../services/notificationService";
import type { Tool } from "./types";

export const notifyActionDueTool: Tool = {
  name: "notify_action_due",
  description:
    "Notify a user that an action is due, via their preferred consented channel (SMS/WhatsApp/email).",
  input: NotifyActionDueInput,
  handler: (ctx, input) => notifyActionDue(ctx, input),
};
