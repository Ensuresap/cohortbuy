"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const POSTER =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80";
/** Public-domain-style stock clip (Pexels) — muted loop for an ad-unit feel. */
const VIDEO_SRC =
  "https://videos.pexels.com/video-files/7578452/7578452-hd_1920_1080_25fps.mp4";

function openHelper() {
  window.dispatchEvent(new CustomEvent("cohortbuy:open-chat"));
}

/**
 * Dashboard sidebar promo placeholder — stock media + helper peeking into frame.
 * Owns the chat entry point on this page (global FAB is hidden on /dashboard).
 */
export default function DashboardPromoSpot() {
  const [agentIn, setAgentIn] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setAgentIn(true), 900);
    window.dispatchEvent(new CustomEvent("cohortbuy:hide-chat-fab"));
    return () => {
      window.clearTimeout(t);
      window.dispatchEvent(new CustomEvent("cohortbuy:show-chat-fab"));
    };
  }, []);

  return (
    <section className="relative">
      <button
        type="button"
        onClick={openHelper}
        className="group block w-full overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-soft transition hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open the CohortBuy helper — see how neighbors save together"
      >
        <div className="relative aspect-[4/3] bg-surface-2">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={POSTER}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          >
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-background/15 to-transparent" />
          <span className="absolute left-3 top-3 rounded-full border border-border/60 bg-background/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-subtle backdrop-blur-sm">
            Spotlight
          </span>
        </div>

        <div className="px-4 py-4">
          <p className="font-display text-base font-semibold leading-snug text-text">
            Pool with neighbors. Pay less.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            One block saved 28% on fence quotes — see what your street could do next.
          </p>
        </div>

        {/* Helper row — in flow below copy so nothing overlaps the promo text */}
        <div
          className={
            "border-t border-border/70 bg-primary/5 px-3 py-3 transition-all duration-700 ease-out " +
            (agentIn ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")
          }
          aria-hidden={!agentIn}
        >
          <div className="flex items-end gap-2">
            <p
              className={
                "min-w-0 flex-1 text-[11px] leading-snug text-text " +
                (agentIn ? "animate-promo-bob" : "")
              }
            >
              Curious what your block could save? Tap here — I&rsquo;ll walk you through it.
            </p>
            <span
              className={
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/20 " +
                (agentIn ? "animate-promo-pop" : "")
              }
            >
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
          </div>
        </div>
      </button>
    </section>
  );
}
