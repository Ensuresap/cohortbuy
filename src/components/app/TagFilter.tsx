"use client";

import { useState } from "react";
import Link from "next/link";

export interface TagFilterItem {
  slug: string;
  label: string;
  href: string;
  active: boolean;
}

const chip = (active: boolean) =>
  "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
  (active
    ? "border-primary bg-primary text-primary-foreground"
    : "border-border text-muted hover:text-primary");

/** Relevant-tag filter row, collapsed to one line with a "+ more" expander. */
export default function TagFilter({
  items,
  allHref,
  allActive,
  initial = 12,
}: {
  items: TagFilterItem[];
  allHref: string;
  allActive: boolean;
  initial?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  const shown = expanded ? items : items.slice(0, initial);
  const hidden = items.length - shown.length;

  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      <Link href={allHref} className={chip(allActive)}>
        All
      </Link>
      {shown.map((t) => (
        <Link key={t.slug} href={t.href} className={chip(t.active)}>
          {t.label}
        </Link>
      ))}
      {(hidden > 0 || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "Show less" : `+${hidden} more`}
        </button>
      )}
    </div>
  );
}
