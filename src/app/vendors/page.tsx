import Link from "next/link";
import VendorLeadForm from "@/components/VendorLeadForm";
import ThemeToggle from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/server";
import { getPublicStats } from "@/core/cohorts/services/cohortService";

export const metadata = {
  title: "For vendors — CohortBuy",
  description: "Reach pre-aggregated neighborhood demand. Quote once, serve a whole block.",
};

function compactMoney(cents: number): string {
  const n = Math.round(cents / 100);
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `$${n.toLocaleString()}`;
}

const benefits = [
  { title: "Demand that's already pooled", body: "Not cold leads — groups of neighbors who've committed to buy the same thing, together, at the same time." },
  { title: "Quote once, serve many", body: "One mobilization, several homes on a block. Less driving, less selling, more jobs per trip." },
  { title: "Clear, standardized requests", body: "Each group sends a structured request for quote — scope, quantity, timeline — so you bid apples-to-apples." },
  { title: "Get found & featured", body: "List your business in the registry and get surfaced in neighborhood shortlists when groups are choosing." },
];

const steps = [
  { n: "01", title: "Get listed", body: "Tell us what you do and where. We add you to the vendor registry." },
  { n: "02", title: "Receive group requests", body: "When a nearby cohort forms around your service, you get a clear request for quote." },
  { n: "03", title: "Bid & win the block", body: "Send one quote for the whole group. Win it and book several homes at once." },
];

export default async function VendorsPage() {
  const supabase = await createClient();
  const statsRes = await getPublicStats({ db: supabase, actor: undefined });
  const stats = statsRes.ok ? statsRes.data : { cohorts: 0, members: 0, projects: 0, value_cents: 0, saved_cents: 0 };
  const hasStats = stats.cohorts > 0 || stats.value_cents > 0;

  return (
    <main className="min-h-screen">
      <header className="container-prose flex items-center justify-between py-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <Link href="/" className="font-display text-xl font-semibold text-primary">CohortBuy</Link>
        <div className="flex items-center gap-3">
          <Link href="/" className="hidden text-sm font-medium text-muted hover:text-primary sm:inline">For residents</Link>
          <ThemeToggle />
          <a href="#get-listed" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Get listed</a>
        </div>
      </header>

      <section className="container-prose py-16 sm:py-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-surface-2 px-3 py-1 text-sm font-medium text-primary">For vendors &amp; sellers</span>
        <h1 className="mt-5 max-w-3xl font-display text-5xl font-semibold leading-[1.05] text-text sm:text-6xl">
          One quote. <span className="text-primary">A whole street of customers.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          CohortBuy gathers neighbors who want the same work or product and sends you their demand as a single, clear request. Quote once, serve the block, skip the door-knocking.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#get-listed" className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary-hover">Get listed free</a>
          <a href="#how" className="rounded-full border border-border px-6 py-3 font-semibold text-text hover:bg-surface-2">How it works</a>
        </div>
      </section>

      {hasStats && (
        <section className="border-y border-border bg-surface/60">
          <div className="container-prose grid grid-cols-2 gap-6 py-8 text-center sm:grid-cols-3">
            <Stat value={stats.cohorts.toLocaleString()} label="neighborhood cohorts" />
            <Stat value={stats.projects.toLocaleString()} label="group projects run" />
            <Stat value={compactMoney(stats.value_cents)} label="value facilitated" />
          </div>
        </section>
      )}

      <section className="container-prose py-20 sm:py-24">
        <div className="grid gap-6 sm:grid-cols-2">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <h3 className="font-display text-xl font-semibold text-text">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="scroll-mt-20 bg-surface-2 py-20 sm:py-24">
        <div className="container-prose">
          <h2 className="font-display text-4xl font-semibold text-text">How it works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-surface p-6">
                <div className="font-display text-3xl font-semibold text-accent">{s.n}</div>
                <h3 className="mt-3 font-display text-xl font-semibold text-text">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="get-listed" className="container-prose scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-4xl font-semibold text-text">Get listed</h2>
          <p className="mt-3 text-muted">Tell us about your business. We&rsquo;ll reach out as cohorts form around what you offer.</p>
          <div className="mt-8"><VendorLeadForm /></div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="container-prose flex flex-col items-center justify-between gap-4 py-10 text-sm text-subtle sm:flex-row">
          <span>© {new Date().getFullYear()} CohortBuy</span>
          <Link href="/" className="hover:text-primary">For residents →</Link>
        </div>
      </footer>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-semibold text-primary sm:text-4xl">{value}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </div>
  );
}
