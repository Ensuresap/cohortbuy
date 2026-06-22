/**
 * Marketing copy — lifecycle steps and trust posture.
 *
 * Ported from the cohort-connect editorial site so the landing/marketing
 * surfaces share one source of truth. Pure content (no styling); consume from
 * server or client components. Asset paths point at /public (see IMAGES).
 */

/** How a cohort goes from one neighbor's idea to a signed contract. */
export interface LifecycleStep {
  /** Two-digit ordinal, e.g. "01". */
  n: string;
  /** Short label. */
  key: string;
  /** One-line description. */
  body: string;
}

export const LIFECYCLE: LifecycleStep[] = [
  {
    n: "01",
    key: "Spark",
    body: "Someone in the group names a need. The agent drafts the project.",
  },
  {
    n: "02",
    key: "Group",
    body: "Invites go out. A quorum forms. The cohort launches.",
  },
  {
    n: "03",
    key: "Scope",
    body: "Shared specs are written together — one source of truth.",
  },
  {
    n: "04",
    key: "RFQ",
    body: "Local vendors are sourced, quoted, and compared side by side.",
  },
  {
    n: "05",
    key: "Decide",
    body: "The cohort votes. Consent is recorded, never overridden.",
  },
  {
    n: "06",
    key: "Deliver",
    body: "Contracts, payment, milestones — tracked to sign-off.",
  },
];

/**
 * Trust posture — the platform is a facilitator, not a principal.
 * Use these as footer/marketing reassurance lines.
 */
export interface PostureItem {
  label: string;
  detail: string;
}

export const POSTURE: PostureItem[] = [
  {
    label: "Funds stay off-platform",
    detail:
      "CohortBuy never holds your money. You pay the vendor directly or via a trusted escrow partner — we just keep it transparent.",
  },
  {
    label: "Docs live in your Drive",
    detail:
      "Contracts, quotes, and scope live in your own shared drive — owned by you. We store references, not your files.",
  },
  {
    label: "Agent never signs",
    detail:
      "The agent drafts, sources, and compares. Every decision and signature stays with the cohort.",
  },
];

/** One-line summary of the posture, for taglines and footers. */
export const POSTURE_TAGLINE = "CohortBuy — facilitator, not principal.";

/**
 * Marketing imagery copied into /public from the cohort-connect assets.
 * Use with next/image, e.g. <Image src={IMAGES.solar} ... />.
 * Note: the cohort-connect hero used an ambient loop video hosted remotely
 * (not a repo file), so it was not copied — use heroNeighborhood as the still.
 */
export const IMAGES = {
  heroNeighborhood: "/hero-neighborhood.jpg",
  communityBanner: "/community-banner.jpg",
  blogHero: "/blog-hero.jpg",
  solar: "/cohort-solar.jpg",
  exterior: "/cohort-exterior.jpg",
  ev: "/cohort-ev.jpg",
  trees: "/cohort-trees.jpg",
} as const;
