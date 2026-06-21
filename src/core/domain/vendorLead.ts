import { z } from "zod";

export const VendorLeadInput = z.object({
  business: z.string().trim().min(1).max(160),
  contactName: z.string().trim().max(120).optional(),
  email: z.string().email(),
  phone: z.string().trim().max(40).optional(),
  categories: z.string().trim().max(300).optional(),
  serviceArea: z.string().trim().max(200).optional(),
  message: z.string().trim().max(1000).optional(),
  source: z.string().default("vendors"),
});
export type VendorLeadInput = z.infer<typeof VendorLeadInput>;
