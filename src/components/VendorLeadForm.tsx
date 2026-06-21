"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Status = "idle" | "loading" | "success" | "error";

const fieldClass =
  "min-h-touch w-full rounded-xl border border-border bg-surface px-4 py-3 text-text outline-none placeholder:text-subtle focus:ring-2 focus:ring-ring";

export default function VendorLeadForm() {
  const [form, setForm] = useState({ business: "", contactName: "", email: "", phone: "", categories: "", serviceArea: "", message: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.business || !form.email) return;
    setStatus("loading");
    setMessage("");
    let res: Response;
    try {
      res = await fetch("/api/vendor-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "vendors" }),
      });
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
      return;
    }
    const json: { error?: { code?: string } } = await res.json().catch(() => ({}));
    if (res.ok || json.error?.code === "not_configured") {
      setStatus("success");
      setMessage("Thanks — we'll be in touch about listing your business.");
      return;
    }
    setStatus("error");
    setMessage("Something went wrong. Please try again.");
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
        <p className="font-medium text-primary">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Business name *" value={form.business} onChange={(e) => set("business", e.target.value)} required />
        <Input placeholder="Your name" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
        <Input type="email" placeholder="Email *" value={form.email} onChange={(e) => set("email", e.target.value)} required />
        <Input placeholder="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        <Input placeholder="What you offer (e.g. fencing, solar)" value={form.categories} onChange={(e) => set("categories", e.target.value)} />
        <Input placeholder="Areas you serve (e.g. Austin 787xx)" value={form.serviceArea} onChange={(e) => set("serviceArea", e.target.value)} />
      </div>
      <textarea rows={3} placeholder="Anything else? (optional)" value={form.message} onChange={(e) => set("message", e.target.value)} className={fieldClass} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={status === "loading"}>{status === "loading" ? "Sending…" : "Get listed"}</Button>
        {status === "error" && <span className="text-sm text-accent">{message}</span>}
      </div>
      <p className="text-xs text-subtle">No fee to get listed during the preview. We&rsquo;ll reach out before sharing your business with any group.</p>
    </form>
  );
}
