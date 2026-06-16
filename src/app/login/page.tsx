"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=/onboarding` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="font-display text-3xl font-semibold text-text">
          Sign in to CohortBuy
        </h1>
        {sent ? (
          <div className="mt-6 rounded-2xl border border-primary/30 bg-surface-2 px-6 py-5">
            <p className="font-display text-lg font-semibold text-text">Check your email ✉️</p>
            <p className="mt-1 text-sm text-muted">
              We sent a magic link to <span className="font-medium">{email}</span>. Open it on this device to continue.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <p className="text-muted">Enter your email and we&rsquo;ll send a magic link — no password.</p>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@neighborhood.com"
              aria-label="Email address"
            />
            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? "Sending…" : "Send magic link"}
            </Button>
            {error && <p className="text-sm text-accent">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
