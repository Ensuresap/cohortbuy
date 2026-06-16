"use client";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createCohortAction } from "../actions";

const selectClass =
  "min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none focus:ring-2 focus:ring-ring";

export default function CreateCohortForm({ error }: { error?: string }) {
  return (
    <form action={createCohortAction} className="mt-8 space-y-5">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-text">
          Cohort name
        </label>
        <Input id="name" name="name" required placeholder="Maple St Fence Project" />
      </div>

      <div>
        <label htmlFor="handle" className="mb-1.5 block text-sm font-medium text-text">
          Handle <span className="text-subtle">(cohortbuy.com/your-handle)</span>
        </label>
        <Input id="handle" name="handle" required placeholder="maple-st-fence" />
        <p className="mt-1 text-xs text-subtle">3–30 chars: lowercase letters, numbers, hyphens.</p>
      </div>

      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-text">
          Description
        </label>
        <textarea id="description" name="description" rows={3} className={selectClass} placeholder="What is this cohort organizing?" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="visibility" className="mb-1.5 block text-sm font-medium text-text">
            Visibility
          </label>
          <select id="visibility" name="visibility" defaultValue="public" className={selectClass}>
            <option value="public">Public — searchable</option>
            <option value="private">Private — invite only</option>
          </select>
        </div>
        <div>
          <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-text">
            Category
          </label>
          <Input id="category" name="category" placeholder="Fencing" />
        </div>
      </div>

      <div>
        <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-text">
          Country
        </label>
        <select id="country" name="country" defaultValue="US" className={selectClass}>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="GB">United Kingdom</option>
          <option value="IN">India</option>
          <option value="AU">Australia</option>
        </select>
      </div>

      {error && <p className="text-sm text-accent">{error}</p>}

      <Button type="submit" size="lg" className="w-full">
        Create cohort
      </Button>
    </form>
  );
}
