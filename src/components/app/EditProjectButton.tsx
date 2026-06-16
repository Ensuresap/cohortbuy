"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { updateProjectAction } from "@/app/requests/actions";

const fieldClass =
  "min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none placeholder:text-subtle focus:ring-2 focus:ring-ring";

export default function EditProjectButton({
  requestId,
  title,
  category,
  description,
  driver,
}: {
  requestId: string;
  title: string;
  category: string | null;
  description: string | null;
  driver: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-text hover:bg-surface-2"
      >
        <Pencil className="h-4 w-4" /> Edit
      </button>
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold text-text">Edit project</h3>
            <form action={updateProjectAction} className="mt-4 space-y-2">
              <input type="hidden" name="requestId" value={requestId} />
              <input name="title" required defaultValue={title} placeholder="Project title" className={fieldClass} />
              <input name="category" defaultValue={category ?? ""} placeholder="Category (e.g. Fencing)" className={fieldClass} />
              <textarea name="description" rows={3} defaultValue={description ?? ""} placeholder="What is this project? What needs doing?" className={fieldClass} />
              <textarea name="driver" rows={2} defaultValue={driver ?? ""} placeholder="Why now? The driver / motivation" className={fieldClass} />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-2"
                >
                  Cancel
                </button>
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
