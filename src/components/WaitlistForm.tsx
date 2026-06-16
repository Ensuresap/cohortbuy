"use client";

import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Status = "idle" | "loading" | "success" | "error";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setMessage("");

    if (!isSupabaseConfigured || !supabase) {
      setStatus("success");
      setMessage(
        "You're on the list! (Dev note: add your Supabase anon key to .env.local to persist signups.)"
      );
      setEmail("");
      setZip("");
      return;
    }

    const { error } = await supabase
      .from("waitlist")
      .insert({ email, zip: zip || null, source: "landing" });

    if (error) {
      if (error.code === "23505") {
        setStatus("success");
        setMessage("You're already on the list — we'll be in touch soon.");
      } else {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
      return;
    }

    setStatus("success");
    setMessage("You're on the list! We'll reach out as we open up neighborhoods.");
    setEmail("");
    setZip("");
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-primary/30 bg-surface-2 px-6 py-5 shadow-soft">
        <p className="font-display text-lg font-semibold text-text">
          Welcome aboard 🎉
        </p>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl bg-surface p-2 shadow-soft sm:flex sm:items-stretch sm:gap-2"
    >
      <div className="flex-1 sm:flex sm:gap-2">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@neighborhood.com"
          aria-label="Email address"
        />
        <Input
          type="text"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="ZIP"
          aria-label="ZIP code"
          inputMode="numeric"
          className="mt-2 sm:mt-0 sm:w-28"
        />
      </div>
      <Button
        type="submit"
        size="lg"
        disabled={status === "loading"}
        className="mt-2 w-full sm:mt-0 sm:w-auto"
      >
        {status === "loading" ? "Joining…" : "Join the waitlist"}
      </Button>
      {status === "error" && (
        <p className="mt-2 px-2 text-sm text-accent sm:hidden">{message}</p>
      )}
    </form>
  );
}
