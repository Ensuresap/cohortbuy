"use client";

import { useState } from "react";
import { Info, Tag, MapPin, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import TagPicker from "@/components/app/TagPicker";
import ZipCoverageField from "@/components/app/ZipCoverageField";
import type { TagCatalogItem } from "@/core/cohorts/domain/cohort";
import { createCohortAction } from "../actions";

const fieldClass =
  "min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none transition placeholder:text-subtle focus:ring-2 focus:ring-ring";
const labelClass = "mb-1.5 block text-sm font-medium text-text";

const STEPS = [
  { icon: Info, title: "Basics", hint: "Name your cohort and tell neighbors what it's for." },
  { icon: Tag, title: "Type & tags", hint: "Help the right neighbors discover you." },
  { icon: MapPin, title: "Location", hint: "Cohorts are local — set the ZIP codes you serve." },
] as const;

export default function CreateCohortForm({
  error,
  tagCatalog,
}: {
  error?: string;
  tagCatalog: TagCatalogItem[];
}) {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<"service" | "group_buy">("service");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [touched, setTouched] = useState(false);

  const handleValid = /^[a-z0-9-]{3,30}$/.test(handle);
  const step0Valid = name.trim().length >= 2 && handleValid;
  const last = STEPS.length - 1;

  function next() {
    if (step === 0 && !step0Valid) {
      setTouched(true);
      return;
    }
    setStep((s) => Math.min(s + 1, last));
  }

  return (
    <form
      action={createCohortAction}
      className="mt-8"
      // Don't let Enter in a text field submit the whole form mid-wizard.
      onKeyDown={(e) => {
        const el = e.target as HTMLElement;
        if (e.key === "Enter" && el.tagName === "INPUT" && step !== last) {
          e.preventDefault();
          next();
        }
      }}
    >
      {/* Stepper */}
      <ol className="flex items-center">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={s.title} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2">
                <span
                  className={
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition " +
                    (done
                      ? "bg-primary text-primary-foreground"
                      : active
                        ? "bg-primary/15 text-primary ring-2 ring-primary"
                        : "bg-surface-2 text-subtle")
                  }
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span
                  className={
                    "hidden text-sm font-medium sm:inline " +
                    (active ? "text-text" : "text-subtle")
                  }
                >
                  {s.title}
                </span>
              </div>
              {i < last && (
                <span className={"mx-3 h-px flex-1 " + (done ? "bg-primary" : "bg-border")} />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-subtle sm:hidden">
        Step {step + 1} of {STEPS.length} · {STEPS[step].title}
      </p>

      {/* Card */}
      <section className="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {(() => {
              const Icon = STEPS[step].icon;
              return <Icon className="h-[18px] w-[18px]" />;
            })()}
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-text">{STEPS[step].title}</h2>
            <p className="text-xs text-subtle">{STEPS[step].hint}</p>
          </div>
        </div>

        {/* Step 1 — Basics */}
        <div className={step === 0 ? "space-y-4" : "hidden"}>
          <div>
            <label htmlFor="name" className={labelClass}>
              Cohort name
            </label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Maple St Fence Project"
            />
          </div>

          <div>
            <label htmlFor="handle" className={labelClass}>
              Handle <span className="font-normal text-subtle">(cohortbuy.com/your-handle)</span>
            </label>
            <Input
              id="handle"
              name="handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              placeholder="maple-st-fence"
            />
            <p className="mt-1 text-xs text-subtle">3–30 chars: lowercase letters, numbers, hyphens.</p>
            {touched && !step0Valid && (
              <p className="mt-1 text-xs text-accent">
                Enter a name (2+ chars) and a valid handle to continue.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="description" className={labelClass}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className={fieldClass}
              placeholder="What is this cohort organizing?"
            />
          </div>
        </div>

        {/* Step 2 — Type & tags */}
        <div className={step === 1 ? "space-y-4" : "hidden"}>
          <div>
            <label htmlFor="kind" className={labelClass}>
              Cohort type
            </label>
            <select
              id="kind"
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as "service" | "group_buy")}
              className={fieldClass}
            >
              <option value="service">Service — work done per home (fencing, roofing, solar…)</option>
              <option value="group_buy">Group buy — volume product order (mulch, propane, EV chargers…)</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Tags</label>
            <TagPicker name="tags" catalog={tagCatalog} kind={kind} />
            <p className="mt-1 text-xs text-subtle">Pick common ones or add your own.</p>
          </div>
        </div>

        {/* Step 3 — Location & coverage */}
        <div className={step === 2 ? "space-y-4" : "hidden"}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="city" className={labelClass}>
                City <span className="font-normal text-subtle">(optional)</span>
              </label>
              <Input id="city" name="city" placeholder="Austin" />
            </div>
            <div>
              <label htmlFor="region" className={labelClass}>
                State <span className="font-normal text-subtle">(optional)</span>
              </label>
              <Input id="region" name="region" placeholder="TX" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Coverage area (ZIP codes)</label>
            <ZipCoverageField name="coverageZips" />
            <p className="mt-1 text-xs text-subtle">
              Add your own and any nearby neighborhoods — people in these ZIPs will find you.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="country" className={labelClass}>
                Country
              </label>
              <select id="country" name="country" defaultValue="US" className={fieldClass}>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="IN">India</option>
                <option value="AU">Australia</option>
              </select>
            </div>
            <div>
              <label htmlFor="visibility" className={labelClass}>
                Visibility
              </label>
              <select id="visibility" name="visibility" defaultValue="public" className={fieldClass}>
                <option value="public">Public — searchable</option>
                <option value="private">Private — invite only</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <p className="mt-4 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {/* Nav */}
      <div className="mt-5 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        ) : (
          <span />
        )}

        {step < last ? (
          <Button type="button" onClick={next} disabled={step === 0 && touched && !step0Valid}>
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" size="lg">
            Create cohort
          </Button>
        )}
      </div>
    </form>
  );
}
