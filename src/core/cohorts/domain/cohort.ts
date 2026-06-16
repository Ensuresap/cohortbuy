import { z } from "zod";

export const Handle = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]{3,30}$/, "Handle must be 3–30 chars: lowercase letters, numbers, hyphens");

export const Visibility = z.enum(["public", "private"]);

export const RESERVED_HANDLES = [
  "admin", "api", "app", "login", "signup", "onboarding", "account", "auth",
  "settings", "about", "help", "dashboard", "cohorts", "blog", "new",
];

export const CreateCohortInput = z.object({
  name: z.string().trim().min(2).max(80),
  handle: Handle,
  description: z.string().max(500).optional(),
  visibility: Visibility.default("public"),
  category: z.string().max(60).optional(),
  country: z.string().trim().length(2).default("US"),
});
export type CreateCohortInput = z.infer<typeof CreateCohortInput>;

export const RequestToJoinInput = z.object({
  cohortId: z.string().uuid(),
  note: z.string().max(500).optional(),
});
export type RequestToJoinInput = z.infer<typeof RequestToJoinInput>;

export const ReviewJoinInput = z.object({
  cohortId: z.string().uuid(),
  userId: z.string().uuid(),
  decision: z.enum(["approve", "reject", "needs_info"]),
  note: z.string().max(500).optional(),
});
export type ReviewJoinInput = z.infer<typeof ReviewJoinInput>;

export const SearchCohortsInput = z.object({
  query: z.string().trim().max(80).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});
export type SearchCohortsInput = z.infer<typeof SearchCohortsInput>;

export const HandleInput = z.object({ handle: Handle });

export const UpdateCohortProfileInput = z.object({
  cohortId: z.string().uuid(),
  name: z.string().trim().min(2).max(80).optional(),
  tagline: z.string().trim().max(140).optional(),
  description: z.string().trim().max(500).optional(),
  avatarUrl: z.union([z.string().url().max(500), z.literal("")]).optional(),
});
export type UpdateCohortProfileInput = z.infer<typeof UpdateCohortProfileInput>;

export const SetTitleInput = z.object({
  cohortId: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().trim().max(60),
});
export type SetTitleInput = z.infer<typeof SetTitleInput>;

export const SetComanagerInput = z.object({
  cohortId: z.string().uuid(),
  userId: z.string().uuid(),
  make: z.boolean(),
});
export type SetComanagerInput = z.infer<typeof SetComanagerInput>;

export interface DirectoryMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
  access_level: "member" | "manager";
  title: string | null;
  member_since: string;
}

export type MemberStatus = "requested" | "approved" | "rejected" | "needs_info";
export type AccessLevel = "member" | "manager";

export interface Cohort {
  id: string;
  handle: string;
  name: string;
  description: string | null;
  tagline: string | null;
  avatar_url: string | null;
  visibility: z.infer<typeof Visibility>;
  category: string | null;
  country: string;
  created_by: string | null;
  last_activity_at: string;
  created_at: string;
}

const DECISION_TO_STATUS: Record<ReviewJoinInput["decision"], MemberStatus> = {
  approve: "approved",
  reject: "rejected",
  needs_info: "needs_info",
};

export function decisionToStatus(d: ReviewJoinInput["decision"]): MemberStatus {
  return DECISION_TO_STATUS[d];
}
