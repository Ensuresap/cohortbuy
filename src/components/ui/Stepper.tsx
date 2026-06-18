"use client";

import { Check } from "lucide-react";

/** Horizontal numbered stepper shared by multi-step wizards. */
export default function Stepper({ steps, current }: { steps: string[]; current: number }) {
  const last = steps.length - 1;
  return (
    <>
      <ol className="flex items-center">
        {steps.map((title, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={title} className="flex flex-1 items-center last:flex-none">
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
                <span className={"hidden text-sm font-medium sm:inline " + (active ? "text-text" : "text-subtle")}>
                  {title}
                </span>
              </div>
              {i < last && <span className={"mx-3 h-px flex-1 " + (done ? "bg-primary" : "bg-border")} />}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-subtle sm:hidden">
        Step {current + 1} of {steps.length} · {steps[current]}
      </p>
    </>
  );
}
