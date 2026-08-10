#!/usr/bin/env node
/*
 * Promo intake helper — the fast, legal way to bring social-media promotions in.
 *
 * Instagram/Facebook can't be auto-scraped reliably or within ToS, so when you
 * (or Claude) spot a promo on a studio's IG/TikTok/story, capture it here in one
 * line instead of hand-editing JSON. It validates the studio, appends the promo,
 * (optionally) adds a matching pack plan so "from / class" updates, and bumps the
 * data date.
 *
 *   npm run add-promo -- --list
 *   npm run add-promo -- --studio sg-pilates --label "10-class pack" --price 199 \
 *       --classes 10 --source instagram --url https://instagram.com/p/XXXX --as-pack
 *
 * Flags:
 *   --studio <id>       (required) studio id — see --list
 *   --label  <text>     (required) promo label shown on the card
 *   --price  <number>   (required) promo price in SGD
 *   --original <number>  original/U.P. price (renders as strikethrough)
 *   --classes  <number>  number of classes (needed for per-class + --as-pack)
 *   --source <kind>      website | instagram | facebook | manual   (default: manual)
 *   --url    <link>      link to the source post/page
 *   --expires <YYYY-MM-DD>  auto-hides after this date
 *   --first-timer        mark as first-timer only
 *   --as-pack            also add a matching pack plan (uses --classes for per-class)
 *   --dry-run            print what would change, write nothing
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "studios.json");

function parseArgs(argv) {
  const out = { flags: new Set(), opts: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out.flags.add(key);
    } else {
      out.opts[key] = next;
      i++;
    }
  }
  return out;
}

function die(msg) {
  console.error("✖ " + msg);
  process.exit(1);
}

const { flags, opts } = parseArgs(process.argv.slice(2));
const data = JSON.parse(readFileSync(DATA_PATH, "utf8"));

if (flags.has("list")) {
  console.log("Studios:");
  for (const s of data.studios) console.log(`  ${s.id.padEnd(18)} ${s.name}`);
  process.exit(0);
}

const studio = data.studios.find((s) => s.id === opts.studio);
if (!opts.studio) die("--studio is required (use --list to see ids)");
if (!studio) die(`unknown studio "${opts.studio}" (use --list)`);
if (!opts.label) die("--label is required");
if (opts.price === undefined) die("--price is required");

const price = Number(opts.price);
if (Number.isNaN(price)) die("--price must be a number");

const SOURCES = ["website", "instagram", "facebook", "manual"];
const source = opts.source ?? "manual";
if (!SOURCES.includes(source)) die(`--source must be one of ${SOURCES.join(", ")}`);

const classes = opts.classes !== undefined ? Number(opts.classes) : undefined;
const original = opts.original !== undefined ? Number(opts.original) : undefined;

const promo = {
  label: opts.label,
  price,
  ...(original !== undefined ? { originalPrice: original } : {}),
  ...(classes !== undefined ? { classes } : {}),
  ...(flags.has("first-timer") ? { firstTimerOnly: true } : {}),
  expires: opts.expires ?? null,
  source,
  ...(opts.url ? { sourceUrl: opts.url } : {}),
};

const summary = [`promo "${promo.label}" $${price}${original ? ` (was $${original})` : ""} [${source}]`];
studio.promos.push(promo);

if (flags.has("as-pack")) {
  if (!classes || classes <= 0) die("--as-pack needs --classes > 0");
  const perClass = Math.round((price / classes) * 100) / 100;
  studio.plans.push({ type: "pack", label: `${opts.label}`, price, classes, perClass });
  summary.push(`pack plan (${classes} classes → $${perClass}/class)`);
}

const today = new Date().toISOString().slice(0, 10);
data.updatedAt = today;
studio.lastChecked = today;

if (flags.has("dry-run")) {
  console.log(`DRY RUN — would add to ${studio.name}:\n  - ${summary.join("\n  - ")}`);
  process.exit(0);
}

writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
console.log(`✔ Added to ${studio.name}:\n  - ${summary.join("\n  - ")}\n  Wrote ${DATA_PATH}`);
