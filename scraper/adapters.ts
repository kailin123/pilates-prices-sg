import * as cheerio from "cheerio";
import type { Plan, Promo, PlanType } from "../lib/types";

/**
 * One adapter per studio. Each fetches the studio's public pricing page and
 * extracts prices. Studio sites change often and many are JS-rendered or gate
 * prices behind "enquire" forms, so every adapter is defensive:
 *
 *  - It only returns a price when that price passes a sanity range for its plan
 *    type (see SANE below). A stray "$20" from a nav/cookie banner is rejected
 *    rather than written as a drop-in price.
 *  - If it can't confidently find prices it returns `null`, and the pipeline
 *    (scrape.ts) keeps the last-known curated data instead of destroying it.
 *
 * Social-media promos (Instagram/Facebook) are NOT scraped here — that's against
 * platform ToS and unreliable. Those are curated by hand in data/studios.json
 * (promos with source "instagram"/"facebook"/"manual") and preserved across scrapes.
 */

export interface ScrapeResult {
  plans: Plan[];
  promos: Promo[];
  /** All amounts parsed from the page — useful when debugging a broken adapter. */
  rawPrices?: number[];
}

export interface Adapter {
  id: string;
  url: string;
  parse: (html: string) => ScrapeResult | null;
}

/** Plausible SGD ranges per plan type. Anything outside is treated as noise. */
const SANE: Record<PlanType, [number, number]> = {
  "drop-in": [25, 120],
  intro: [40, 400],
  pack: [150, 5000],
  unlimited: [100, 700],
};

export function inRange(type: PlanType, price: number): boolean {
  const [lo, hi] = SANE[type];
  return price >= lo && price <= hi;
}

const money = /(?:S?\$|SGD\s*)\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi;

/** Pull all SGD-looking amounts out of a blob of text. */
export function extractPrices(text: string): number[] {
  const out: number[] = [];
  let m: RegExpExecArray | null;
  money.lastIndex = 0;
  while ((m = money.exec(text)) !== null) {
    const n = Number(m[1].replace(/,/g, ""));
    if (!Number.isNaN(n) && n > 0) out.push(n);
  }
  return out;
}

/** Find the first sane price that appears in the same text node as a keyword. */
function priceNear($: cheerio.CheerioAPI, keyword: RegExp, type: PlanType): number | null {
  let found: number | null = null;
  $("body *").each((_, el) => {
    if (found != null) return;
    const t = $(el).clone().children().remove().end().text().trim();
    if (t && keyword.test(t)) {
      const price = extractPrices(t).find((p) => inRange(type, p));
      if (price != null) found = price;
    }
  });
  return found;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const adapters: Adapter[] = [
  {
    id: "pilates-fitness",
    url: "https://pilatesfitness.com.sg/pricing/",
    parse(html) {
      const $ = cheerio.load(html);
      const plans: Plan[] = [];
      const dropIn = priceNear($, /drop.?in|single (group )?class/i, "drop-in");
      if (dropIn) plans.push({ type: "drop-in", label: "Single group class", price: dropIn });
      for (const n of [10, 15, 25]) {
        const p = priceNear($, new RegExp(`${n}\\s*(group )?class`, "i"), "pack");
        if (p) plans.push({ type: "pack", label: `${n} group classes`, price: p, classes: n, perClass: round2(p / n) });
      }
      if (!plans.length) return null;
      return { plans, promos: [], rawPrices: extractPrices($("body").text()) };
    },
  },
  {
    id: "core-reformery",
    url: "https://thecorereformery.com/pricing/",
    parse(html) {
      const $ = cheerio.load(html);
      const plans: Plan[] = [];
      const pack5 = priceNear($, /5\s*class/i, "pack");
      if (pack5) plans.push({ type: "pack", label: "5 class pack", price: pack5, classes: 5, perClass: round2(pack5 / 5) });
      const lite = priceNear($, /lite (monthly )?pass/i, "unlimited");
      if (lite) plans.push({ type: "unlimited", label: "Lite Monthly Pass", price: lite, period: "month" });
      if (!plans.length) return null;
      return { plans, promos: [], rawPrices: extractPrices($("body").text()) };
    },
  },
  {
    id: "kx-pilates",
    url: "https://kxpilates.com/sg",
    parse(html) {
      const $ = cheerio.load(html);
      const plans: Plan[] = [];
      const dropIn = priceNear($, /drop.?in|single class|casual/i, "drop-in");
      if (dropIn) plans.push({ type: "drop-in", label: "Single class", price: dropIn });
      const intro = priceNear($, /intro|starter/i, "intro");
      if (intro) plans.push({ type: "intro", label: "Intro pack", price: intro });
      if (!plans.length) return null;
      return { plans, promos: [], rawPrices: extractPrices($("body").text()) };
    },
  },
];

export const adapterById = new Map(adapters.map((a) => [a.id, a]));
