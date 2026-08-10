// Core data model for the SG Pilates price comparison site.

export type Discipline = "reformer" | "mat" | "barre" | "private";

export type PlanType = "drop-in" | "pack" | "unlimited" | "intro";

/** Where a price was sourced from — drives the confidence badge in the UI. */
export type SourceKind = "website" | "instagram" | "facebook" | "manual";

export type Confidence = "verified" | "stale" | "estimate";

export interface Plan {
  type: PlanType;
  label: string;
  /** Price in SGD. */
  price: number;
  /** Number of classes for packs / intro offers. */
  classes?: number;
  /** True for unlimited memberships. */
  unlimited?: boolean;
  /** Billing period for memberships. */
  period?: "week" | "month" | null;
  /** How long the credits stay valid (packs). */
  validityDays?: number | null;
  /** Explicit per-class price if the studio quotes one; otherwise computed. */
  perClass?: number | null;
  shareable?: boolean;
  notes?: string;
}

/** A time-limited promotion, often sourced from social media. */
export interface Promo {
  label: string;
  price: number;
  originalPrice?: number | null;
  classes?: number | null;
  firstTimerOnly?: boolean;
  /** ISO date (YYYY-MM-DD) the promo expires, or null if open-ended/unknown. */
  expires?: string | null;
  source: SourceKind;
  sourceUrl?: string;
}

export interface Studio {
  id: string;
  name: string;
  areas: string[];
  locations?: string[];
  disciplines: Discipline[];
  website: string;
  instagram?: string;
  pricingUrl?: string;
  /** Path to a locally-hosted logo under /public/logos, if we have one. */
  logo?: string;
  plans: Plan[];
  promos: Promo[];
  /** ISO date the prices were last confirmed. */
  lastChecked: string;
  /** Primary URL the prices were read from. */
  sourceUrl: string;
  confidence: Confidence;
  notes?: string;
}

export interface StudioData {
  currency: "SGD";
  updatedAt: string;
  studios: Studio[];
}

/** Effective per-class price for a plan (uses explicit perClass, else derives it). */
export function planPerClass(plan: Plan): number | null {
  if (plan.perClass != null) return plan.perClass;
  if (plan.type === "unlimited") return null; // depends on usage
  if (plan.classes && plan.classes > 0) return plan.price / plan.classes;
  if (plan.type === "drop-in") return plan.price;
  return null;
}

/** Lowest committed per-class price across a studio's packs/drop-in (ignores intro & unlimited). */
export function lowestPerClass(studio: Studio): number | null {
  const candidates = studio.plans
    .filter((p) => p.type === "pack" || p.type === "drop-in")
    .map(planPerClass)
    .filter((v): v is number => v != null);
  return candidates.length ? Math.min(...candidates) : null;
}

/** Cheapest way to try the studio once: min of intro-per-class and drop-in. */
export function cheapestEntry(studio: Studio): number | null {
  const candidates = studio.plans
    .filter((p) => p.type === "intro" || p.type === "drop-in")
    .map(planPerClass)
    .filter((v): v is number => v != null);
  return candidates.length ? Math.min(...candidates) : null;
}

export function dropInPrice(studio: Studio): number | null {
  const d = studio.plans.find((p) => p.type === "drop-in");
  return d ? d.price : null;
}

/** Cheapest per-class price among a studio's class packs. */
export function packPerClass(studio: Studio): number | null {
  const candidates = studio.plans
    .filter((p) => p.type === "pack")
    .map(planPerClass)
    .filter((v): v is number => v != null);
  return candidates.length ? Math.min(...candidates) : null;
}

/** Cheapest monthly-equivalent price among a studio's unlimited memberships. */
export function membershipMonthly(studio: Studio): number | null {
  const candidates = studio.plans
    .filter((p) => p.type === "unlimited")
    // Normalise a weekly membership to a monthly figure so lenses compare like-for-like.
    .map((p) => (p.period === "week" ? (p.price * 52) / 12 : p.price));
  return candidates.length ? Math.min(...candidates) : null;
}

export function activePromos(studio: Studio, today: string): Promo[] {
  return studio.promos.filter((p) => !p.expires || p.expires >= today);
}
