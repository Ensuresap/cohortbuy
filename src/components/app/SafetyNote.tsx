import { ShieldAlert } from "lucide-react";

/** Reusable safety reminder shown wherever a requestor provides info. */
export default function SafetyNote() {
  return (
    <div className="flex gap-2 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-muted">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <p>
        <strong className="text-text">Never share private info</strong> like SSN, OTP, passwords, or
        bank/card details. CohortBuy never asks for these. If a cohort admin asks you for them,
        don&rsquo;t provide them — report it to{" "}
        <a href="mailto:helpline@cohortbuy.com" className="font-medium text-primary underline">
          helpline@cohortbuy.com
        </a>
        .
      </p>
    </div>
  );
}
