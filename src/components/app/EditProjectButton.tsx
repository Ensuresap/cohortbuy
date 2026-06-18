"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import IconButton from "@/components/ui/IconButton";
import Modal from "@/components/ui/Modal";
import { Field, Textarea } from "@/components/ui/Field";
import { updateProjectAction } from "@/app/requests/actions";

export default function EditProjectButton({
  requestId,
  title,
  category,
  description,
  driver,
  targetDate,
  locked,
}: {
  requestId: string;
  title: string;
  category: string | null;
  description: string | null;
  driver: string | null;
  targetDate: string | null;
  locked: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton label="Edit project" Icon={Pencil} onClick={() => setOpen(true)} />

      {open && (
        <Modal title="Edit project" onClose={() => setOpen(false)}>
          <form action={updateProjectAction} className="space-y-4">
            <input type="hidden" name="requestId" value={requestId} />
            <Field label="Project title" htmlFor="title">
              <Input id="title" name="title" required defaultValue={title} placeholder="Project title" />
            </Field>
            <Field label="Category" htmlFor="category" optional>
              <Input id="category" name="category" defaultValue={category ?? ""} placeholder="e.g. Fencing" />
            </Field>
            <Field label="What is this project?" htmlFor="description" optional>
              <Textarea id="description" name="description" rows={3} defaultValue={description ?? ""} placeholder="What needs doing?" />
            </Field>
            <Field label="Why now — the driver" htmlFor="driver" optional>
              <Textarea id="driver" name="driver" rows={2} defaultValue={driver ?? ""} placeholder="The motivation behind it" />
            </Field>
            <Field label="Target date" htmlFor="targetDate" optional>
              <Input id="targetDate" name="targetDate" type="date" defaultValue={targetDate ?? ""} />
            </Field>
            <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text">
              <input name="locked" type="checkbox" defaultChecked={locked} className="mt-0.5 h-4 w-4 accent-primary" />
              <span>
                Lock the group
                <span className="mt-0.5 block text-xs text-subtle">Prevents anyone joining or leaving.</span>
              </span>
            </label>

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
        </Modal>
      )}
    </>
  );
}
