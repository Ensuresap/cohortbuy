"use client";

import { useState } from "react";
import { Pencil, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fieldClass } from "@/components/ui/Field";
import CopyButton from "@/components/app/CopyButton";
import { saveRfqDraftAction } from "@/app/requests/actions";

export default function RfqDraftEditor({
  requestId,
  draft,
  canEdit,
}: {
  requestId: string;
  draft: string;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form action={saveRfqDraftAction} className="mt-2 space-y-2" onSubmit={() => setEditing(false)}>
        <input type="hidden" name="requestId" value={requestId} />
        <textarea name="body" rows={10} defaultValue={draft} className={fieldClass} autoFocus />
        <div className="flex items-center gap-2">
          <Button type="submit" size="md">Save</Button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-2"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-xs font-medium text-subtle hover:text-text"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {open ? "Hide draft" : "Show draft"}
      </button>
      {open && (
        <>
          <p className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-sm text-text">{draft}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CopyButton text={draft} label="Copy RFQ" />
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text transition hover:bg-surface-2"
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
