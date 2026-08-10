import Link from "next/link";
import PriceExplorer from "@/components/PriceExplorer";
import PromoSubmit from "@/components/PromoSubmit";
import TopValue from "@/components/TopValue";
import { OtterFlag, OtterReformer, OtterSit } from "@/components/Otters";
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
          <OtterReformer className="hidden h-14 w-auto sm:block" />
        </div>
        <h1 className="font-display text-5xl uppercase leading-[0.95] tracking-tight text-fg sm:text-7xl">
          Find prices of<br />
          <span className="text-volt">Reformer Pilates</span> classes
        </h1>
        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">
          Prices in SGD — find drop-in rates, class packs, memberships and promos, compared side by
          side.
        </p>

        {/* Trust & freshness strip */}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-volt" aria-hidden />
            Auto-updated daily
          </span>
          <span className="text-line">·</span>
          <span>{studios.length} studios</span>
          <span className="text-line">·</span>
          <span>Community deals reviewed weekly</span>
          <Link href="/how-it-works" className="font-semibold text-volt transition hover:brightness-110">
            How we keep prices fresh →
          </Link>
        </div>
        <p className="mt-2 text-xs text-muted/70">
          Last data update {data.updatedAt}. Always confirm on the studio&rsquo;s own site before buying.
        </p>

        <div className="mt-6">
          <PromoSubmit studios={studios.map((s) => ({ id: s.id, name: s.name }))} />
        </div>
      </header>

      <TopValue studios={studios} />

      <PriceExplorer studios={studios} today={today()} />

      <footer className="mt-16 border-t-2 border-line pt-6 text-xs leading-relaxed text-muted">
        <div className="flex items-start gap-4">
          <OtterSit className="hidden h-16 w-auto shrink-0 sm:block" />
          <p className="max-w-3xl">
            Prices are compiled from studios&rsquo; public pages and social media and may be out of
            date or incomplete. Badges:{" "}
            <span className="font-semibold text-volt">Verified</span> = read from the studio site,{" "}
            <span className="font-semibold text-gold">Estimate</span> = mixed/derived,{" "}
            <span className="font-semibold text-rose">Needs update</span> = known stale. Promotions
            tagged <em>instagram</em>/<em>manual</em> are curated by hand.
          </p>
        </div>
      </footer>
    </main>
  );
}
