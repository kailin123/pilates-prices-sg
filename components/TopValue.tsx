import { type Studio } from "@/lib/types";
import StudioLogo from "@/components/StudioLogo";
import { OtterPeek } from "@/components/Otters";

function sgd(n: number): string {
  const r = Math.round(n * 100) / 100;
  return "$" + (Number.isInteger(r) ? r.toString() : r.toFixed(2));
}

/** Compact "best value" leaderboard — ranks studios by the caller's chosen price lens. */
export default function TopValue({
  studios,
  price,
  unit,
  metricLabel,
  caption,
}: {
  studios: Studio[];
  price: (s: Studio) => number | null;
  unit: string;
  metricLabel: string;
  caption: string;
}) {
  const ranked = studios
    .map((s) => ({ s, pc: price(s) }))
    .filter((x): x is { s: Studio; pc: number } => x.pc != null)
    .sort((a, b) => a.pc - b.pc)
    .slice(0, 5);

  if (!ranked.length) return null;

  return (
    <section className="relative mb-8 rounded-lg border-2 border-line bg-panel p-5">
      <OtterPeek className="pointer-events-none absolute -top-8 right-6 h-9 w-auto" />
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl uppercase tracking-wide text-fg">Best value</h2>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{metricLabel}</span>
      </div>
      <p className="mt-1 text-xs text-muted">{caption}</p>

      <ol className="mt-3 space-y-1">
        {ranked.map(({ s, pc }, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={`group flex items-center gap-3 rounded-md px-2.5 py-2.5 transition hover:bg-panel-2 ${i === 0 ? "bg-volt/10 ring-1 ring-inset ring-volt/40" : ""}`}
            >
              <span className={`w-5 shrink-0 text-center font-display text-xl ${i === 0 ? "text-volt" : "text-muted"}`}>{i + 1}</span>

              <StudioLogo studio={s} size="sm" />

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-bold text-fg group-hover:text-volt">{s.name}</span>
                  {i === 0 && (
                    <span className="shrink-0 rounded-full bg-volt px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink">
                      Best value
                    </span>
                  )}
                </span>
                <span className="block truncate text-[11px] text-muted">{s.areas.slice(0, 3).join(" · ") || "—"}</span>
              </span>

              <span className="shrink-0 text-right">
                <span className="font-display text-2xl text-volt">{sgd(pc)}</span>
                {unit && <span className="text-[11px] text-muted">{unit}</span>}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
