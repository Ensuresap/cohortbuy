"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PartyPopper, TrendingDown, CheckCircle2 } from "lucide-react";
import type { CommunityWin } from "@/core/requests/domain/request";

function money(cents: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `$${Math.round(cents / 100).toLocaleString()}`;
  }
}

const ROTATE_MS = 4000;

/**
 * "Community wins" banner that rotates through wins vertically, one at a time
 * with a delay (social proof / gamification). Pauses on hover.
 */
export default function CommunityWinsTicker({ wins, totalSaved }: { wins: CommunityWin[]; totalSaved: number }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (wins.length <= 1 || paused) return;
    const t = setInterval(() => setI((n) => (n + 1) % wins.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [wins.length, paused]);

  if (wins.length === 0) return null;
  const w = wins[i % wins.length];
  const title = w.title.replace(/^\[DEMO\]\s*/, "");

  return (
    <section
      className="mt-6 overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 shadow-soft"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{`
        @keyframes cb-win-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .cb-win-in { animation: cb-win-in .5s ease; }
        @media (prefers-reduced-motion: reduce) { .cb-win-in { animation: none; } }
      `}</style>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary">
          <PartyPopper className="h-4 w-4" />
          Community wins
        </span>
        {totalSaved > 0 && (
          <span className="hidden shrink-0 text-sm text-muted sm:inline">
            · saved <span className="font-semibold text-primary">{money(totalSaved)}</span> together
          </span>
        )}
        <div className="relative h-5 min-w-0 flex-1 overflow-hidden">
          <Link
            key={i}
            href={`/requests/${w.id}`}
            className="cb-win-in absolute inset-0 flex items-center gap-1.5 truncate text-sm text-muted hover:text-text"
          >
            {w.saved_cents > 0 ? (
              <>
                <TrendingDown className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">
                  <span className="font-medium text-text">{w.cohort_name}</span> saved{" "}
                  <span className="font-semibold text-primary">~{money(w.saved_cents, w.currency)}</span> on {title}
                  <span className="text-subtle"> · {w.participants} neighbors</span>
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">
                  <span className="font-medium text-text">{w.cohort_name}</span> completed {title}
                  <span className="text-subtle"> · {w.participants} neighbors</span>
                </span>
              </>
            )}
          </Link>
        </div>
        {wins.length > 1 && (
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            {wins.map((_, k) => (
              <span
                key={k}
                className={"h-1.5 w-1.5 rounded-full transition-colors " + (k === i % wins.length ? "bg-primary" : "bg-primary/25")}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
