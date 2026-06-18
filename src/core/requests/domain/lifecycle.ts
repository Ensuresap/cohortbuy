import type { RequestStatus } from "./request";

/**
 * Configurable lifecycle (Addendum E). One state machine; the project's profile
 * (project_type) selects which ordered track of stages it runs. The UI reads the
 * track to gate each phase's inputs and to guide the coordinator one step at a time.
 */

export const SERVICE_TRACK: RequestStatus[] = [
  "forming", "scoping", "research", "rfq", "deciding", "contracting", "funding", "in_progress", "completed",
];

// Group buy = pre-negotiated product order: gather members, confirm product/price,
// collect shares, fulfil. Skips per-home scoping, RFQ, quote-decision, contracting.
export const GROUP_BUY_TRACK: RequestStatus[] = [
  "forming", "research", "funding", "in_progress", "completed",
];

export function trackFor(projectType: "service" | "group_buy"): RequestStatus[] {
  return projectType === "group_buy" ? GROUP_BUY_TRACK : SERVICE_TRACK;
}

/** One-line "what to do now" per stage. */
export const STAGE_GUIDE: Record<RequestStatus, string> = {
  forming: "Invite neighbors until the group is big enough to be worth it.",
  scoping: "Each member adds what they need, so vendors can price it accurately.",
  research: "Line up the vendors (or product & price) you'll take forward.",
  rfq: "Collect quotes from the vendors you're considering.",
  deciding: "Compare the quotes and pick the winner together.",
  contracting: "Record the agreement, and set how you'll contract & pay.",
  funding: "Split the cost and track who has paid — settled off-platform.",
  in_progress: "Work is underway — confirm it once it's done.",
  completed: "Done. The project is complete.",
  cancelled: "This project was cancelled.",
};

/**
 * Whether the project can advance off its current stage yet. Returns a blocking
 * hint string if a prerequisite isn't met, otherwise null (ready to advance).
 */
export function advanceBlockedReason(
  status: RequestStatus,
  counts: { participants: number; minSize: number; scope: number; quotes: number; hasSelection: boolean; shares: number; agreedAmount: boolean }
): string | null {
  switch (status) {
    case "scoping":
      return counts.scope >= 1 ? null : "Add at least one scope item before moving on.";
    case "rfq":
      return counts.quotes >= 1 ? null : "Record at least one quote first.";
    case "deciding":
      return counts.hasSelection ? null : "Select a winning quote first.";
    case "funding":
      return counts.shares >= 1 ? null : "Generate the cost split first.";
    default:
      return null; // forming, research, contracting, in_progress advance freely
  }
}
