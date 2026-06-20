"use client";

import { useState } from "react";
import { Plus, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Stepper from "@/components/ui/Stepper";
import { Field, Textarea, Select } from "@/components/ui/Field";
import { createRequestAction } from "@/app/requests/actions";

const STEPS = ["Basics", "Type & scope", "Timing & size", "Access"];

export default function AddProjectButton({
  cohortId,
  handle,
  cohortKind = "service",
}: {
  cohortId: string;
  handle: string;
  cohortKind?: "service" | "group_buy";
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
            Set up a group purchase for this cohort — you&rsquo;ll coordinate it.
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

            {/* Step 2 — Type & scope */}
            <div className={step === 1 ? "space-y-4" : "hidden"}>
              <Field label="Project type" htmlFor="projectType" hint="Service runs an RFQ to vendors; group buy pools a volume product order.">
                <Select id="projectType" name="projectType" defaultValue={cohortKind}>
                  <option value="service">Service — work done per home (fencing, roofing, solar…)</option>
                  <option value="group_buy">Group buy — volume product order (mulch, propane, EV chargers…)</option>
                </Select>
              </Field>
              <Field label="What's included" htmlFor="serviceScope">
                <Select id="serviceScope" name="serviceScope" defaultValue="service">
                  <option value="service">Service / labor only</option>
                  <option value="equipment">Equipment / product only</option>
                  <option value="both">Equipment + installation</option>
                </Select>
              </Field>
              <Field label="How costs split" htmlFor="splitMethod" hint="You can fine-tune the split later, once the price is agreed.">
                <Select id="splitMethod" name="splitMethod" defaultValue="even">
                  <option value="even">Even split (equal shares)</option>
                  <option value="by_quantity">By quantity (e.g. footage / units)</option>
                  <option value="by_usage">By usage / consumption</option>
                  <option value="custom">Custom (you set it)</option>
                </Select>
              </Field>
            </div>

            {/* Step 3 — Timing & size */}
            <div className={step === 2 ? "space-y-4" : "hidden"}>
              <Field label="Why now — the driver" htmlFor="driver" optional hint="The motivation, e.g. fences are failing after the storm.">
                <Textarea id="driver" name="driver" rows={2} placeholder="Why is the group doing this now?" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min group size" htmlFor="minSize" hint="To unlock the deal.">
                  <Input id="minSize" name="minSize" type="number" min={1} max={100} defaultValue={2} />
                </Field>
                <Field label="Join deadline" htmlFor="joinDeadline" optional>
                  <Input id="joinDeadline" name="joinDeadline" type="date" />
                </Field>
              </div>
              <Field label="Target completion date" htmlFor="targetDate" optional hint="An aspirational “done by” date.">
                <Input id="targetDate" name="targetDate" type="date" />
              </Field>
            </div>

            {/* Step 4 — Access */}
            <div className={step === 3 ? "space-y-4" : "hidden"}>
              <Field label="Who can join" htmlFor="joinPolicy" hint="You can change this later.">
                <Select id="joinPolicy" name="joinPolicy" defaultValue="auto">
                  <option value="auto">Anyone in the cohort joins instantly</option>
                  <option value="approval">I approve each join request</option>
                </Select>
              </Field>
              <Field label="Who decides the vendor" htmlFor="decisionPolicy">
                <Select id="decisionPolicy" name="decisionPolicy" defaultValue="coordinator">
                  <option value="coordinator">I decide as coordinator</option>
                  <option value="vote">Members vote (advisory) — I confirm</option>
                </Select>
              </Field>
              <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text">
                <input name="locked" type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" />
                <span>
                  Lock the group
                  <span className="mt-0.5 block text-xs text-subtle">
                    Prevents anyone joining or leaving. Leave off while you&rsquo;re gathering members — you can lock it later.
                  </span>
                </span>
              </label>
              <p className="rounded-xl border border-border px-4 py-3 text-xs text-subtle">
                You&rsquo;ll be the coordinator. The agreement stays directly between members and the
                vendor — CohortBuy facilitates and never holds funds.
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
