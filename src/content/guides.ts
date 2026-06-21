export interface Guide {
  slug: string;
  title: string;
  description: string;
  category: string;
  readMins: number;
  updated: string; // ISO date
  body: string; // lightweight markdown
}

export const GUIDES: Guide[] = [
  {
    slug: "how-to-organize-a-neighborhood-group-buy",
    title: "How to organize a neighborhood group buy (step by step)",
    description:
      "A practical playbook for pooling demand on your street — from finding neighbors who want the same work to getting one fair quote everyone splits.",
    category: "Getting started",
    readMins: 6,
    updated: "2026-06-18",
    body: `Buying as a group is how a whole street quietly pays less for the same work. The discount was always there — vendors love serving several homes in one trip — the hard part is the coordination. Here's how to run it without the spreadsheet chaos.

> The savings were always there. The coordination was the hard part.

## 1. Find the shared need
Start with something neighbors visibly have in common: gutters before the rainy season, fences along a shared boundary, a repaint, solar, even a bulk order of the same appliance. The clearer and more standard the job, the easier it is to quote as a group.

## 2. Gather a quorum first
Don't shop for quotes with a group of one. Get a handful of committed homes before you approach any vendor — your leverage is the volume. A simple rule of thumb:

- 3+ homes is enough to ask for a group rate on most services
- 5–10 unlocks real volume pricing on bigger jobs
- For product buys, more units almost always means a better per-unit price

## 3. Capture what each home needs
A group quote only works if it's apples-to-apples. Write down each home's specifics — footage, height, access, any extras — so the vendor prices one clear scope, not ten vague ones.

## 4. Get comparable quotes
Ask two or three vendors for the **same** scope so you can compare like for like. Look past the headline price at timeline, warranty, and what's included (removal, haul-away, permits). The cheapest bid isn't always the best value.

## 5. Decide together, then split fairly
Pick a winner as a group, agree how you'll divide the cost (evenly, by footage, or by quantity), and put it in writing. Each home usually pays the vendor directly — no one should be holding everyone else's money.

## 6. Keep one person coordinating
One volunteer coordinator keeps it moving: chasing the last quote, confirming the date, nudging the neighbor who hasn't replied. That single role is the difference between a group buy that happens and one that fizzles.

CohortBuy automates most of this — forming the group, capturing scope, collecting comparable quotes, and tracking who's paid — so the coordination stops being the reason savings don't happen.`,
  },
  {
    slug: "questions-to-ask-before-hiring-a-contractor",
    title: "12 questions to ask before hiring a contractor",
    description:
      "Before you sign, run through these questions on licensing, insurance, scope, and payment so you avoid the common, expensive surprises.",
    category: "Hiring vendors",
    readMins: 5,
    updated: "2026-06-18",
    body: `A good contractor will happily answer these. Hesitation on the basics is itself an answer. Use this before you commit — and especially before any money changes hands.

## Credentials and cover
- Are you licensed for this work, and can I see the number?
- Do you carry liability insurance and workers' comp? Can I get a certificate?
- Who exactly will be on site — your crew or subcontractors?

## Scope and price
- Can you put the full scope in writing, including what's **not** included?
- Is this a fixed price or an estimate, and what would change it?
- Who handles permits, and is that in the price?
- What's the timeline, and what happens if it slips?

## Track record
- Can you share two or three recent jobs like mine I can contact?
- Is the work guaranteed, and for how long?

## Payment and protection
- What's the payment schedule? (Be wary of large deposits up front.)
- How do we handle changes once work starts?
- What's your process if something isn't right?

## A note on group jobs
When several homes hire together, you have more leverage to ask for these in writing — and a standard, shared scope makes it easier to compare bids fairly. Never pay through an intermediary that asks for bank details, card numbers, or one-time codes. Pay the vendor directly, on a sensible schedule, against work actually done.`,
  },
  {
    slug: "is-a-group-solar-install-worth-it",
    title: "Is a group solar install worth it?",
    description:
      "How buying rooftop solar with neighbors changes the math — on price, install logistics, and the questions worth asking before you commit.",
    category: "Solar & energy",
    readMins: 6,
    updated: "2026-06-18",
    body: `Solar is one of the clearest cases for buying together. The panels are a commodity; most of what you pay covers sales, mobilization, and inspection — costs that drop sharply when an installer does several roofs in one neighborhood.

## Where the group savings come from
- **Lower customer-acquisition cost.** Installers spend heavily to find each customer. A pre-formed group removes that, and they pass some of it back.
- **One mobilization.** Crews, equipment, and inspection trips are shared across homes on the same street.
- **Volume on hardware.** Buying panels and inverters for several systems at once improves pricing.

Together these can meaningfully beat a solo quote — though the exact figure depends on your roofs and local rates, so treat any range as a starting point to verify.

## What still varies by home
Solar isn't one-size-fits-all. Roof orientation, shading, age, and each household's electricity use all change the right system size. A good group process captures each home's specifics, then negotiates one deal with per-home configurations rather than forcing everyone into the same kit.

## Questions worth asking
- What panel and inverter brand, and what's the warranty on each?
- Is the roof assessed per home, or priced sight-unseen?
- How are incentives and tax credits handled?
- What's the timeline once the group commits?

## The honest caveats
A group rate is only worth it if the installer is solid — compare at least two, check references, and don't let a countdown rush you into a weak warranty. The savings are real, but so is the cost of choosing the wrong installer for a 20-year asset.`,
  },
  {
    slug: "how-much-can-neighbors-save-buying-together",
    title: "How much can neighbors actually save buying together?",
    description:
      "A grounded look at where group-buying discounts come from, what's realistic by category, and how to estimate your own street's savings.",
    category: "Savings",
    readMins: 5,
    updated: "2026-06-18",
    body: `"Up to 30% off" makes a nice headline, but the honest answer is: it depends on the category and how much of the vendor's cost is fixed. Here's how to think about it realistically.

> The more of a job's price is the trip, not the materials, the more a group saves.

## The savings come from fixed costs you share
Every job has costs that don't grow much whether a vendor serves one home or six: travel and setup, sales and quoting, inspection trips, equipment hauling. Spread those across a group and the per-home price falls. The more a job's cost is fixed (vs materials), the bigger the group discount.

## Rough ranges by type
These are directional, not promises — your street's numbers depend on local rates and the vendor:

- **Services with heavy mobilization** (gutter cleaning, tree work, pressure washing): often the best percentage savings, because so much of the cost is the trip.
- **Bigger installs** (fencing, solar, driveways): meaningful savings from shared setup and volume hardware.
- **Bulk product orders** (appliances, electronics, mulch, propane): savings track the per-unit volume discount the seller offers.

## Estimate your own
A simple way to sanity-check: get one honest solo quote, then ask a vendor what they'd charge per home for the same work across, say, five homes. The gap is your group savings. Keep the scope identical so you're comparing like for like.

## Don't chase the discount off a cliff
The goal is value, not just the lowest number. A slightly higher bid with a better warranty, a real reference, and a firm timeline usually beats the cheapest quote — group buying just means you get that better deal at a group price.`,
  },
  {
    slug: "gutter-cleaning-group-buy-checklist",
    title: "The gutter-cleaning group-buy checklist (before the rainy season)",
    description:
      "Gutters are the easiest first group buy on any street. Here's the short checklist to pool your block and get a per-house rate before the storms.",
    category: "Seasonal",
    readMins: 4,
    updated: "2026-06-18",
    body: `Gutter cleaning is the perfect first group buy: it's standard work, every house needs it on the same schedule, and most of the price is the crew showing up — exactly the cost that drops when they do the whole street in one visit.

## Why it's an easy win
- The job barely changes house to house, so it's simple to quote as a group.
- Travel and setup dominate the cost, so volume cuts the per-house rate noticeably.
- Timing is shared — everyone wants it done before the first big storm.

## The checklist
1. Pick a window (ideally a few weeks before your rainy season).
2. Message the block and get a quorum — three or more houses is plenty to ask for a rate.
3. Note each home's basics: single or two-storey, rough length of run, any tricky access.
4. Ask two local crews for a per-house price for the group, same scope.
5. Compare on price, insurance, and whether downspout flushing and debris haul-away are included.
6. Pick one, lock a date, and split per house (evenly, or by storey/length if homes differ a lot).

## Don't forget
Confirm the crew is insured before they're on ladders over your property, and pay them directly after the work — never through anyone asking for bank details or codes up front.`,
  },
  {
    slug: "how-cost-splits-work-with-neighbors",
    title: "How to split the cost fairly with neighbors",
    description:
      "Even split, by quantity, or by usage? A clear guide to dividing a group job so it feels fair to everyone — and stays drama-free.",
    category: "Coordinating",
    readMins: 5,
    updated: "2026-06-18",
    body: `The fastest way to sink a group buy is a split that feels unfair. The good news: a few simple methods cover almost every job. Agree on the method **before** the work, in writing.

## Even split
Everyone pays the same share. Best when the work is roughly equal per home — a shared booking fee, a flat per-house service, a simple bulk order where everyone takes one.

## By quantity
Each home pays for what it takes. Right for product buys (you order three, I order one) and anything measured in units — footage of fence, square metres of driveway, number of panels.

## By usage or size
Cost tracks how much each home drives the price. Useful when homes differ a lot — a two-storey gutter job costs more than a bungalow, a bigger roof needs a bigger solar system.

## Custom
Sometimes the coordinator just sets each share by hand because the job is lumpy. That's fine — as long as the numbers are visible to everyone.

## Make it stick
- Decide the method up front, not after the invoice lands.
- Show the math openly so anyone can check their share.
- Have each home pay the vendor directly where possible, so no neighbor is stuck holding the group's money.

A platform like CohortBuy can generate the split automatically and track who's paid, which keeps the awkward money conversations to a minimum.`,
  },
  {
    slug: "bulk-buy-for-your-hoa-or-building",
    title: "Running a bulk buy for your HOA or apartment building",
    description:
      "HOAs and buildings are ready-made cohorts. How to pool demand across units for services and products without it becoming a committee saga.",
    category: "Getting started",
    readMins: 5,
    updated: "2026-06-18",
    body: `An HOA or apartment building is a group buy waiting to happen — shared boundaries, shared timing, and a list of residents who already know each other. The trick is keeping it light instead of turning it into a committee marathon.

## What works well
- Recurring services everyone needs: landscaping, pressure washing, gutter and roof maintenance, pest control.
- One-time upgrades across units: EV chargers, smart thermostats, window treatments.
- Bulk product orders: mulch by the truckload, salt or propane before winter, the same appliance across units.

## Keep the process light
1. One organizer floats the idea and collects interest — a simple "who's in?" beats a formal vote.
2. Capture each unit's specifics so vendors quote one clear scope.
3. Get two or three comparable quotes; share them openly with everyone in.
4. Decide together, then each unit pays the vendor directly on its share.

## Watch-outs for shared property
- Check whether the work touches common areas that need board sign-off.
- Keep individual units' payments individual — pooling money through one person creates needless risk and friction.
- Document the agreed scope and split so there are no surprises later.

The community already exists; you're just giving it buying power.`,
  },
  {
    slug: "how-to-be-a-good-cohort-coordinator",
    title: "How to be a good cohort coordinator (without it taking over your life)",
    description:
      "The coordinator role is what makes a group buy actually happen. Here's how to run one well in a few minutes a week.",
    category: "Coordinating",
    readMins: 4,
    updated: "2026-06-18",
    body: `Every successful group buy has one person who keeps it moving. It's not a huge job — but it is the job that determines whether the savings happen. Here's how to do it well without it eating your week.

## What the coordinator actually does
- Rallies a quorum so there's real buying power before approaching vendors.
- Makes sure each home's needs are captured so quotes are comparable.
- Collects two or three bids and lays them out clearly.
- Gets the group to a decision and a date.
- Nudges the one or two people who always reply last.

## Do it in minutes, not hours
- Set a simple deadline for each step — "quotes in by Friday, we decide over the weekend."
- Keep one channel, not five. Decisions scattered across texts and a group chat are where momentum dies.
- Don't chase consensus on everything — agree the decision rule up front (you decide, or the group votes) so you're never stuck.
- Lean on tooling. A platform that captures scope, collects quotes, runs the vote, and nudges stragglers turns most of this into a few taps.

## The mindset
You're a facilitator, not a contractor and not everyone's banker. Keep the money between each home and the vendor, keep the scope and split visible, and keep things moving. That's the whole job — and it's how a street quietly saves real money together.`,
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

/**
 * Free, stable editorial image per guide (Lorem Picsum — no attribution needed).
 * Seeded by slug so each guide keeps the same photo. Swap for topical photography
 * later by adding an `image` field to the guide and reading it here.
 */
export function guideImage(slug: string, w: number, h: number): string {
  return `https://picsum.photos/seed/cb-${slug}/${w}/${h}`;
}
