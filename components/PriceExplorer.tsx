"use client";

import { useMemo, useState } from "react";
import {
  type Studio,
  type Discipline,
  type Confidence,
  planPerClass,
  lowestPerClass,
  cheapestEntry,
  dropInPrice,
  activePromos,
} from "@/lib/types";

type SortKey = "perClass" | "dropIn" | "entry" | "name";

const sortLabels: Record<SortKey, string> = {
  perClass: "Lowest price / class",
  dropIn: "Drop-in price",
  entry: "Cheapest to try",
  name: "Studio name",
};

const confidenceStyle: Record<Confidence, string> = {
  verified: "bg-sage-soft text-sage-deep",
  estimate: "bg-gold-soft text-gold",
  stale: "bg-rose-soft text-rose",
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

// Muted accents for monogram avatars (studios without a fetched logo).
const monogramColors = [
  "bg-sage-soft text-sage-deep",
  "bg-clay-soft text-clay",
  "bg-gold-soft text-gold",
  "bg-rose-soft text-rose",
];

function sgd(n: number): string {
  return "$" + (Number.isInteger(n) ? n.toString() : n.toFixed(2));
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string): string {
  const words = name.replace(/[^a-zA-Z ]/g, "").trim().split(/\s+/);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "P";
}

function StudioLogo({ studio }: { studio: Studio }) {
  const [broken, setBroken] = useState(false);
  if (studio.logo && !broken) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white p-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={studio.logo}
          alt={`${studio.name} logo`}
          className="h-full w-full object-contain"
          onError={() => setBroken(true)}
          loading="lazy"
        />
      </div>
    );
  }
  const color = monogramColors[studio.id.charCodeAt(0) % monogramColors.length];
  return (
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-display text-lg ${color}`}>
      {initials(studio.name)}
    </div>
  );
}

const selectClass =
  "rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-sage";

export default function PriceExplorer({ studios, today }: { studios: Studio[]; today: string }) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const [discipline, setDiscipline] = useState<"all" | Discipline>("all");
  const [conf, setConf] = useState<"all" | Confidence>("all");
  const [sort, setSort] = useState<SortKey>("perClass");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
      if (discipline !== "all" && !st.disciplines.includes(discipline)) return false;
      if (conf !== "all" && st.confidence !== conf) return false;
      if (q) {
        const hay = (st.name + " " + st.areas.join(" ")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const val = (st: Studio): number => {
      if (sort === "name") return 0;
      const v =
        sort === "dropIn" ? dropInPrice(st) : sort === "entry" ? cheapestEntry(st) : lowestPerClass(st);
      return v == null ? Number.POSITIVE_INFINITY : v;
    };

    return rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      return val(a) - val(b);
    });
  }, [studios, query, area, discipline, conf, sort]);

  return (
    <div>
      {/* Controls */}
      <div className="mb-8 rounded-2xl border border-line bg-surface/70 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search studio or area…"
            className="min-w-[12rem] flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink shadow-sm outline-none transition placeholder:text-muted/70 focus:border-sage"
          />
          <select value={area} onChange={(e) => setArea(e.target.value)} className={selectClass}>
            <option value="all">All areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value as "all" | Discipline)}
            className={selectClass}
          >
            <option value="all">All types</option>
            {(["reformer", "mat", "barre", "private"] as Discipline[]).map((d) => (
              <option key={d} value={d}>{disciplineLabel[d]}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selectClass}>
            {(Object.keys(sortLabels) as SortKey[]).map((k) => (
              <option key={k} value={k}>Sort: {sortLabels[k]}</option>
            ))}
          </select>
        </div>

        {/* Badge (data quality) filter */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs uppercase tracking-wide text-muted">Data quality</span>
          {(["all", "verified", "estimate", "stale"] as const).map((k) => {
            const active = conf === k;
            const label = k === "all" ? "All" : confidenceLabel[k];
            return (
              <button
                key={k}
                onClick={() => setConf(k)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "bg-ink text-cream"
                    : k === "all"
                    ? "bg-oat text-ink hover:bg-line"
                    : `${confidenceStyle[k]} opacity-90 hover:opacity-100`
                }`}
              >
                {label} <span className="opacity-60">{confCounts[k] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mb-4 text-sm text-muted">
        {filtered.length} studio{filtered.length === 1 ? "" : "s"}
      </p>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((st) => {
          const promos = activePromos(st, today);
          const perClass = lowestPerClass(st);
          const drop = dropInPrice(st);
          const entry = cheapestEntry(st);
          const isOpen = !!expanded[st.id];
          return (
            <article
              key={st.id}
              className="flex flex-col rounded-3xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(58,52,44,0.04),0_8px_24px_-16px_rgba(58,52,44,0.25)]"
            >
              <div className="flex items-start gap-3">
                <StudioLogo studio={st} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-xl font-normal leading-tight text-ink">{st.name}</h2>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${confidenceStyle[st.confidence]}`}>
                      {confidenceLabel[st.confidence]}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {st.areas.slice(0, 4).map((a) => (
                      <span key={a} className="rounded-full bg-oat px-2 py-0.5 text-[11px] text-ink/70">{a}</span>
                    ))}
                    {st.areas.length > 4 && (
                      <span className="rounded-full bg-oat px-2 py-0.5 text-[11px] text-muted">+{st.areas.length - 4} more</span>
                    )}
                    {st.disciplines.map((d) => (
                      <span key={d} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">{disciplineLabel[d]}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Key numbers */}
              <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Stat label="Drop-in" value={drop != null ? sgd(drop) : "—"} />
                <Stat label="From / class" value={perClass != null ? sgd(Math.round(perClass * 100) / 100) : "—"} highlight />
                <Stat label="Try from" value={entry != null ? sgd(Math.round(entry * 100) / 100) : "—"} />
              </dl>

              {/* Promos */}
              {promos.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  {promos.map((p, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-2 rounded-xl bg-clay-soft px-3 py-1.5 text-sm">
                      <span className="text-clay">
                        <span className="mr-1">✦</span>{p.label}
                        {p.source !== "website" && (
                          <span className="ml-1 text-[10px] uppercase tracking-wide opacity-70">{p.source}</span>
                        )}
                      </span>
                      <span className="shrink-0 font-semibold text-clay">
                        {sgd(p.price)}
                        {p.originalPrice ? <span className="ml-1 text-xs font-normal opacity-60 line-through">{sgd(p.originalPrice)}</span> : null}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Expandable full plan list */}
              <button
                onClick={() => setExpanded((e) => ({ ...e, [st.id]: !isOpen }))}
                className="mt-4 self-start text-sm font-medium text-sage transition hover:text-sage-deep"
              >
                {isOpen ? "Hide plans −" : `All plans (${st.plans.length}) +`}
              </button>
              {isOpen && (
                <ul className="mt-2 divide-y divide-line/70 text-sm">
                  {st.plans.map((pl, i) => {
                    const pc = planPerClass(pl);
                    return (
                      <li key={i} className="flex items-baseline justify-between gap-3 py-1.5">
                        <span className="text-ink/80">
                          {pl.label}
                          {pl.notes && <span className="block text-[11px] text-muted">{pl.notes}</span>}
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="font-medium">{sgd(pl.price)}</span>
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
              <div className="mt-5 flex items-center justify-between border-t border-line pt-3 text-[11px] text-muted">
                <div className="flex gap-3">
                  <a href={st.website} target="_blank" rel="noopener noreferrer" className="transition hover:text-sage">Website ↗</a>
                  {st.instagram && (
                    <a href={st.instagram} target="_blank" rel="noopener noreferrer" className="transition hover:text-sage">Instagram ↗</a>
                  )}
                </div>
                <a href={st.sourceUrl} target="_blank" rel="noopener noreferrer" className="transition hover:text-sage" title={`Source: ${st.sourceUrl}`}>
                  Checked {fmtDate(st.lastChecked)}
                </a>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-20 text-center text-muted">No studios match your filters.</p>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl px-2 py-2.5 ${highlight ? "bg-sage text-cream" : "bg-oat/70 text-ink"}`}>
      <dd className="font-display text-lg leading-none">{value}</dd>
      <dt className={`mt-1 text-[10px] uppercase tracking-wide ${highlight ? "text-cream/75" : "text-muted"}`}>{label}</dt>
    </div>
  );
}
