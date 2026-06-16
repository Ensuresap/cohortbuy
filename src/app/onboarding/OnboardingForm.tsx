"use client";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { completeOnboardingAction } from "./actions";

const selectClass =
  "min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none focus:ring-2 focus:ring-ring";

export default function OnboardingForm({ error }: { error?: string }) {
  return (
    <form action={completeOnboardingAction} className="mt-8 space-y-5">
      <div>
        <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-text">
          Your name
        </label>
        <Input id="displayName" name="displayName" required placeholder="Jordan Lee" />
      </div>

      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-text">
          Mobile number <span className="text-subtle">(for action alerts)</span>
        </label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          placeholder="+14155550123"
        />
        <p className="mt-1 text-xs text-subtle">Format: +1 then your number (E.164).</p>
      </div>

      <Checkbox
        id="smsOptIn"
        name="smsOptIn"
        label="Text me when an action is due (you can opt out anytime)."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="preferredChannel" className="mb-1.5 block text-sm font-medium text-text">
            Preferred channel
          </label>
          <select id="preferredChannel" name="preferredChannel" defaultValue="sms" className={selectClass}>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
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
      </div>

      {error && <p className="text-sm text-accent">{error}</p>}

      <Button type="submit" size="lg" className="w-full">
        Finish setup
      </Button>
    </form>
  );
}
