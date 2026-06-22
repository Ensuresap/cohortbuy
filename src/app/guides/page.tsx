import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { guideImage } from "@/content/guides";
import { createClient } from "@/lib/supabase/server";
import { listPublicGuides } from "@/core/guides/services/guideService";
import { SITE_URL } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Guides — saving on home projects & group buys | CohortBuy",
  description:
    "Practical guides on pooling demand with neighbors: how to organize a group buy, vet contractors, and save on services and bulk orders.",
  alternates: { canonical: `${SITE_URL}/guides` },
  openGraph: {
    title: "CohortBuy Guides — save on home projects with your neighbors",
    description: "How to organize a group buy, vet contractors, and save on services and bulk orders.",
    url: `${SITE_URL}/guides`,
    type: "website",
  },
};

export default async function GuidesIndex() {
  const guides = await listPublicGuides({ db: await createClient(), actor: undefined });
  return (
    <main className="min-h-screen">
      <header className="container-prose flex items-center justify-between py-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <Link href="/" className="font-display text-xl font-semibold text-primary">CohortBuy</Link>
        <div className="flex items-center gap-3">
          <Link href="/" className="hidden text-sm font-medium text-muted hover:text-primary sm:inline">Home</Link>
          <ThemeToggle />
          <Link href="/login" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Get started</Link>
        </div>
      </header>

      <section className="container-prose py-12 sm:py-16">
        <h1 className="max-w-3xl font-display text-4xl font-semibold text-text sm:text-5xl">
          Guides to saving on home projects
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Practical, no-fluff playbooks on buying with your neighbors — pooling demand, vetting vendors, and getting the group price instead of the going-it-alone price.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {guides.map((g) => (
            <Link
              key={g.slug}
              href={`/guides/${g.slug}`}
              className="group block overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:shadow-soft"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={guideImage(g.slug, 720, 400)}
                alt=""
                loading="lazy"
                className="aspect-[16/9] w-full object-cover transition group-hover:opacity-95"
              />
              <div className="p-6">
                <span className="text-xs font-medium uppercase tracking-wide text-primary">{g.category}</span>
                <h2 className="mt-2 font-display text-xl font-semibold text-text">{g.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{g.description}</p>
                <p className="mt-3 text-xs text-subtle">{g.readMins} min read</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="container-prose flex flex-col items-center justify-between gap-4 py-10 text-sm text-subtle sm:flex-row">
          <span>© {new Date().getFullYear()} CohortBuy</span>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-primary">For residents</Link>
            <Link href="/vendors" className="hover:text-primary">For vendors</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
