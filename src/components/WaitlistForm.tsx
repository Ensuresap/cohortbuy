"use client";

import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

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

    // Graceful path when Supabase isn't configured yet (local setup).
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
      // Unique-violation = already signed up; treat as success.
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
      <div className="rounded-2xl border border-forest/20 bg-forest-light px-6 py-5 text-forest-dark shadow-soft">
        <p className="font-display text-lg font-semibold">Welcome aboard 🎉</p>
        <p className="mt-1 text-sm text-ink/80">{message}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl bg-white p-2 shadow-soft sm:flex sm:items-stretch sm:gap-2"
    >
      <div className="flex-1 sm:flex sm:gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@neighborhood.com"
          aria-label="Email address"
          className="w-full rounded-xl bg-cream/60 px-4 py-3 text-ink outline-none placeholder:text-ink/40 focus:ring-2 focus:ring-forest/40 sm:mb-0"
        />
        <input
          type="text"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="ZIP"
          aria-label="ZIP code"
          inputMode="numeric"
          className="mt-2 w-full rounded-xl bg-cream/60 px-4 py-3 text-ink outline-none placeholder:text-ink/40 focus:ring-2 focus:ring-forest/40 sm:mt-0 sm:w-28"
        />
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-2 w-full rounded-xl bg-forest px-6 py-3 font-semibold text-cream transition hover:bg-forest-dark disabled:opacity-60 sm:mt-0 sm:w-auto"
      >
        {status === "loading" ? "Joining…" : "Join the waitlist"}
      </button>
      {status === "error" && (
        <p className="mt-2 px-2 text-sm text-clay sm:hidden">{message}</p>
      )}
    </form>
  );
}
