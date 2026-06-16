"use client";

import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { updateProfileAction } from "./actions";

const selectClass =
  "min-h-touch w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-text outline-none focus:ring-2 focus:ring-ring";

type ProfileValues = {
  display_name: string | null;
  phone: string | null;
  sms_opt_in: boolean;
  preferred_channel: string;
  country: string;
};

export default function ProfileForm({
  profile,
  error,
}: {
  profile: ProfileValues;
  error?: string;
}) {
  return (
    <form action={updateProfileAction} className="mt-8 space-y-5">
      <div>
        <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-text">
          Your name
        </label>
        <Input id="displayName" name="displayName" required defaultValue={profile.display_name ?? ""} />
      </div>

      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-text">
          Mobile number <span className="text-subtle">(for action alerts)</span>
        </label>
        <Input id="phone" name="phone" type="tel" inputMode="tel" placeholder="+14155550123" defaultValue={profile.phone ?? ""} />
        <p className="mt-1 text-xs text-subtle">Format: +1 then your number (E.164).</p>
      </div>

      <Checkbox
        id="smsOptIn"
        name="smsOptIn"
        defaultChecked={profile.sms_opt_in}
        label="Text me when an action is due."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="preferredChannel" className="mb-1.5 block text-sm font-medium text-text">
            Preferred channel
          </label>
          <select id="preferredChannel" name="preferredChannel" defaultValue={profile.preferred_channel} className={selectClass}>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
        </div>
        <div>
          <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-text">
            Country
          </label>
          <select id="country" name="country" defaultValue={profile.country} className={selectClass}>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="IN">India</option>
            <option value="AU">Australia</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-accent">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" size="lg">Save changes</Button>
        <Link
          href="/account"
          className="inline-flex min-h-touch items-center rounded-xl border border-border px-6 text-base font-semibold text-text hover:bg-surface-2"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
