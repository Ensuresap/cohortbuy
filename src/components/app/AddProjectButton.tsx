"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createRequestAction } from "@/app/requests/actions";

const fieldClass =
  "min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none placeholder:text-subtle focus:ring-2 focus:ring-ring";

export default function AddProjectButton({
  cohortId,
  handle,
}: {
  cohortId: string;
  handle: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="md" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" /> Add project
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold text-text">Start a project</h3>
            <p className="mt-1 text-sm text-muted">
              Kick off a group purchase for this cohort. You&rsquo;ll coordinate it.
            </p>
            <form action={createRequestAction} className="mt-4 space-y-2">
              <input type="hidden" name="cohortId" value={cohortId} />
              <input type="hidden" name="handle" value={handle} />
              <input name="title" required placeholder="e.g. Backyard fence replacement" className={fieldClass} />
              <input name="category" placeholder="Category (e.g. Fencing)" className={fieldClass} />
              <textarea name="description" rows={2} placeholder="What is this project? What needs doing?" className={fieldClass} />
              <textarea name="driver" rows={2} placeholder="Why now? The driver / motivation (e.g. fences are failing, storm damage)" className={fieldClass} />
              <label className="block text-xs font-medium text-subtle">
                Target date (optional)
                <input name="targetDate" type="date" className={`${fieldClass} mt-1`} />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-2"
                >
                  Cancel
                </button>
                <Button type="submit">Create project</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
