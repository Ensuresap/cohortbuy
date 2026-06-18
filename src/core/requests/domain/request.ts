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

/** Stages during which new members may still join (before a decision is made). */
export const JOINABLE_STATUSES: RequestStatus[] = ["forming", "scoping", "research", "rfq"];

export const CreateRequestInput = z.object({
  cohortId: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().max(60).optional(),
  description: z.string().trim().max(2000).optional(),
  driver: z.string().trim().max(1000).optional(),
  targetDate: z.string().trim().max(20).optional(),
  joinDeadline: z.string().trim().max(20).optional(),
  projectType: z.enum(["service", "group_buy"]).optional(),
  serviceScope: z.enum(["service", "equipment", "both"]).optional(),
  splitMethod: z.enum(["even", "by_quantity", "by_usage", "custom"]).optional(),
  locked: z.boolean().optional(),
  minSize: z.number().int().min(1).max(100).default(2),
});
export type CreateRequestInput = z.infer<typeof CreateRequestInput>;

export const PROJECT_TYPE_LABELS: Record<"service" | "group_buy", string> = {
  service: "Service — work done per home",
  group_buy: "Group buy — volume product order",
};
export const SERVICE_SCOPE_LABELS: Record<"service" | "equipment" | "both", string> = {
  service: "Service / labor only",
  equipment: "Equipment / product only",
  both: "Equipment + installation",
};
export const SPLIT_METHOD_LABELS: Record<"even" | "by_quantity" | "by_usage" | "custom", string> = {
  even: "Even split (equal shares)",
  by_quantity: "By quantity (e.g. footage / units)",
  by_usage: "By usage / consumption",
  custom: "Custom (coordinator sets)",
};

export const AddCommentInput = z.object({
  requestId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});
export type AddCommentInput = z.infer<typeof AddCommentInput>;

export const EditRequestInput = z.object({
  requestId: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().max(60).optional(),
  description: z.string().trim().max(2000).optional(),
  driver: z.string().trim().max(1000).optional(),
  targetDate: z.string().trim().max(20).optional(),
  locked: z.boolean().optional(),
});
export type EditRequestInput = z.infer<typeof EditRequestInput>;

export interface ProjectTeaser {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  description: string | null;
  status: RequestStatus;
  locked: boolean;
  join_deadline: string | null;
  min_size: number;
  project_type: "service" | "group_buy";
  cohort_id: string;
  cohort_handle: string;
  cohort_name: string;
  cohort_visibility: "public" | "private";
  coordinator_name: string | null;
  participants: number;
}

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
  slug: string | null;
  target_date: string | null;
  join_deadline: string | null;
  project_type: "service" | "group_buy";
  service_scope: "service" | "equipment" | "both";
  split_method: "even" | "by_quantity" | "by_usage" | "custom";
  locked: boolean;
  contract_structure: "combined" | "individual";
  payment_mode: "pooled_escrow" | "individual_direct";
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

export const SetTermsInput = z.object({
  requestId: z.string().uuid(),
  contractStructure: z.enum(["combined", "individual"]),
  paymentMode: z.enum(["pooled_escrow", "individual_direct"]),
});

export const CONTRACT_STRUCTURE_LABELS: Record<"combined" | "individual", string> = {
  individual: "Individual contracts (per member)",
  combined: "One combined group contract",
};
export const PAYMENT_MODE_LABELS: Record<"pooled_escrow" | "individual_direct", string> = {
  individual_direct: "Each member pays the vendor directly (off-platform)",
  pooled_escrow: "Pooled escrow (platform-held) — coming later",
};

export interface Participant {
  id: string;
  request_id: string;
  user_id: string;
  role: "coordinator" | "treasurer" | "participant";
  status: "joined" | "left";
}

export interface ParticipantFeedItem {
  id: string;
  user_id: string;
  role: "coordinator" | "treasurer" | "participant";
  member_name: string | null;
  member_avatar: string | null;
}

export const PARTICIPANT_ROLE_LABELS: Record<"coordinator" | "treasurer" | "participant", string> = {
  coordinator: "Coordinator",
  treasurer: "Treasurer",
  participant: "Member",
};

export const AssignRoleInput = z.object({
  requestId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["coordinator", "treasurer", "participant"]),
});

export const SetAgreedAmountInput = z.object({
  requestId: z.string().uuid(),
  amount: z.coerce.number().nonnegative().max(100_000_000),
  currency: z.string().trim().length(3).default("USD"),
});
