/**
 * Studio discovery — finds NEW Singapore reformer studios we don't track yet.
 *
 *   npm run discover            # DRY RUN: report candidates, write nothing
 *   npm run discover -- --apply # append new candidates to data/candidates.json
 *
 * Runs as part of the daily refresh (see .github/workflows/refresh-prices.yml).
 *
 * Design — deliberately a REVIEW QUEUE, never an auto-publisher:
 *  - It crawls a small set of stable "best pilates studios in Singapore" listing
 *    pages and pulls out external links that look like studio websites.
 *  - It diffs those against the studios we already track (data/studios.json) and
 *    against studios we've already evaluated (IGNORE below) and already surfaced
 *    (data/candidates.json), so each genuinely-new studio is reported once.
 *  - New finds are written to data/candidates.json with status "new". They do
 *    NOT appear on the live site. A human reviews the queue, verifies pricing,
 *    and hand-adds the good ones to data/studios.json (curation stays the
 *    backbone — the same reason the price scraper is dry-run by default).
 *
 * Why not auto-scrape prices for a discovered studio? Most SG studio sites are
 * JS-rendered or hide pricing behind Mindbody/Momence widgets, so a blind fetch
 * yields nothing or garbage. Discovery only claims "here's a studio worth a look".
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as cheerio from "cheerio";
import type { StudioData } from "../lib/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STUDIOS_PATH = join(__dirname, "..", "data", "studios.json");
const CANDIDATES_PATH = join(__dirname, "..", "data", "candidates.json");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 pilates-prices-sg-bot/1.0";

/**
 * Seed pages that enumerate SG pilates studios. Chosen because they list many
 * studios and link out to their sites. Add/replace freely — a dead seed just
 * yields nothing and is skipped.
 */
const SEEDS = [
  "https://thesmartlocal.com/read/pilates-studios-singapore/",
  "https://www.theurbanlist.com/singapore/a-list/best-pilates-singapore",
  "https://www.topasiaselect.com/post/best-pilates-studios-singapore-2026",
  "https://reformerfinder.com/singapore-reformer-pilates",
];

/**
 * Hosts that are NOT a studio homepage we want to surface: social/aggregators/
 * booking widgets, plus studios we've already evaluated and deliberately skipped
 * (pricing gated / not public). Seed hosts are added automatically below.
 * Compared after stripping a leading "www.".
 */
const IGNORE_HOSTS = new Set<string>([
  // social + link tools
  "instagram.com", "facebook.com", "m.facebook.com", "tiktok.com", "youtube.com",
  "youtu.be", "twitter.com", "x.com", "pinterest.com", "linktr.ee", "wa.me",
  "whatsapp.com", "api.whatsapp.com", "t.me", "lemon8-app.com",
  // booking widgets / marketplaces / maps / shops
  "classpass.com", "mindbodyonline.com", "go.mindbodyonline.com", "momence.com",
  "tagvenue.com", "getspaces.com", "google.com", "maps.google.com", "goo.gl",
  "apps.apple.com", "play.google.com", "linktree.ee", "vibefam.com",
  "bookings.vibefam.com", "amzn.to", "amazon.com", "amazon.sg", "shopee.sg",
  // media / listicle / aggregator sites (in case they cross-link each other)
  "sethlui.com", "timeout.com", "confirmgood.com", "singsaver.com.sg",
  "thegirl.co", "labstudios.com", "vaniday.com.sg", "danielfooddiary.com",
  "cryostudiofinder.com",
  // studios already evaluated & deliberately skipped (pricing not public)
  "pure-360.com.sg", "puregroup.asia", "ministryofmovement.sg", "ministryofmovement.com",
  "hausathletics.co", "realpilates.com.sg", "basepilates.sg", "base-pilates.com",
]);

/**
 * Keywords that make an external link look like a movement/pilates studio.
 * STRONG words are unambiguous, so they count in either the link text or the
 * host. WEAK words are generic (a t-shirt can be "form-fitting", a cryo place is
 * a "studio"), so they only count when they appear in the HOST, never the text.
 */
const STRONG_KEYWORDS = ["pilates", "pilate", "reformer", "barre"];
const WEAK_KEYWORDS = ["yoga", "movement", "sculpt", "studio", "method", "align", "wellness"];

/** Foreign top-level domains — we only want Singapore studios. */
const FOREIGN_TLDS = [".au", ".hk", ".uk", ".my", ".nz", ".ca", ".in", ".ph", ".id", ".th", ".us", ".ae"];

interface Candidate {
  name: string;
  url: string;
  host: string;
  /** Why we think it's a studio (matched keyword). */
  keyword: string;
  /** Seed pages that linked to it. */
  sources: string[];
  firstSeen: string;
  lastSeen: string;
  /** "new" until a human triages it; set to "added" or "rejected" by hand. */
  status: "new" | "added" | "rejected";
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function normHost(host: string): string {
  return host.replace(/^www\./, "").toLowerCase();
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Hosts of studios we already track (website + pricingUrl). */
function knownHosts(data: StudioData): Set<string> {
  const hosts = new Set<string>();
  for (const s of data.studios) {
    for (const u of [s.website, s.pricingUrl, s.sourceUrl].filter(Boolean) as string[]) {
      try { hosts.add(normHost(new URL(u).host)); } catch { /* ignore bad url */ }
    }
  }
  return hosts;
}

function pickKeyword(name: string, host: string): string | null {
  const n = name.toLowerCase();
  const h = host.toLowerCase();
  const strong = STRONG_KEYWORDS.find((k) => n.includes(k) || h.includes(k));
  if (strong) return strong;
  return WEAK_KEYWORDS.find((k) => h.includes(k)) ?? null; // weak: host only
}

/** Pull plausible studio links out of one seed page. */
function extractLinks(html: string, seedHost: string): Array<{ name: string; url: string; host: string; keyword: string }> {
  const $ = cheerio.load(html);
  const out = new Map<string, { name: string; url: string; host: string; keyword: string }>();

  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (!/^https?:\/\//i.test(href)) return;

    let host: string;
    try { host = normHost(new URL(href).host); } catch { return; }
    if (host === seedHost) return; // internal link
    if (FOREIGN_TLDS.some((tld) => host.endsWith(tld))) return; // SG only

    const name = $(el).text().replace(/\s+/g, " ").trim();
    const keyword = pickKeyword(name, host);
    if (!keyword) return; // doesn't look like a studio

    // Keep the first (usually cleanest) anchor text we see for a host. Fall back
    // to the host when the link text is junk (an icon, "★ Featured", too long).
    if (!out.has(host)) {
      const looksLikeName = /[a-z]{3,}/i.test(name) && name.length <= 60;
      out.set(host, { name: looksLikeName ? name : host, url: `https://${host}/`, host, keyword });
    }
  });

  return [...out.values()];
}

function loadCandidates(): Candidate[] {
  if (!existsSync(CANDIDATES_PATH)) return [];
  try { return JSON.parse(readFileSync(CANDIDATES_PATH, "utf8")) as Candidate[]; }
  catch { return []; }
}

async function main() {
  const apply = process.argv.slice(2).includes("--apply");
  const today = todayISO();

  const data: StudioData = JSON.parse(readFileSync(STUDIOS_PATH, "utf8"));
  const known = knownHosts(data);
  const seedHosts = new Set(SEEDS.map((s) => { try { return normHost(new URL(s).host); } catch { return ""; } }));

  const candidates = loadCandidates();
  const byHost = new Map(candidates.map((c) => [c.host, c]));

  console.log(apply ? "APPLY mode — data/candidates.json will be written.\n" : "DRY RUN — no files written (pass --apply to write).\n");

  let seen = 0, fresh = 0, updated = 0;

  for (const seed of SEEDS) {
    const seedHost = normHost(new URL(seed).host);
    process.stdout.write(`• ${seedHost} … `);
    let links: ReturnType<typeof extractLinks>;
    try {
      links = extractLinks(await fetchHtml(seed), seedHost);
    } catch (err) {
      console.log(`failed (${(err as Error).message}) — skipping`);
      continue;
    }
    console.log(`${links.length} studio-like link(s)`);

    for (const link of links) {
      const host = link.host;
      if (known.has(host) || IGNORE_HOSTS.has(host) || seedHosts.has(host)) continue;
      seen++;

      const existing = byHost.get(host);
      if (existing) {
        // Already queued — just record we saw it again from this seed.
        existing.lastSeen = today;
        if (!existing.sources.includes(seed)) existing.sources.push(seed);
        updated++;
      } else {
        const c: Candidate = {
          name: link.name,
          url: link.url,
          host,
          keyword: link.keyword,
          sources: [seed],
          firstSeen: today,
          lastSeen: today,
          status: "new",
        };
        candidates.push(c);
        byHost.set(host, c);
        fresh++;
        console.log(`   ➕ NEW: ${c.name}  (${host})`);
      }
    }
  }

  const pendingNew = candidates.filter((c) => c.status === "new").length;
  console.log(`\n${seen} studio-like link(s) matched; ${fresh} new, ${updated} re-seen. ${pendingNew} awaiting review.`);

  if (apply && (fresh || updated)) {
    // Newest-first so the review queue shows recent finds at the top.
    candidates.sort((a, b) => (a.firstSeen < b.firstSeen ? 1 : -1));
    writeFileSync(CANDIDATES_PATH, JSON.stringify(candidates, null, 2) + "\n");
    console.log(`Wrote ${CANDIDATES_PATH}.`);
    if (fresh) console.log("Review with:  npm run candidates");
  } else if (apply) {
    console.log("No changes to write.");
  } else {
    console.log("Dry run complete. Re-run with --apply to write the queue.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
