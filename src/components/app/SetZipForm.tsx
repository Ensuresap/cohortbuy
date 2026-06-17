"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { saveMyLocation } from "@/app/cohorts/actions";

/** ZIP entry that saves the viewer's location to their profile. */
export default function SetZipForm({
  defaultZip = "",
  variant = "default",
}: {
  defaultZip?: string;
  variant?: "default" | "hero";
}) {
  const router = useRouter();
  const [zip, setZip] = useState(defaultZip);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{5}$/.test(zip)) {
      setError("Enter a 5-digit ZIP code");
      return;
    }
    setBusy(true);
    setError("");
    const res = await saveMyLocation({ postalCode: zip });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  if (variant === "hero") {
    return (
      <form onSubmit={submit}>
        <div className="flex items-center gap-2 rounded-2xl bg-background p-2 shadow-lg ring-1 ring-black/5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-subtle" />
            <input
              value={zip}
              inputMode="numeric"
              maxLength={5}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter your ZIP code"
              aria-label="Your ZIP code"
              className="h-12 w-full rounded-xl bg-transparent pl-10 pr-3 text-base text-text outline-none placeholder:text-subtle"
            />
          </div>
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Finding…" : "Find local cohorts"}
          </Button>
        </div>
        {error && <p className="mt-1.5 text-sm font-medium text-white drop-shadow">{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <input
          value={zip}
          inputMode="numeric"
          maxLength={5}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
          placeholder="Your ZIP code"
          aria-label="Your ZIP code"
          className="min-h-touch w-44 rounded-full border border-border bg-surface-2 py-2 pl-9 pr-4 text-sm text-text outline-none placeholder:text-subtle focus:ring-2 focus:ring-ring"
        />
      </div>
      <Button type="submit" size="md" disabled={busy}>
        {busy ? "Saving…" : "Find local cohorts"}
      </Button>
      {error && <span className="text-xs text-accent">{error}</span>}
    </form>
  );
}
