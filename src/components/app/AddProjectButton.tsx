"use client";

import { useState } from "react";
import { Plus, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Stepper from "@/components/ui/Stepper";
import { Field, Textarea } from "@/components/ui/Field";
import { createRequestAction } from "@/app/requests/actions";

const STEPS = ["Basics", "Details", "Access"];

export default function AddProjectButton({
  cohortId,
  handle,
}: {
  cohortId: string;
  handle: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [touched, setTouched] = useState(false);
  const last = STEPS.length - 1;
  const step0Valid = title.trim().length >= 2;

  function close() {
    setOpen(false);
    setStep(0);
    setTitle("");
    setTouched(false);
  }
  function next() {
    if (step === 0 && !step0Valid) {
      setTouched(true);
      return;
    }
    setStep((s) => Math.min(s + 1, last));
  }

  return (
    <>
      <Button size="md" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" /> Add project
      </Button>

      {open && (
        <Modal title="Start a project" onClose={close}>
          <p className="-mt-2 mb-4 text-sm text-muted">
            Kick off a group purchase for this cohort — you&rsquo;ll coordinate it.
          </p>
          <Stepper steps={STEPS} current={step} />

          <form
            action={createRequestAction}
            className="mt-5"
            onKeyDown={(e) => {
              const el = e.target as HTMLElement;
              if (e.key === "Enter" && el.tagName === "INPUT" && step !== last) {
                e.preventDefault();
                next();
              }
            }}
          >
            <input type="hidden" name="cohortId" value={cohortId} />
            <input type="hidden" name="handle" value={handle} />

            {/* Step 1 — Basics */}
            <div className={step === 0 ? "space-y-4" : "hidden"}>
              <Field label="Project title" htmlFor="title">
                <Input
                  id="title"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Backyard fence replacement"
                />
                {touched && !step0Valid && (
                  <p className="mt-1 text-xs text-accent">Give the project a name (2+ characters).</p>
                )}
              </Field>
              <Field label="Category" htmlFor="category" optional hint="Helps match the right vendors (e.g. Fencing, Solar).">
                <Input id="category" name="category" placeholder="Fencing" />
              </Field>
              <Field label="What is this project?" htmlFor="description" optional>
                <Textarea id="description" name="description" rows={3} placeholder="What needs doing?" />
              </Field>
            </div>

            {/* Step 2 — Details */}
            <div className={step === 1 ? "space-y-4" : "hidden"}>
              <Field label="Why now — the driver" htmlFor="driver" optional hint="The motivation, e.g. fences are failing after the storm.">
                <Textarea id="driver" name="driver" rows={3} placeholder="Why is the group doing this now?" />
              </Field>
              <Field label="Target date" htmlFor="targetDate" optional hint="An aspirational “done by” date.">
                <Input id="targetDate" name="targetDate" type="date" />
              </Field>
            </div>

            {/* Step 3 — Access */}
            <div className={step === 2 ? "space-y-4" : "hidden"}>
              <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text">
                <input name="locked" type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" />
                <span>
                  Lock the group
                  <span className="mt-0.5 block text-xs text-subtle">
                    Prevents anyone joining or leaving. Leave off while you&rsquo;re gathering members — you can lock it later once the group is set.
                  </span>
                </span>
              </label>
              <p className="rounded-xl border border-border px-4 py-3 text-xs text-subtle">
                You&rsquo;ll be the coordinator. Members can join while the project is open, add their scope,
                and the agreement stays directly between members and the vendor.
              </p>
            </div>

            {/* Nav */}
            <div className="mt-6 flex items-center justify-between gap-3">
              {step > 0 ? (
                <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={close}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-2"
                >
                  Cancel
                </button>
              )}
              {step < last ? (
                <Button type="button" onClick={next}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit">Create project</Button>
              )}
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
