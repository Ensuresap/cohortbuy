"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

/** App-standard modal shell: centered card, scrollable, title + close. */
export default function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={
          "max-h-[85vh] w-full overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-soft " +
          (wide ? "max-w-lg" : "max-w-md")
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-text">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
