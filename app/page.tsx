import PriceExplorer from "@/components/PriceExplorer";
import PromoSubmit from "@/components/PromoSubmit";
import { getStudios, data, today } from "@/lib/data";

export default function Home() {
  const studios = getStudios();
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
      <header className="mb-10 text-center sm:text-left">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-sage">
          Singapore · Reformer Pilates
        </p>
        <h1 className="font-display text-5xl font-light leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Find your <span className="italic text-sage">studio</span>,
          <br className="hidden sm:block" /> know the price.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-muted sm:mx-0">
          Compare drop-in rates, class packs, memberships and live promotions across
          Singapore&rsquo;s reformer pilates studios — all in one calm place. Prices in SGD.
        </p>
        <p className="mt-3 text-xs text-muted/80">
          Updated {data.updatedAt} · always confirm on the studio&rsquo;s own site before buying.
        </p>
        <div className="mt-6 flex justify-center sm:justify-start">
          <PromoSubmit studios={studios.map((s) => ({ id: s.id, name: s.name }))} />
        </div>
      </header>

      <PriceExplorer studios={studios} today={today()} />

      <footer className="mt-16 border-t border-line pt-6 text-xs leading-relaxed text-muted">
        <p className="max-w-3xl">
          Prices are compiled from studios&rsquo; public pages and social media and may be out of
          date or incomplete. Badges:{" "}
          <span className="font-medium text-sage">Verified</span> = read from the studio site,{" "}
          <span className="font-medium text-gold">Estimate</span> = mixed/derived,{" "}
          <span className="font-medium text-rose">Needs update</span> = known stale. Promotions
          tagged <em>instagram</em>/<em>manual</em> are curated by hand.
        </p>
      </footer>
    </main>
  );
}
