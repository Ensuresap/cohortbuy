"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";

/**
 * "AI pick" badge on the recommended quote. Clicking it reveals the AI's
 * rationale in a small popover (kept out of the way until asked for).
 */
export default function AiPickBadge({ rationale }: { rationale: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative ml-2 inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 transition hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300"
        aria-expanded={open}
        title="Why the AI picked this"
      >
        <Sparkles className="h-3 w-3" /> AI pick
      </button>
      {open && (
        <span className="absolute left-0 top-full z-20 mt-1 block w-72 rounded-xl border border-border bg-surface p-3 text-left shadow-lg">
          <span className="mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <Sparkles className="h-3 w-3" /> Why the AI picked this
            </span>
            <button type="button" onClick={() => setOpen(false)} className="text-subtle hover:text-text" aria-label="Close">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
          <span className="block text-xs leading-relaxed text-muted">
            {rationale || "No rationale recorded. Run the AI Advisor to generate one."}
          </span>
        </span>
      )}
    </span>
  );
}
