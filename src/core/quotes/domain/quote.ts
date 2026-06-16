import { z } from "zod";

export const QuoteKind = z.enum(["indicative", "final"]);

export const AddQuoteInput = z.object({
  requestId: z.string().uuid(),
  vendorName: z.string().trim().min(1).max(120),
  amount: z.coerce.number().nonnegative().max(100_000_000), // in major units (e.g. dollars)
  currency: z.string().trim().length(3).default("USD"),
  timeline: z.string().trim().max(120).optional(),
  warranty: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
  kind: QuoteKind.default("indicative"),
});
export type AddQuoteInput = z.infer<typeof AddQuoteInput>;

export interface Quote {
  id: string;
  request_id: string;
  vendor_name: string;
  amount_cents: number;
  currency: string;
  kind: "indicative" | "final";
  timeline: string | null;
  warranty: string | null;
  notes: string | null;
  status: "received" | "shortlisted" | "selected" | "rejected";
  created_by: string | null;
  created_at: string;
}
