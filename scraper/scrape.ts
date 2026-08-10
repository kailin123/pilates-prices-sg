/**
 * Price scraper runner.
 *
 *   npm run scrape                       # DRY RUN: report detected prices, write nothing
 *   npm run scrape -- --apply            # apply changes to data/studios.json
 *   npm run scrape -- --apply kx-pilates # apply, only these studio ids
 *
 * Behaviour by design:
 *  - Dry run by default so a broken adapter can never silently corrupt data.
 *  - On success it merges *per plan type*: only the plan types the adapter
 *    confidently found (and that pass sanity ranges) are replaced. A type the
 *    adapter didn't find — e.g. a curated drop-in price — is left untouched.
 *  - On failure (page changed / JS-gated / network) the studio is left as-is.
 *  - NEVER touches promos whose source is not "website" (instagram/facebook/
 *    manual) — those are curated by hand. Website promos are only replaced when
 *    the adapter returns replacements.
 *
 * Reality check: many Singapore studio sites are JS-rendered or hide prices
 * behind enquiry forms, so a plain fetch often can't see them. When that happens
 * this tool reports "no prices parsed" and the hand-curated data remains the
 * source of truth. Treat the scraper as an assistant for spotting changes, not
 * an infallible oracle — hence the dry-run default.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { StudioData, Studio, Plan, PlanType } from "../lib/types";
import { adapterById, type ScrapeResult } from "./adapters";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "studios.json");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 pilates-prices-sg-bot/1.0";

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const only = argv.filter((a) => !a.startsWith("--"));

  const data: StudioData = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  const today = todayISO();
  let changed = 0;

  console.log(apply ? "APPLY mode — data/studios.json will be written.\n" : "DRY RUN — no files written (pass --apply to write).\n");

  for (const studio of data.studios) {
    const adapter = adapterById.get(studio.id);
    if (!adapter) continue;
    if (only.length && !only.includes(studio.id)) continue;

    process.stdout.write(`• ${studio.name} … `);
    try {
      const html = await fetchHtml(adapter.url);
      const result = adapter.parse(html);
      if (!result || !result.plans.length) {
        console.log("no prices parsed — keeping existing data");
        continue;
      }
      const diff = describeDiff(studio, result);
      console.log(diff.length ? `found ${result.plans.length} plan(s): ${diff.join("; ")}` : `found ${result.plans.length} plan(s), no changes`);
      if (apply && diff.length) {
        applyResult(studio, result, adapter.url, today);
        changed++;
      }
    } catch (err) {
      console.log(`failed (${(err as Error).message}) — keeping existing data`);
    }
  }

  if (apply && changed) {
    data.updatedAt = today;
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
    console.log(`\nWrote ${DATA_PATH} (${changed} studio(s) refreshed).`);
  } else if (apply) {
    console.log("\nNo changes to write.");
  } else {
    console.log("\nDry run complete. Re-run with --apply to write any changes above.");
  }
}

/** Human-readable summary of what would change for a studio. */
function describeDiff(studio: Studio, result: ScrapeResult): string[] {
  const msgs: string[] = [];
  const byType = groupByType(result.plans);
  for (const [type, fresh] of byType) {
    const oldPrices = studio.plans.filter((p) => p.type === type).map((p) => p.price);
    const newPrices = fresh.map((p) => p.price);
    if (JSON.stringify(oldPrices) !== JSON.stringify(newPrices)) {
      msgs.push(`${type} ${oldPrices.join("/") || "—"} → ${newPrices.join("/")}`);
    }
  }
  return msgs;
}

function groupByType(plans: Plan[]): Map<PlanType, Plan[]> {
  const m = new Map<PlanType, Plan[]>();
  for (const p of plans) {
    const arr = m.get(p.type) ?? [];
    arr.push(p);
    m.set(p.type, arr);
  }
  return m;
}

/** Merge fresh plans in per-type; keep untouched types and curated promos. */
function applyResult(studio: Studio, result: ScrapeResult, url: string, today: string) {
  const fresh = groupByType(result.plans);
  const keptPlans = studio.plans.filter((p) => !fresh.has(p.type));
  studio.plans = [...result.plans, ...keptPlans];

  if (result.promos.length) {
    const curated = studio.promos.filter((p) => p.source !== "website");
    studio.promos = [...curated, ...result.promos];
  }

  studio.lastChecked = today;
  studio.sourceUrl = url;
  studio.confidence = "verified";
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
