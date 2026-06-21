import Image from "next/image";
import WaitlistForm from "@/components/WaitlistForm";
import ThemeToggle from "@/components/ThemeToggle";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";
import { createClient } from "@/lib/supabase/server";
import { getPublicStats } from "@/core/cohorts/services/cohortService";

// Hero photo — swap this for your own:
//  • Local file: drop an image into /public and set HERO_PHOTO = "/your-file.jpg"
//  • Hosted URL: use an Unsplash/Pexels link (hosts allowed in next.config.mjs)
const HERO_PHOTO = "/hero.jpg";

const steps = [
  {
    n: "01",
    title: "Start a project",
    body: "Message the CohortBuy agent: “I want to redo my backyard fence — anyone else in?” It opens a project and invites your neighbors.",
  },
  {
    n: "02",
    title: "Gather the group",
    body: "Neighbors join, the agent captures what each home needs, and the group picks a coordinator. No spreadsheets, no group-chat chaos.",
  },
  {
    n: "03",
    title: "Get real quotes",
    body: "The agent researches the market and collects comparable bids from vetted vendors — apples-to-apples, with a clear recommendation.",
  },
  {
    n: "04",
    title: "Share the cost, fairly",
    body: "One combined job, a transparent split everyone can see, and a clean contract. You pay the vendor directly or through secure escrow.",
  },
];

const values = [
  {
    title: "Volume pricing, finally",
    body: "Vendors discount when they can serve several homes at once. The savings were always there — the coordination was the hard part.",
    icon: <path d="M3 12h18M3 6h18M3 18h12" strokeLinecap="round" strokeWidth="2" />,
  },
  {
    title: "An AI agent does the work",
    body: "It organizes the group, scopes the job, chases quotes, and keeps everyone moving — over chat, where your neighbors already are.",
    icon: (
      <path
        d="M12 3a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4Zm-7 18a7 7 0 0 1 14 0"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
  },
  {
    title: "Your money stays yours",
    body: "CohortBuy never holds your funds. You pay the vendor directly or via a trusted escrow partner — we just make it transparent.",
    icon: (
      <path
        d="M3 10h18M6 14h4m-7 4h18a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
  },
  {
    title: "Built on trust",
    body: "Every step is logged, vendors are rated by real groups, and your documents live in your own shared drive — owned by you.",
    icon: (
      <path
        d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3Zm-2 9 1.5 1.5L15 10"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
  },
];

const projects = [
  "Fencing & gates",
  "Roofing",
  "Exterior painting",
  "Landscaping",
  "Solar & batteries",
  "Pressure washing",
  "Tree work",
  "Driveways",
];

export default async function Home() {
  const supabase = createClient();
  const statsRes = await getPublicStats({ db: supabase, actor: undefined });
  const stats = statsRes.ok ? statsRes.data : { cohorts: 0, members: 0, projects: 0, value_cents: 0, saved_cents: 0 };
  const hasStats = stats.cohorts > 0 || stats.value_cents > 0;

  return (
    <main className="min-h-screen">
      <Reveal />
      {/* Nav */}
      <header className="container-prose flex items-center justify-between py-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-xl font-semibold text-primary">
            CohortBuy
          </span>
        </div>
        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted sm:flex">
            <a href="#how" className="hover:text-primary">
              How it works
            </a>
            <a href="#why" className="hover:text-primary">
              Why CohortBuy
            </a>
            <a href="/guides" className="hover:text-primary">
              Guides
            </a>
            <a href="/vendors" className="hover:text-primary">
              For vendors
            </a>
          </nav>
          <a
            href="/login"
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-2"
          >
            Log in
          </a>
          <ThemeToggle />
          <a
            href="#waitlist"
            className="hidden rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary-hover sm:inline-block"
          >
            Join waitlist
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="sunrise-hero relative overflow-hidden">
        <div className="glow pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full" aria-hidden="true" />
        <div className="container-prose relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2">
          <div className="reveal">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-surface-2 px-3 py-1 text-sm font-medium text-primary">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Now forming neighborhood cohorts
            </span>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] text-text sm:text-6xl">
              Stop overpaying.
              <br />
              <span className="text-primary">Buy with your block.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Gutter cleaning, a fence, solar, a bulk laptop order — whatever it
              is, your neighbors probably want it too. CohortBuy pools the demand,
              gets real quotes, and splits the cost fairly, so everyone pays the
              group price instead of the going-it-alone price.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="/login"
                className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:bg-primary-hover"
              >
                Find a cohort near you
              </a>
              <a
                href="#how"
                className="rounded-full border border-border px-6 py-3 font-semibold text-text transition hover:bg-surface-2"
              >
                See how it works
              </a>
            </div>
            <div id="waitlist" className="mt-6 max-w-xl scroll-mt-24">
              <WaitlistForm />
              <p className="mt-3 text-sm text-subtle">
                Not in a cohort yet? Leave your email — we&rsquo;ll tell you when
                your area opens. No spam.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[2rem] border border-border shadow-soft">
              <Image
                src={HERO_PHOTO}
                alt="Neighbors gathered around laptops and paperwork, planning a project together"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 520px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Proof band — live aggregate stats from public cohorts */}
      {hasStats ? (
        <section className="border-y border-border bg-surface/60">
          <div className="container-prose reveal grid grid-cols-2 gap-6 py-8 text-center sm:grid-cols-4">
            <CountStat n={stats.cohorts} label="neighborhood cohorts" />
            <CountStat n={stats.projects} label="group projects" />
            <CountStat n={Math.round(stats.value_cents / 100)} prefix="$" label="value facilitated" />
            {stats.saved_cents > 0 ? (
              <CountStat n={Math.round(stats.saved_cents / 100)} prefix="$" label="saved together" />
            ) : (
              <Stat value="~30%" label="typical group savings" />
            )}
          </div>
        </section>
      ) : (
        <section className="border-y border-border bg-surface/60">
          <div className="container-prose flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-6 text-center text-sm font-medium text-muted">
            <span>Up to ~30% off through group pricing</span>
            <span className="hidden h-1 w-1 rounded-full bg-border sm:inline-block" />
            <span>One contract, fair split</span>
            <span className="hidden h-1 w-1 rounded-full bg-border sm:inline-block" />
            <span>We never hold your money</span>
          </div>
        </section>
      )}

      {/* Conversation */}
      <section className="container-prose py-20 sm:py-24">
        <div className="reveal grid items-center gap-12 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <ChatPreview />
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="font-display text-4xl font-semibold text-text">
              A conversation, not a checkout
            </h2>
            <p className="mt-4 text-lg text-muted">
              No forms, no app to learn. You chat with the CohortBuy agent the
              way you&rsquo;d text a neighbor — it forms the group, scopes the
              work, and lines up quotes in the background.
            </p>
            <ul className="mt-6 space-y-3 text-muted">
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                Start a project in one message
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                Neighbors join with a tap
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                The agent handles the busywork
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container-prose scroll-mt-20 py-20 sm:py-28">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl font-semibold text-text">
            From &ldquo;I need this done&rdquo; to done — together
          </h2>
          <p className="mt-4 text-lg text-muted">
            The agent runs the whole project. You and your neighbors just make
            the calls that matter.
          </p>
        </div>
        <div className="reveal mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-border bg-surface p-6 shadow-sm transition hover:shadow-soft"
            >
              <div className="font-display text-3xl font-semibold text-accent">
                {s.n}
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold text-text">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why */}
      <section id="why" className="scroll-mt-20 bg-surface-2 py-20 sm:py-28">
        <div className="container-prose">
          <div className="max-w-2xl">
            <h2 className="font-display text-4xl font-semibold text-text">
              The discount was never the hard part
            </h2>
            <p className="mt-4 text-lg text-muted">
              Organizing the group was. CohortBuy does the organizing, so the
              savings actually happen.
            </p>
          </div>
          <div className="reveal mt-12 grid gap-6 sm:grid-cols-2">
            {values.map((v) => (
              <div
                key={v.title}
                className="flex gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-primary">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    {v.icon}
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-text">
                    {v.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {v.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="container-prose py-20 sm:py-28">
        <div className="rounded-3xl bg-brand-forest px-8 py-14 text-center shadow-soft sm:px-16">
          <h2 className="font-display text-3xl font-semibold text-brand-cream sm:text-4xl">
            What will your block do first?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-cream/80">
            Any project where doing it together beats going it alone.
          </p>
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-3">
            {projects.map((p) => (
              <span
                key={p}
                className="rounded-full border border-brand-cream/20 bg-brand-forest-dark/40 px-4 py-2 text-sm font-medium text-brand-cream"
              >
                {p}
              </span>
            ))}
          </div>
          <div className="mx-auto mt-10 max-w-lg">
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* For vendors */}
      <section id="vendors" className="scroll-mt-20 bg-surface-2 py-20 sm:py-24">
        <div className="container-prose grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-surface px-3 py-1 text-sm font-medium text-primary">
              For vendors &amp; sellers
            </span>
            <h2 className="mt-4 font-display text-4xl font-semibold text-text">
              One quote. A whole street of customers.
            </h2>
            <p className="mt-4 text-lg text-muted">
              CohortBuy brings you demand that&rsquo;s already pooled — several
              homes on one block, ready to buy together. Quote once, serve many,
              skip the door-knocking.
            </p>
            <ul className="mt-6 space-y-3 text-muted">
              <li className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" /> Reach committed group demand, not cold leads</li>
              <li className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" /> Respond to clear, standardized requests for quote</li>
              <li className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" /> Get listed &amp; featured in neighborhood shortlists</li>
            </ul>
            <a
              href="/vendors"
              className="mt-8 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:bg-primary-hover"
            >
              Learn more &amp; get listed
            </a>
          </div>
          <div className="rounded-3xl border border-border bg-surface p-8 shadow-soft">
            <p className="text-sm font-medium text-subtle">A typical request you&rsquo;d receive</p>
            <p className="mt-2 font-display text-xl font-semibold text-text">6 homes on Katy Ranch want gutter cleaning</p>
            <p className="mt-2 text-muted">Single-storey, ~140 ft each, before the rainy season. One visit, one mobilization, one combined job.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-surface-2 px-3 py-1 text-text">6 committed</span>
              <span className="rounded-full bg-surface-2 px-3 py-1 text-text">Quote by Fri</span>
              <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">~$1,400 job</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container-prose flex flex-col items-center justify-between gap-4 py-10 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-display font-semibold text-primary">
              CohortBuy
            </span>
          </div>
          <p className="text-sm text-subtle">
            Neighbors, pooled. &copy; {new Date().getFullYear()} CohortBuy. A
            facilitator — not a party to your contracts.
          </p>
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

function CountStat({ n, label, prefix }: { n: number; label: string; prefix?: string }) {
  return (
    <div>
      <CountUp value={n} prefix={prefix} className="font-display text-3xl font-semibold text-primary sm:text-4xl" />
      <div className="mt-1 text-sm text-muted">{label}</div>
    </div>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#1F6F5C" />
      <circle cx="12" cy="13" r="3.2" fill="#FBF7F0" />
      <circle cx="20" cy="13" r="3.2" fill="#E9B949" />
      <circle cx="16" cy="20" r="3.2" fill="#E07A5F" />
    </svg>
  );
}

function ChatPreview() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-[2rem] border border-border bg-surface p-4 shadow-soft">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Logo />
        <div>
          <p className="text-sm font-semibold text-text">CohortBuy Agent</p>
          <p className="text-xs text-primary">online</p>
        </div>
      </div>
      <div className="space-y-3 py-4 text-sm">
        <Bubble side="right">
          Anyone on Maple St want to redo their fence? Mine&rsquo;s falling apart 😅
        </Bubble>
        <Bubble side="left">
          Love it. I&rsquo;ll start a cohort and invite your neighbors. Roughly how
          many feet, and wood or vinyl?
        </Bubble>
        <Bubble side="right">~120 ft, wood.</Bubble>
        <Bubble side="left">
          Got it. 3 neighbors already joined 🎉 I&rsquo;ll gather quotes from 3
          vetted vendors and show you a fair split.
        </Bubble>
      </div>
      <div className="rounded-xl bg-surface-2 px-4 py-2.5 text-sm text-subtle">
        Message CohortBuy…
      </div>
    </div>
  );
}

function Bubble({
  side,
  children,
}: {
  side: "left" | "right";
  children: React.ReactNode;
}) {
  const isLeft = side === "left";
  return (
    <div className={isLeft ? "flex justify-start" : "flex justify-end"}>
      <div
        className={
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-snug " +
          (isLeft
            ? "rounded-tl-sm bg-surface-2 text-text"
            : "rounded-tr-sm bg-primary text-primary-foreground")
        }
      >
        {children}
      </div>
    </div>
  );
}
