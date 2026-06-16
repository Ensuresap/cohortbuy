import { z } from "zod";

export const REQUEST_STATUSES = [
  "forming", "scoping", "research", "rfq", "deciding",
  "contracting", "funding", "in_progress", "completed", "cancelled",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const STAGE_LABELS: Record<RequestStatus, string> = {
  forming: "Forming",
  scoping: "Scoping",
  research: "Research",
  rfq: "Getting quotes",
  deciding: "Deciding",
  contracting: "Contracting",
  funding: "Funding",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Ordered stages shown in the progress bar (excludes cancelled). */
export const PIPELINE: RequestStatus[] = [
  "forming", "scoping", "research", "rfq", "deciding",
  "contracting", "funding", "in_progress", "completed",
];

export const CreateRequestInput = z.object({
  cohortId: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().max(60).optional(),
  description: z.string().trim().max(2000).optional(),
  driver: z.string().trim().max(1000).optional(),
  minSize: z.number().int().min(1).max(100).default(2),
});
export type CreateRequestInput = z.infer<typeof CreateRequestInput>;

export const AddCommentInput = z.object({
  requestId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});
export type AddCommentInput = z.infer<typeof AddCommentInput>;

export interface ProjectComment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author_name: string | null;
  author_avatar: string | null;
}

export const RequestIdInput = z.object({ requestId: z.string().uuid() });
export const ListByCohortInput = z.object({ cohortId: z.string().uuid() });

export const AdvanceStatusInput = z.object({
  requestId: z.string().uuid(),
  status: z.enum(REQUEST_STATUSES),
});
export type AdvanceStatusInput = z.infer<typeof AdvanceStatusInput>;

export interface ServiceRequest {
  id: string;
  cohort_id: string;
  created_by: string | null;
  title: string;
  category: string | null;
  description: string | null;
  driver: string | null;
  status: RequestStatus;
  min_size: number;
  last_activity_at: string;
  created_at: string;
  selected_quote_id: string | null;
  agreed_amount_cents: number | null;
  agreed_currency: string | null;
  contract_vendor: string | null;
  contract_url: string | null;
  contract_note: string | null;
  completion_note: string | null;
  completed_at: string | null;
  cohort?: { handle: string; name: string } | null;
}

export interface CostShare {
  id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  paid: boolean;
  paid_at: string | null;
  member_name: string | null;
  member_avatar: string | null;
}

export const SelectQuoteInput = z.object({ quoteId: z.string().uuid() });
export const SetContractInput = z.object({
  requestId: z.string().uuid(),
  url: z.string().trim().url().max(2000).optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional(),
});
export const SetSharePaidInput = z.object({
  shareId: z.string().uuid(),
  paid: z.boolean(),
});
export const CompleteProjectInput = z.object({
  requestId: z.string().uuid(),
  note: z.string().trim().max(1000).optional(),
});

export interface Participant {
  id: string;
  request_id: string;
  user_id: string;
  role: "coordinator" | "treasurer" | "participant";
  status: "joined" | "left";
}
