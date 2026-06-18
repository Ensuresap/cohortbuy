"use client";

import type { LucideIcon } from "lucide-react";

/** App-standard round icon button used in header action bars. */
export default function IconButton({
  label,
  onClick,
  Icon,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  Icon: LucideIcon;
  tone?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={
        "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface shadow-sm transition hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
        (tone === "danger" ? "text-accent hover:text-accent" : "text-muted hover:text-text")
      }
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
    </button>
  );
}
