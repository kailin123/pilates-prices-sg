import type { Metadata } from "next";
import Link from "next/link";
import { data } from "@/lib/data";
import { OtterSit } from "@/components/Otters";

export const metadata: Metadata = {
  title: "How it works — Pilates Price Where?",
  description: "How Pilates Price Where? keeps Singapore reformer-pilates prices up to date.",
};

function Arrow() {
  return <div className="flex justify-center py-2 text-2xl leading-none text-volt" aria-hidden>↓</div>;
}

const inputs = [
  {
    title: "Studio websites",
    cadence: "Automated · daily",
    tag: "bg-volt/15 text-volt",
    body: "A GitHub Action scrapes studios' public pricing pages every day and updates any prices it can read. Sites that hide prices behind enquiry forms are filled in by hand instead.",
  },
  {
    title: "Community tips",
    cadence: "Reviewed · weekly",
    tag: "bg-gold/15 text-gold",
    body: "Anyone can submit a promo link with the “Submit a promo” button. Tips land in a private queue, and each week they're reviewed with Claude — only confirmed, sensibly-priced ones get published.",
  },
  {
    title: "Hand-curated",
    cadence: "Manual",
    tag: "bg-deal/15 text-deal",
    body: "The maintainer verifies prices directly from studio sites and social media, especially for launch promos and studios that don't publish rates online.",
  },
];

const badges = [
  { label: "Verified", cls: "bg-volt/15 text-volt", meaning: "Read directly from the studio's own page." },
  { label: "Estimate", cls: "bg-gold/15 text-gold", meaning: "Mixed-discipline or derived pricing — double-check before buying." },
  { label: "Needs update", cls: "bg-rose/15 text-rose", meaning: "Known to be out of date; flagged for re-verification." },
];

export default function HowItWorks() {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:py-14">
      <header className="mb-10">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-volt">Behind the scenes</p>
          <OtterSit className="hidden h-14 w-auto sm:block" />
        </div>
        <h1 className="font-display text-5xl uppercase leading-[0.95] tracking-tight text-fg sm:text-6xl">How the prices stay fresh</h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted">
          Every price flows from one of three sources into a single data file, which the live site
          rebuilds from automatically. Here's the whole pipeline.
        </p>
      </header>

      {/* Inputs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {inputs.map((n) => (
          <div key={n.title} className="rounded-lg border-2 border-line bg-panel p-4">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${n.tag}`}>
              {n.cadence}
            </span>
            <h2 className="mt-2 text-lg font-bold text-fg">{n.title}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{n.body}</p>
          </div>
        ))}
      </div>

      <Arrow />

      {/* Source of truth */}
      <div className="rounded-lg border-2 border-volt/50 bg-volt/10 p-5 text-center">
        <p className="font-mono text-sm text-volt">data/studios.json</p>
        <p className="mt-1 text-sm text-fg">The single source of truth — every price on the site lives here.</p>
        <p className="mt-1 text-xs text-muted">Each entry records its source link, a “checked” date, and a confidence badge.</p>
      </div>

      <Arrow />

      {/* Output */}
      <div className="rounded-lg border-2 border-line bg-panel p-5 text-center">
        <h2 className="text-lg font-bold text-fg">Live site on Vercel</h2>
        <p className="mt-1 text-sm text-muted">
          Rebuilds and redeploys automatically whenever the data changes — so the page you're
          reading is always the latest committed data.
        </p>
      </div>

      {/* Badge legend */}
      <section className="mt-12">
        <h2 className="font-display text-2xl uppercase tracking-wide text-fg">What the badges mean</h2>
        <ul className="mt-4 space-y-2">
          {badges.map((b) => (
            <li key={b.label} className="flex items-start gap-3">
              <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${b.cls}`}>
                {b.label}
              </span>
              <span className="text-sm text-muted">{b.meaning}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Freshness */}
      <section className="mt-10 rounded-lg border-2 border-line bg-panel p-5">
        <h2 className="text-lg font-bold text-fg">How fresh is each price?</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Every studio card shows a <em>“checked …”</em> label that links back to where the price came
          from. Data was last updated <strong className="text-fg">{data.updatedAt}</strong>. Prices change often — always
          confirm on the studio's own site before buying.
        </p>
      </section>

      <div className="mt-10">
        <Link href="/" className="text-sm font-semibold text-volt transition hover:brightness-110">← Back to prices</Link>
      </div>
    </main>
  );
}
