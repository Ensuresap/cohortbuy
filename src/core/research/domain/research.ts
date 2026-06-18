import { z } from "zod";

export interface VendorCandidate {
  id: string;
  request_id: string;
  vendor_id: string | null;
  name: string;
  contact: string | null;
  website: string | null;
  address: string | null;
  source: "member" | "registry" | "ai" | "web";
  status: "considering" | "shortlisted" | "contacted" | "declined";
  vetting_status: "unverified" | "vetted";
  notes: string | null;
  suggested_by: string | null;
  created_at: string;
}

export const CANDIDATE_STATUS_LABELS: Record<VendorCandidate["status"], string> = {
  considering: "Considering",
  shortlisted: "Shortlisted",
  contacted: "Contacted",
  declined: "Declined",
};
export const CANDIDATE_SOURCE_LABELS: Record<VendorCandidate["source"], string> = {
  member: "Member",
  registry: "Registry",
  ai: "AI suggested",
  web: "Web",
};

export const AddCandidateInput = z.object({
  requestId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  contact: z.string().trim().max(200).optional(),
  website: z.string().trim().max(300).optional(),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(1000).optional(),
  source: z.enum(["member", "registry", "ai", "web"]).default("member"),
  vendorId: z.string().uuid().optional(),
});
export type AddCandidateInput = z.infer<typeof AddCandidateInput>;

export const SetCandidateStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["considering", "shortlisted", "contacted", "declined"]),
});

export const SetResearchInput = z.object({
  requestId: z.string().uuid(),
  low: z.coerce.number().nonnegative().max(100_000_000),
  high: z.coerce.number().nonnegative().max(100_000_000),
  currency: z.string().trim().length(3).default("USD"),
  notes: z.string().trim().max(2000).optional(),
});
