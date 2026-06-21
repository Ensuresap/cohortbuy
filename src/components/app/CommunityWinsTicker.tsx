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

/**
 * Single-line auto-scrolling "Community wins" ticker (social proof / gamification).
 * Pauses on hover; respects prefers-reduced-motion.
 */
export default function CommunityWinsTicker({ wins, totalSaved }: { wins: CommunityWin[]; totalSaved: number }) {
  if (wins.length === 0) return null;

  // Repeat to fill width, then duplicate once so the -50% loop is seamless.
  const fill: CommunityWin[] = [];
  while (fill.length < 8) fill.push(...wins);
  const reel = [...fill, ...fill];

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 shadow-soft">
      <style>{`
        @keyframes cb-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .cb-marquee { animation: cb-marquee 40s linear infinite; }
        .cb-marquee-wrap:hover .cb-marquee { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .cb-marquee { animation: none; } }
      `}</style>
      <div className="flex items-center gap-3 py-2.5 pl-4">
        <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary">
          <PartyPopper className="h-4 w-4" />
          Community wins
        </span>
        {totalSaved > 0 && (
          <span className="hidden shrink-0 text-sm text-muted sm:inline">
            · saved <span className="font-semibold text-primary">{money(totalSaved)}</span> together
          </span>
        )}
        <div className="cb-marquee-wrap relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)]">
          <div className="cb-marquee flex w-max items-center gap-8 whitespace-nowrap pr-8">
            {reel.map((w, i) => (
              <Link key={`${w.id}-${i}`} href={`/requests/${w.id}`} className="flex items-center gap-1.5 text-sm text-muted hover:text-text">
                {w.saved_cents > 0 ? (
                  <>
                    <TrendingDown className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="font-medium text-text">{w.cohort_name}</span>
                    <span>saved</span>
                    <span className="font-semibold text-primary">~{money(w.saved_cents, w.currency)}</span>
                    <span>on {w.title.replace(/^\[DEMO\]\s*/, "")}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="font-medium text-text">{w.cohort_name}</span>
                    <span>completed {w.title.replace(/^\[DEMO\]\s*/, "")}</span>
                  </>
                )}
                <span className="text-subtle">·</span>
                <span className="text-subtle">{w.participants} neighbors</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
