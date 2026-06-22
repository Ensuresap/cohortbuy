import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import GuideBody from "@/components/GuideBody";
import { guideImage } from "@/content/guides";
import { createClient } from "@/lib/supabase/server";
import { listPublicGuides, getPublicGuide } from "@/core/guides/services/guideService";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const revalidate = 300;

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const g = await getPublicGuide({ db: await createClient(), actor: undefined }, params.slug);
  if (!g) return { title: "Guide not found — CohortBuy" };
  const url = `${SITE_URL}/guides/${g.slug}`;
  return {
    title: `${g.title} | CohortBuy`,
    description: g.description,
    alternates: { canonical: url },
    openGraph: {
      title: g.title,
      description: g.description,
      url,
      type: "article",
      publishedTime: g.updated,
      images: [{ url: guideImage(g.slug, 1200, 630), width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: g.title, description: g.description, images: [guideImage(g.slug, 1200, 630)] },
  };
}

export default async function GuidePage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const ctx = { db: await createClient(), actor: undefined };
  const g = await getPublicGuide(ctx, params.slug);
  if (!g) notFound();
  const others = (await listPublicGuides(ctx)).filter((o) => o.slug !== g.slug).slice(0, 3);

  const url = `${SITE_URL}/guides/${g.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.description,
    datePublished: g.updated,
    dateModified: g.updated,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: url,
  };

  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="container-prose flex items-center justify-between py-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <Link href="/" className="font-display text-xl font-semibold text-primary">CohortBuy</Link>
        <div className="flex items-center gap-3">
          <Link href="/guides" className="hidden text-sm font-medium text-muted hover:text-primary sm:inline">All guides</Link>
          <ThemeToggle />
          <Link href="/login" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Get started</Link>
        </div>
      </header>

      <article className="container-prose max-w-3xl py-10 sm:py-14">
        <Link href="/guides" className="text-sm font-medium text-primary hover:underline">← All guides</Link>
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-primary">{g.category}</p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-text sm:text-5xl">{g.title}</h1>
        <p className="mt-3 text-sm text-subtle">{g.readMins} min read · Updated {new Date(g.updated).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={guideImage(g.slug, 1280, 560)}
          alt=""
          loading="eager"
          className="mt-6 aspect-[16/7] w-full rounded-2xl border border-border object-cover"
        />

        <div className="mt-8">
          <GuideBody body={`${g.description}\n\n${g.body}`} />
        </div>

        <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <p className="font-display text-xl font-semibold text-text">Want the group price on your street?</p>
          <p className="mt-1 text-muted">CohortBuy does the organizing so the savings actually happen.</p>
          <Link href="/login" className="mt-4 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary-hover">
            Find a cohort near you
          </Link>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <p className="text-sm font-medium text-subtle">More guides</p>
          <ul className="mt-3 space-y-2">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/guides/${o.slug}`} className="font-medium text-primary hover:underline">{o.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </main>
  );
}
