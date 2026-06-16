import Image from "next/image";
import WaitlistForm from "@/components/WaitlistForm";

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
    icon: (
      <path d="M3 12h18M3 6h18M3 18h12" strokeLinecap="round" strokeWidth="2" />
    ),
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

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="container-prose flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-xl font-semibold text-forest-dark">
            CohortBuy
          </span>
        </div>
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink/70 sm:flex">
          <a href="#how" className="hover:text-forest">
            How it works
          </a>
          <a href="#why" className="hover:text-forest">
            Why CohortBuy
          </a>
          <a
            href="#waitlist"
            className="rounded-full bg-forest px-4 py-2 font-semibold text-cream hover:bg-forest-dark"
          >
            Join waitlist
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="container-prose grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-forest-light px-3 py-1 text-sm font-medium text-forest-dark">
              <span className="h-2 w-2 rounded-full bg-clay" />
              Now forming neighborhood cohorts
            </span>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] text-ink sm:text-6xl">
              Neighbors pool.
              <br />
              <span className="text-forest">Prices drop.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/75">
              CohortBuy turns one neighbor&rsquo;s home project into a group deal.
              An AI agent forms the cohort, scopes the work, gathers real quotes,
              and splits the cost fairly — all from a simple chat.
            </p>
            <div id="waitlist" className="mt-8 max-w-xl scroll-mt-24">
              <WaitlistForm />
              <p className="mt-3 text-sm text-ink/50">
                Be first in your neighborhood. No spam — just an invite when we
                open your area.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-square w-full overflow-hidden rounded-[2rem] border border-ink/5 shadow-soft">
              <Image
                src={HERO_PHOTO}
                alt="Neighbors on a tree-lined street planning a shared home project"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 520px"
                className="object-cover"
              />
            </div>
            {/* Floating product mockup over the photo */}
            <div className="absolute -bottom-10 -left-4 hidden w-64 sm:block lg:w-72">
              <ChatPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-ink/5 bg-white/50">
        <div className="container-prose flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-6 text-center text-sm font-medium text-ink/60">
          <span>Up to ~30% off through group pricing</span>
          <span className="hidden h-1 w-1 rounded-full bg-ink/20 sm:inline-block" />
          <span>One contract, fair split</span>
          <span className="hidden h-1 w-1 rounded-full bg-ink/20 sm:inline-block" />
          <span>We never hold your money</span>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container-prose scroll-mt-20 py-20 sm:py-28">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl font-semibold text-ink">
            From &ldquo;I need this done&rdquo; to done — together
          </h2>
          <p className="mt-4 text-lg text-ink/70">
            The agent runs the whole project. You and your neighbors just make
            the calls that matter.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-ink/5 bg-white p-6 shadow-sm transition hover:shadow-soft"
            >
              <div className="font-display text-3xl font-semibold text-clay">
                {s.n}
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold text-ink">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why */}
      <section id="why" className="scroll-mt-20 bg-forest-light/50 py-20 sm:py-28">
        <div className="container-prose">
          <div className="max-w-2xl">
            <h2 className="font-display text-4xl font-semibold text-ink">
              The discount was never the hard part
            </h2>
            <p className="mt-4 text-lg text-ink/70">
              Organizing the group was. CohortBuy does the organizing, so the
              savings actually happen.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {values.map((v) => (
              <div
                key={v.title}
                className="flex gap-4 rounded-2xl border border-ink/5 bg-white p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-light text-forest">
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
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {v.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
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
        <div className="rounded-3xl bg-forest px-8 py-14 text-center shadow-soft sm:px-16">
          <h2 className="font-display text-3xl font-semibold text-cream sm:text-4xl">
            What will your block do first?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-forest-light">
            Any project where doing it together beats going it alone.
          </p>
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-3">
            {projects.map((p) => (
              <span
                key={p}
                className="rounded-full border border-cream/20 bg-forest-dark/40 px-4 py-2 text-sm font-medium text-cream"
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

      {/* Footer */}
      <footer className="border-t border-ink/5">
        <div className="container-prose flex flex-col items-center justify-between gap-4 py-10 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-display font-semibold text-forest-dark">
              CohortBuy
            </span>
          </div>
          <p className="text-sm text-ink/50">
            Neighbors, pooled. &copy; {new Date().getFullYear()} CohortBuy. A
            facilitator — not a party to your contracts.
          </p>
        </div>
      </footer>
    </main>
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
    <div className="mx-auto w-full max-w-sm rounded-[2rem] border border-ink/5 bg-white p-4 shadow-soft">
      <div className="flex items-center gap-2 border-b border-ink/5 pb-3">
        <Logo />
        <div>
          <p className="text-sm font-semibold text-ink">CohortBuy Agent</p>
          <p className="text-xs text-forest">online</p>
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
      <div className="rounded-xl bg-cream/70 px-4 py-2.5 text-sm text-ink/40">
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
            ? "rounded-tl-sm bg-forest-light text-ink"
            : "rounded-tr-sm bg-forest text-cream")
        }
      >
        {children}
      </div>
    </div>
  );
}
