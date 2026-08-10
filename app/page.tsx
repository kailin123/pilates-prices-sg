import Link from "next/link";
import PriceExplorer from "@/components/PriceExplorer";
import PromoSubmit from "@/components/PromoSubmit";
import { OtterFlag, OtterReformer, OtterDeal } from "@/components/Otters";
import { getStudios, data, today } from "@/lib/data";

export default function Home() {
  const studios = getStudios();
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
      <header className="mb-10">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <OtterFlag className="h-12 w-auto" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-volt">
              Singapore
            </p>
          </div>
          <OtterReformer className="h-11 w-auto shrink-0 sm:h-14" />
        </div>
        <h1 className="font-display text-5xl uppercase leading-[0.95] tracking-tight text-fg sm:text-7xl">
          Find prices of<br />
          <span className="text-volt">Reformer Pilates</span> classes
        </h1>
        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">
          Find drop-in rates, class packs, memberships and promos, compared side by side
        </p>

        {/* Badge legend — what the data-quality tags mean */}
        <div className="mt-4 max-w-3xl rounded-md border border-line bg-panel px-3 py-2 text-xs leading-relaxed text-muted">
          <p>
            Prices are compiled from studios&rsquo; public pages and social media and may be out of
            date or incomplete.
          </p>
          <ul className="mt-1.5 space-y-0.5">
            <li>
              <span className="font-semibold text-volt">Verified</span>: Read directly from the
              studio&rsquo;s own page.
            </li>
            <li>
              <span className="font-semibold text-gold">Estimate</span>: Mixed-discipline or derived
              pricing — double-check before buying.
            </li>
            <li>
              <span className="font-semibold text-rose">Needs update</span>: Known to be out of date;
              flagged for re-verification.
            </li>
          </ul>
          <p className="mt-1.5">
            Promotions tagged <em>instagram</em>/<em>manual</em> are curated by hand.
          </p>
        </div>

        {/* Trust & freshness strip */}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-volt" aria-hidden />
            Auto-updated daily
          </span>
          <span className="text-line">·</span>
          <span>{studios.length} studios</span>
          <span className="text-line">·</span>
          <span>Social media promotions need to be submitted manually</span>
          <Link href="/how-it-works" className="font-semibold text-volt transition hover:brightness-110">
            How we keep prices fresh →
          </Link>
        </div>
        <p className="mt-2 text-xs text-muted/70">
          Last data update {data.updatedAt}. Always confirm on the studio&rsquo;s own site before buying.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <OtterDeal className="hidden h-14 w-auto shrink-0 sm:block" />
          <PromoSubmit studios={studios.map((s) => ({ id: s.id, name: s.name }))} />
        </div>
      </header>

      <PriceExplorer studios={studios} today={today()} />
    </main>
  );
}
