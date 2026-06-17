"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { slugifyTag, humanizeTag, type TagCatalogItem } from "@/core/cohorts/domain/cohort";

/**
 * Multi-tag picker: pick from platform-managed common tags or add custom ones.
 * Renders hidden inputs (name=`name`) so it submits inside a plain form, and
 * also calls onChange for client-driven forms (e.g. the edit modal).
 */
export default function TagPicker({
  name = "tags",
  catalog,
  defaultValue = [],
  kind,
  onChange,
}: {
  name?: string;
  catalog: TagCatalogItem[];
  defaultValue?: string[];
  kind?: "service" | "group_buy";
  onChange?: (tags: string[]) => void;
}) {
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState("");

  function update(next: string[]) {
    const uniq = Array.from(new Set(next)).slice(0, 10);
    setTags(uniq);
    onChange?.(uniq);
  }
  function add(raw: string) {
    const s = slugifyTag(raw);
    if (s && !tags.includes(s)) update([...tags, s]);
    setDraft("");
  }
  function remove(s: string) {
    update(tags.filter((t) => t !== s));
  }

  const labelFor = (slug: string) =>
    catalog.find((c) => c.slug === slug)?.label ?? humanizeTag(slug);

  const suggestions = catalog
    .filter((c) => (!kind || c.kind === kind || c.kind === "both") && !tags.includes(c.slug))
    .slice(0, 16);

  return (
    <div>
      {/* submitted values */}
      {tags.map((t) => (
        <input key={t} type="hidden" name={name} value={t} />
      ))}

      {/* selected */}
      {tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {labelFor(t)}
              <button
                type="button"
                onClick={() => remove(t)}
                aria-label={`Remove ${labelFor(t)}`}
                className="rounded-full hover:text-primary-hover"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* custom add */}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder="Add a tag and press Enter"
          aria-label="Add a custom tag"
          className="min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-text outline-none placeholder:text-subtle focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          aria-label="Add tag"
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-border px-3 text-sm font-semibold text-text hover:bg-surface-2"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {/* suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-2">
          <p className="mb-1.5 text-xs text-subtle">Common tags</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => add(c.slug)}
                className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted transition hover:border-primary/40 hover:text-primary"
              >
                + {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
