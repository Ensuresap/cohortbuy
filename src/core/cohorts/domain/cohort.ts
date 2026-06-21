import { z } from "zod";

export const Handle = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]{3,30}$/, "Handle must be 3–30 chars: lowercase letters, numbers, hyphens");

export const Visibility = z.enum(["public", "private"]);

export const CohortKind = z.enum(["service", "group_buy"]);
export type CohortKind = z.infer<typeof CohortKind>;

/** Human labels for cohort kinds (singular). */
export const COHORT_KIND_LABELS: Record<CohortKind, string> = {
  service: "Service",
  group_buy: "Group buy",
};

// ── Tags ───────────────────────────────────────────────────────────────────
/** Normalize free text into a tag slug (lowercase, hyphenated, a–z0–9). */
export function slugifyTag(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Best-effort display label for a slug when it isn't in the catalog. */
export function humanizeTag(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const TagSlug = z.string().regex(/^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/);

/** Accepts any string[] (or non-array → []), slugifies, dedupes, caps at 10. */
export const TagList = z
  .preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.string()))
  .transform((arr) => Array.from(new Set(arr.map(slugifyTag).filter(Boolean))).slice(0, 10))
  .pipe(z.array(TagSlug));

export interface TagCatalogItem {
  slug: string;
  label: string;
  kind: CohortKind | "both";
  sort: number;
}

// ── Coverage (US ZIP codes) ──────────────────────────────────────────────────
export const Zip = z.string().regex(/^\d{5}$/, "Enter a 5-digit ZIP code");

/** Accepts any string[] (or non-array → []), keeps valid 5-digit ZIPs, deduped, ≤50. */
export const ZipList = z
  .preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.string()))
  .transform((arr) =>
    Array.from(new Set(arr.map((s) => s.trim()).filter((s) => /^\d{5}$/.test(s)))).slice(0, 50)
  )
  .pipe(z.array(Zip));

export const RESERVED_HANDLES = [
  "admin", "api", "app", "login", "signup", "onboarding", "account", "auth",
  "settings", "about", "help", "dashboard", "cohorts", "blog", "new",
];

export const CreateCohortInput = z.object({
  name: z.string().trim().min(2).max(80),
  handle: Handle,
  description: z.string().max(500).optional(),
  visibility: Visibility.default("public"),
  tags: TagList,
  country: z.string().trim().length(2).default("US"),
  kind: CohortKind.default("service"),
  coverageZips: ZipList,
  city: z.string().trim().max(80).optional(),
  region: z.string().trim().max(80).optional(),
});
export type CreateCohortInput = z.infer<typeof CreateCohortInput>;

export const JoinQuestion = z.object({
  text: z.string().trim().min(1).max(300),
  expected: z.string().trim().max(300).optional(),
});
export type JoinQuestion = z.infer<typeof JoinQuestion>;

export const JoinAnswer = z.object({
  question: z.string().max(300),
  answer: z.string().max(2000),
});
export type JoinAnswer = z.infer<typeof JoinAnswer>;

export const RequestToJoinInput = z.object({
  cohortId: z.string().uuid(),
  answers: z.array(JoinAnswer).max(20).optional(),
  invitedBy: z.string().uuid().optional(),
});
export type RequestToJoinInput = z.infer<typeof RequestToJoinInput>;

export const RespondInfoInput = z.object({
  cohortId: z.string().uuid(),
  response: z.string().trim().min(1).max(2000),
});
export type RespondInfoInput = z.infer<typeof RespondInfoInput>;

export const ReviewJoinInput = z.object({
  cohortId: z.string().uuid(),
  userId: z.string().uuid(),
  decision: z.enum(["approve", "reject", "needs_info"]),
  message: z.string().max(1000).optional(),
});
export type ReviewJoinInput = z.infer<typeof ReviewJoinInput>;

export const SearchCohortsInput = z.object({
  query: z.string().trim().max(80).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});
export type SearchCohortsInput = z.infer<typeof SearchCohortsInput>;

export const DiscoverCohortsInput = z.object({
  query: z.string().trim().max(80).optional(),
  limit: z.number().int().min(1).max(50).default(24),
  /** ISO-2 country of the viewer, used to surface nearby cohorts first. */
  country: z.string().trim().length(2).optional(),
  /** Filter to cohorts carrying this tag slug. */
  tag: z.string().trim().max(40).optional(),
  /** Viewer's ZIP (drives 'zip' scope matching + local-first ranking). */
  zip: z.string().trim().max(10).optional(),
  /** 'zip' = cohorts covering the viewer's ZIP; 'country' = same country; 'all'. */
  scope: z.enum(["zip", "country", "all"]).default("all"),
});
export type DiscoverCohortsInput = z.infer<typeof DiscoverCohortsInput>;

/** A public cohort enriched with aggregates for the discover grid. */
export interface PublicCohortCard {
  id: string;
  handle: string;
  name: string;
  description: string | null;
  tagline: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  tags: string[];
  country: string;
  city: string | null;
  region: string | null;
  coverage_zips: string[];
  kind: CohortKind;
  member_count: number;
  project_count: number;
  value_cents: number;
  covers: boolean;
}

/** The caller's own cohort, card-shaped, with their membership status. */
export interface MyCohortCard extends PublicCohortCard {
  my_status: MemberStatus;
  my_access: AccessLevel;
}

export const HandleInput = z.object({ handle: Handle });

export const UpdateCohortProfileInput = z.object({
  cohortId: z.string().uuid(),
  name: z.string().trim().min(2).max(80).optional(),
  tagline: z.string().trim().max(140).optional(),
  description: z.string().trim().max(500).optional(),
  avatarUrl: z.union([z.string().url().max(500), z.literal("")]).optional(),
  coverUrl: z.union([z.string().url().max(500), z.literal("")]).optional(),
  joinQuestions: z.array(JoinQuestion).max(20).optional(),
  tags: TagList.optional(),
  kind: CohortKind.optional(),
  city: z.string().trim().max(80).optional(),
  region: z.string().trim().max(80).optional(),
  coverageZips: ZipList.optional(),
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
  cover_url: string | null;
  visibility: z.infer<typeof Visibility>;
  tags: string[];
  country: string;
  city: string | null;
  region: string | null;
  coverage_zips: string[];
  kind: CohortKind;
  created_by: string | null;
  last_activity_at: string;
  created_at: string;
  join_questions: JoinQuestion[];
}

const DECISION_TO_STATUS: Record<ReviewJoinInput["decision"], MemberStatus> = {
  approve: "approved",
  reject: "rejected",
  needs_info: "needs_info",
};

export function decisionToStatus(d: ReviewJoinInput["decision"]): MemberStatus {
  return DECISION_TO_STATUS[d];
}
