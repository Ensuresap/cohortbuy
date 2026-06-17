"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";

/**
 * Coverage-area input for creating a cohort: a list of US ZIP codes the cohort
 * serves. Renders hidden inputs (name=`name`) so it submits in a plain form.
 */
export default function ZipCoverageField({
  name = "coverageZips",
  defaultValue = [],
  onChange,
}: {
  name?: string;
  defaultValue?: string[];
  onChange?: (zips: string[]) => void;
}) {
  const [zips, setZips] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function update(next: string[]) {
    setZips(next);
    onChange?.(next);
  }
  function add(raw: string) {
    const z = raw.trim();
    if (!/^\d{5}$/.test(z)) {
      setError("Enter a 5-digit ZIP code");
      return;
    }
    if (!zips.includes(z)) update([...zips, z].slice(0, 50));
    setDraft("");
    setError("");
  }

  return (
    <div>
      {zips.map((z) => (
        <input key={z} type="hidden" name={name} value={z} />
      ))}

      {zips.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {zips.map((z) => (
            <span
              key={z}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {z}
              <button
                type="button"
                onClick={() => update(zips.filter((x) => x !== z))}
                aria-label={`Remove ${z}`}
                className="rounded-full hover:text-primary-hover"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={draft}
          inputMode="numeric"
          maxLength={5}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder="Add a ZIP code (e.g. 78704)"
          aria-label="Add a coverage ZIP code"
          className="min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-text outline-none placeholder:text-subtle focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          aria-label="Add ZIP code"
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-border px-3 text-sm font-semibold text-text hover:bg-surface-2"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-accent">{error}</p>}
    </div>
  );
}
