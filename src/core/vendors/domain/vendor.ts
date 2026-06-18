import { z } from "zod";

export interface Vendor {
  id: string;
  name: string;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  categories: string[];
  coverage_zips: string[];
  notes: string | null;
  vetting_status: "unverified" | "vetted";
  created_at: string;
}

const csv = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []));

export const AddVendorInput = z.object({
  name: z.string().trim().min(1).max(160),
  website: z.string().trim().max(300).optional(),
  contactEmail: z.string().trim().max(200).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  categories: csv,
  coverageZips: csv,
  notes: z.string().trim().max(2000).optional(),
  vettingStatus: z.enum(["unverified", "vetted"]).default("unverified"),
});
export type AddVendorInput = z.infer<typeof AddVendorInput>;
