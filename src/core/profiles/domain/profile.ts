import { z } from "zod";

const PhoneE164 = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, "Phone must be E.164 format, e.g. +14155550123");

export const PreferredChannel = z.enum(["sms", "whatsapp", "email"]);

export const OnboardingInput = z
  .object({
    displayName: z.string().trim().min(1).max(80),
    phone: PhoneE164.optional(),
    smsOptIn: z.boolean().default(false),
    preferredChannel: PreferredChannel.default("sms"),
    country: z.string().trim().length(2).default("US"),
  })
  .refine((v) => !v.smsOptIn || !!v.phone, {
    message: "A phone number is required to opt in to SMS",
    path: ["phone"],
  });
export type OnboardingInput = z.infer<typeof OnboardingInput>;

/** Set the signed-in user's location (drives local cohort discovery). */
export const SetLocationInput = z.object({
  postalCode: z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP code"),
  city: z.string().trim().max(80).optional(),
  country: z.string().trim().length(2).optional(),
});
export type SetLocationInput = z.infer<typeof SetLocationInput>;

export interface Profile {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  sms_opt_in: boolean;
  preferred_channel: z.infer<typeof PreferredChannel>;
  country: string;
  postal_code: string | null;
  city: string | null;
  role: "member" | "staff" | "admin";
}
