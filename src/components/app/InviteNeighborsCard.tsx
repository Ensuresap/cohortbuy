"use client";

import { useState } from "react";
import { Copy, Check, MessageCircle, UserPlus } from "lucide-react";

/**
 * Referral / growth card. Builds a shareable cohort link from the current
 * origin and offers copy + WhatsApp share. If the user has no cohort yet,
 * it nudges them to create one.
 */
export default function InviteNeighborsCard({
  handle,
  cohortName,
  reward,
}: {
  handle: string | null;
  cohortName: string | null;
  reward: number;
}) {
  const [copied, setCopied] = useState(false);

  if (!handle) {
    return (
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-text">Grow your circle</h2>
        </div>
        <p className="mt-1.5 text-sm text-muted">
          Start a cohort, then invite neighbors to pool demand together.
        </p>
        <a
          href="/cohorts/new"
          className="mt-3 inline-flex min-h-touch items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover"
        >
          Create a cohort
        </a>
      </section>
    );
  }

  const link = typeof window !== "undefined" ? `${window.location.origin}/${handle}` : `/${handle}`;
  const msg = `Join me on ${cohortName ?? "our neighborhood cohort"} — we pool demand to get better prices on local services. ${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-text">Invite neighbors</h2>
      </div>
      <p className="mt-1.5 text-sm text-muted">
        More neighbors means better deals — and you earn{" "}
        <span className="font-semibold text-primary">+{reward} tokens</span> for each one who joins{cohortName ? ` ${cohortName}` : ""}.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-text transition hover:bg-surface-2"
        >
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(msg)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-touch items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
      </div>
    </section>
  );
}
