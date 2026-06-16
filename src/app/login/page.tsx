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

  async function handleGoogle() {
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=/dashboard` },
    });
    if (error) setError(error.message);
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
          <div className="mt-6 space-y-4">
            <button
              type="button"
              onClick={handleGoogle}
              className="flex min-h-touch w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text hover:bg-surface-2"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-subtle">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
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
          </div>
        )}
      </div>
    </main>
  );
}
