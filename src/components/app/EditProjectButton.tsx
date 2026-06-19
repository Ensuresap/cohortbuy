"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import IconButton from "@/components/ui/IconButton";
import Modal from "@/components/ui/Modal";
import { Field, Textarea, Select } from "@/components/ui/Field";
import { updateProjectAction } from "@/app/requests/actions";

export default function EditProjectButton({
  requestId,
  title,
  category,
  description,
  driver,
  targetDate,
  serviceScope,
  splitMethod,
  minSize,
  joinPolicy,
  locked,
}: {
  requestId: string;
  title: string;
  category: string | null;
  description: string | null;
  driver: string | null;
  targetDate: string | null;
  serviceScope: "service" | "equipment" | "both";
  splitMethod: "even" | "by_quantity" | "by_usage" | "custom";
  minSize: number;
  joinPolicy: "auto" | "approval";
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="Target date" htmlFor="targetDate" optional>
                <Input id="targetDate" name="targetDate" type="date" defaultValue={targetDate ?? ""} />
              </Field>
              <Field label="Min group size" htmlFor="minSize">
                <Input id="minSize" name="minSize" type="number" min={1} max={100} defaultValue={minSize} />
              </Field>
            </div>
            <Field label="What's included" htmlFor="serviceScope">
              <Select id="serviceScope" name="serviceScope" defaultValue={serviceScope}>
                <option value="service">Service / labor only</option>
                <option value="equipment">Equipment / product only</option>
                <option value="both">Equipment + installation</option>
              </Select>
            </Field>
            <Field label="How costs split" htmlFor="splitMethod">
              <Select id="splitMethod" name="splitMethod" defaultValue={splitMethod}>
                <option value="even">Even split (equal shares)</option>
                <option value="by_quantity">By quantity (e.g. footage / units)</option>
                <option value="by_usage">By usage / consumption</option>
                <option value="custom">Custom (you set it)</option>
              </Select>
            </Field>
            <Field label="Who can join" htmlFor="joinPolicy">
              <Select id="joinPolicy" name="joinPolicy" defaultValue={joinPolicy}>
                <option value="auto">Anyone in the cohort joins instantly</option>
                <option value="approval">I approve each join request</option>
              </Select>
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
