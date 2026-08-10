"use client";

import { useMemo, useState } from "react";
import {
  type Studio,
  type Discipline,
  type PlanType,
  type Confidence,
  planPerClass,
  lowestPerClass,
  cheapestEntry,
  dropInPrice,
  packPerClass,
  membershipMonthly,
  activePromos,
} from "@/lib/types";
import StudioLogo from "@/components/StudioLogo";
import TopValue from "@/components/TopValue";
import { OtterSit } from "@/components/Otters";

/**
 * A "lens" is the single price dimension the user is comparing on. It drives
 * everything at once — which studios show, the ranking metric, the highlighted
 * card stat, and the leaderboard — so the pricing filter and sort can't conflict.
 */
type Lens = "value" | "trial" | "dropIn" | "pack" | "membership";
type CardStat = "dropIn" | "perClass" | "entry" | "membership";

const lensConfig: Record<
  Lens,
  {
    label: string;
    planType: PlanType | null; // null = every studio qualifies
    price: (s: Studio) => number | null;
    unit: string; // suffix shown after a price number
    metricLabel: string; // short caption for the leaderboard
    caption: string; // descriptive line for the leaderboard
    stat: CardStat; // which card stat to highlight
  }
> = {
  value: {
    label: "Best value (per-class)",
    planType: null,
    price: lowestPerClass,
    unit: "/class",
    metricLabel: "lowest price / class",
    caption: "Cheapest committed rate per studio — excludes trials and memberships.",
    stat: "perClass",
  },
  trial: {
    label: "Trial / intro price",
    planType: "intro",
    price: cheapestEntry,
    unit: "",
    metricLabel: "cheapest to try",
    caption: "Cheapest way to try each studio once.",
    stat: "entry",
  },
  dropIn: {
    label: "Drop-in price",
    planType: "drop-in",
    price: dropInPrice,
    unit: "",
    metricLabel: "drop-in price",
    caption: "Single-class drop-in rate per studio.",
    stat: "dropIn",
  },
  pack: {
    label: "Class pack (per-class)",
    planType: "pack",
    price: packPerClass,
    unit: "/class",
    metricLabel: "pack price / class",
    caption: "Cheapest class-pack per-class rate per studio.",
    stat: "perClass",
  },
  membership: {
    label: "Membership (monthly)",
    planType: "unlimited",
    price: membershipMonthly,
    unit: "/mo",
    metricLabel: "membership / month",
    caption: "Cheapest monthly unlimited membership per studio.",
    stat: "membership",
  },
};

type SortDir = "asc" | "desc" | "name";

const sortDirLabels: Record<SortDir, string> = {
  asc: "Price: low → high",
  desc: "Price: high → low",
  name: "Studio name (A–Z)",
};

const confidenceStyle: Record<Confidence, string> = {
  verified: "bg-volt/15 text-volt",
  estimate: "bg-gold/15 text-gold",
  stale: "bg-rose/15 text-rose",
};

const confidenceLabel: Record<Confidence, string> = {
  verified: "Verified",
  estimate: "Estimate",
  stale: "Needs update",
};

const disciplineLabel: Record<Discipline, string> = {
  reformer: "Reformer",
  mat: "Mat",
  barre: "Barre",
  private: "Private",
};

function sgd(n: number): string {
  return "$" + (Number.isInteger(n) ? n.toString() : n.toFixed(2));
}

/** Human freshness for a "checked" date: relative label + a status colour by age. */
function freshness(iso: string, today: string): { label: string; dot: string; text: string } {
  const days = Math.max(0, Math.round((Date.parse(today) - Date.parse(iso)) / 86400000));
  const label =
    days <= 0 ? "checked today" : days === 1 ? "checked yesterday" : days < 30 ? `checked ${days}d ago` : days < 365 ? `checked ${Math.round(days / 30)}mo ago` : `checked ${Math.round(days / 365)}y ago`;
  if (days <= 45) return { label, dot: "bg-volt", text: "text-muted" };
  if (days <= 365) return { label, dot: "bg-gold", text: "text-muted" };
  return { label, dot: "bg-rose", text: "text-rose" };
}

const selectClass =
  "rounded-md border-2 border-line bg-panel px-3 py-2 text-sm text-fg outline-none transition focus:border-volt";

export default function PriceExplorer({ studios, today }: { studios: Studio[]; today: string }) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const [compareBy, setCompareBy] = useState<Lens>("value");
  const [conf, setConf] = useState<"all" | Confidence>("all");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const lens = lensConfig[compareBy];

  const areas = useMemo(() => {
    const s = new Set<string>();
    studios.forEach((st) => st.areas.forEach((a) => s.add(a)));
    return Array.from(s).sort();
  }, [studios]);

  const confCounts = useMemo(() => {
    const c: Record<string, number> = { all: studios.length, verified: 0, estimate: 0, stale: 0 };
    studios.forEach((st) => (c[st.confidence] = (c[st.confidence] ?? 0) + 1));
    return c;
  }, [studios]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = studios.filter((st) => {
      if (area !== "all" && !st.areas.includes(area)) return false;
      if (lens.planType && !st.plans.some((p) => p.type === lens.planType)) return false;
      if (conf !== "all" && st.confidence !== conf) return false;
      if (q) {
        const hay = (st.name + " " + st.areas.join(" ")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return rows.sort((a, b) => {
      if (sortDir === "name") return a.name.localeCompare(b.name);
      const av = lens.price(a);
      const bv = lens.price(b);
      // Studios without a price for this lens always sort last, either direction.
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [studios, query, area, lens, conf, sortDir]);

  // Top-3 cheapest for the active lens (within the current results) — badged on cards.
  const valueRank = useMemo(() => {
    const m = new Map<string, number>();
    filtered
      .map((s) => ({ id: s.id, pc: lens.price(s) }))
      .filter((x): x is { id: string; pc: number } => x.pc != null)
      .sort((a, b) => a.pc - b.pc)
      .slice(0, 3)
      .forEach((x, i) => m.set(x.id, i));
    return m;
  }, [filtered, lens]);

  return (
    <div>
      {/* Controls */}
      <div className="mb-8 rounded-lg border-2 border-line bg-panel p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search studio or area…"
            className="min-w-[12rem] flex-1 rounded-md border-2 border-line bg-ink px-4 py-2 text-sm text-fg outline-none transition placeholder:text-muted focus:border-volt"
          />
          <select value={area} onChange={(e) => setArea(e.target.value)} className={selectClass}>
            <option value="all">All areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={compareBy}
            onChange={(e) => setCompareBy(e.target.value as Lens)}
            className={selectClass}
            aria-label="Compare studios by"
          >
            {(Object.keys(lensConfig) as Lens[]).map((k) => (
              <option key={k} value={k}>Compare: {lensConfig[k].label}</option>
            ))}
          </select>
          <select
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as SortDir)}
            className={selectClass}
            aria-label="Sort order"
          >
            {(Object.keys(sortDirLabels) as SortDir[]).map((k) => (
              <option key={k} value={k}>Sort: {sortDirLabels[k]}</option>
            ))}
          </select>
        </div>

        {/* Badge (data quality) filter */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Data quality</span>
          {(["all", "verified", "estimate", "stale"] as const).map((k) => {
            const active = conf === k;
            const label = k === "all" ? "All" : confidenceLabel[k];
            return (
              <button
                key={k}
                onClick={() => setConf(k)}
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                  active ? "bg-volt text-ink" : k === "all" ? "bg-panel-2 text-fg hover:bg-line" : `${confidenceStyle[k]} hover:brightness-125`
                }`}
              >
                {label} <span className="opacity-60">{confCounts[k] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Best-value board — ranks the current results by the active lens */}
      <TopValue
        studios={filtered}
        price={lens.price}
        unit={lens.unit}
        metricLabel={lens.metricLabel}
        caption={lens.caption}
      />

      <p className="mb-4 text-sm text-muted">
        {filtered.length} studio{filtered.length === 1 ? "" : "s"}
      </p>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((st) => {
          const promos = activePromos(st, today);
          const perClass = lowestPerClass(st);
          const drop = dropInPrice(st);
          const entry = cheapestEntry(st);
          const membership = membershipMonthly(st);
          const fresh = freshness(st.lastChecked, today);
          const rank = valueRank.get(st.id);
          const isOpen = !!expanded[st.id];
          const cardBorder =
            rank === 0 ? "border-volt shadow-[6px_6px_0_var(--color-volt)]" : rank != null ? "border-volt" : "border-line";
          return (
            <article
              key={st.id}
              id={st.id}
              className={`flex scroll-mt-6 flex-col rounded-lg border-2 bg-panel p-4 ${cardBorder}`}
            >
              {rank != null && (
                <span className="mb-3 self-start rounded-full bg-volt px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">
                  {rank === 0 ? "★ Best value" : "Value pick"}
                </span>
              )}
              <div className="flex items-start gap-3">
                <StudioLogo studio={st} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-bold leading-tight text-fg">{st.name}</h2>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${confidenceStyle[st.confidence]}`}>
                      {confidenceLabel[st.confidence]}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {st.areas.slice(0, 4).map((a) => (
                      <span key={a} className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px] text-fg/70">{a}</span>
                    ))}
                    {st.areas.length > 4 && (
                      <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px] text-muted">+{st.areas.length - 4} more</span>
                    )}
                    {st.disciplines.map((d) => (
                      <span key={d} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">{disciplineLabel[d]}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Key numbers — the stat matching the active lens is highlighted */}
              <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Stat label="Drop-in" value={drop != null ? sgd(drop) : "—"} highlight={lens.stat === "dropIn"} />
                <Stat label="From / class" value={perClass != null ? sgd(Math.round(perClass * 100) / 100) : "—"} highlight={lens.stat === "perClass"} />
                {lens.stat === "membership" ? (
                  <Stat label="Membership / mo" value={membership != null ? sgd(Math.round(membership * 100) / 100) : "—"} highlight />
                ) : (
                  <Stat label="Try from" value={entry != null ? sgd(Math.round(entry * 100) / 100) : "—"} highlight={lens.stat === "entry"} />
                )}
              </dl>

              {/* Promos */}
              {promos.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  {promos.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-deal/30 bg-deal/10 px-3 py-1.5 text-sm">
                      <span className="text-fg">
                        <span className="mr-1 text-deal">✦</span>{p.label}
                        {p.source !== "website" && (
                          <span className="ml-1 text-[10px] uppercase tracking-wide text-muted">{p.source}</span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {p.originalPrice && p.originalPrice > p.price ? (
                          <span className="rounded-full bg-deal px-1.5 py-0.5 text-[10px] font-bold text-ink">
                            −{Math.round((1 - p.price / p.originalPrice) * 100)}%
                          </span>
                        ) : null}
                        <span className="font-bold text-deal">
                          {sgd(p.price)}
                          {p.originalPrice ? <span className="ml-1 text-xs font-normal text-muted line-through">{sgd(p.originalPrice)}</span> : null}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Expandable full plan list */}
              <button
                onClick={() => setExpanded((e) => ({ ...e, [st.id]: !isOpen }))}
                className="mt-4 self-start text-sm font-semibold text-volt transition hover:brightness-110"
              >
                {isOpen ? "Hide plans −" : `All plans (${st.plans.length}) +`}
              </button>
              {isOpen && (
                <ul className="mt-2 divide-y divide-line text-sm">
                  {st.plans.map((pl, i) => {
                    const pc = planPerClass(pl);
                    return (
                      <li key={i} className="flex items-baseline justify-between gap-3 py-1.5">
                        <span className="text-fg/80">
                          {pl.label}
                          {pl.notes && <span className="block text-[11px] text-muted">{pl.notes}</span>}
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="font-semibold text-fg">{sgd(pl.price)}</span>
                          {pl.period && <span className="text-muted">/{pl.period}</span>}
                          {pc != null && pl.type !== "drop-in" && (
                            <span className="block text-[11px] text-muted">{sgd(Math.round(pc * 100) / 100)}/class</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11px] text-muted">
                <div className="flex gap-3">
                  <a href={st.website} target="_blank" rel="noopener noreferrer" className="transition hover:text-volt">Website ↗</a>
                  {st.instagram && (
                    <a href={st.instagram} target="_blank" rel="noopener noreferrer" className="transition hover:text-volt">Instagram ↗</a>
                  )}
                </div>
                <a href={st.sourceUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 transition hover:text-volt ${fresh.text}`} title={`Source: ${st.sourceUrl} (checked ${st.lastChecked})`}>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${fresh.dot}`} aria-hidden />
                  {fresh.label}
                </a>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <OtterSit className="mx-auto h-20 w-auto opacity-90" />
          <p className="mt-3 text-muted">No studios match your filters.</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md px-2 py-2.5 ${highlight ? "bg-volt text-ink" : "bg-panel-2 text-fg"}`}>
      <dd className={`font-display leading-none ${highlight ? "text-3xl" : "text-xl"}`}>{value}</dd>
      <dt className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${highlight ? "text-ink/70" : "text-muted"}`}>{label}</dt>
    </div>
  );
}
