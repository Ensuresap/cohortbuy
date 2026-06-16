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
  minSize: z.number().int().min(1).max(100).default(2),
});
export type CreateRequestInput = z.infer<typeof CreateRequestInput>;

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
  status: RequestStatus;
  min_size: number;
  last_activity_at: string;
  created_at: string;
}

export interface Participant {
  id: string;
  request_id: string;
  user_id: string;
  role: "coordinator" | "treasurer" | "participant";
  status: "joined" | "left";
}
