"use client";

import { useState } from "react";

function maskEmail(v: string): string {
  const [local, domain] = v.split("@");
  if (!domain) return "•••";
  const head = local.slice(0, 1);
  return `${head}•••@${domain}`;
}
function maskPhone(v: string): string {
  const tail = v.replace(/\D/g, "").slice(-4);
  return tail ? `•••• ${tail}` : "•••";
}

/**
 * Masks PII (email/phone) by default in admin views; reveals on click. Keeps
 * sensitive values out of casual sight without removing access when needed.
 */
export default function MaskedValue({ value, type = "text" }: { value: string; type?: "email" | "phone" | "text" }) {
  const [shown, setShown] = useState(false);
  if (!value) return <span className="text-subtle">—</span>;
  const masked = type === "email" ? maskEmail(value) : type === "phone" ? maskPhone(value) : "•••";

  if (shown) {
    if (type === "email") {
      return <a href={`mailto:${value}`} className="text-primary hover:underline">{value}</a>;
    }
    return <span className="text-text">{value}</span>;
  }
  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      className="inline-flex items-center gap-1 text-subtle hover:text-text"
      title="Click to reveal"
    >
      {masked} <span aria-hidden="true" className="text-[10px]">show</span>
    </button>
  );
}
