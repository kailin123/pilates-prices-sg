#!/usr/bin/env node
/*
 * LLM reviewer for crowd-sourced promo submissions.
 *
 * Reads pending submissions (from a published Google-Sheet CSV, or the local
 * data/submissions.json queue), asks Claude to vet + extract each one, and
 * auto-publishes only the high-confidence, sane-priced, studio-matched ones to
 * data/studios.json. Everything else is written to data/review-log.json for an
 * optional human glance — nothing questionable goes live.
 *
 *   npm run review                 # DRY RUN: print decisions, write nothing
 *   npm run review -- --apply      # publish approved promos + record decisions
 *
 * Env:
 *   ANTHROPIC_API_KEY   required (or an `ant auth login` profile)
 *   REVIEW_MODEL        model id (default claude-opus-5; claude-haiku-4-5 is far cheaper)
 *   SUBMISSIONS_CSV_URL optional: a Google Sheet "Publish to web → CSV" URL.
 *                       If unset, reads data/submissions.json.
 *
 * Safety: dry-run by default; auto-publishes only verdict=approve AND
 * confidence=high AND price within sane ranges AND a matched studio id.
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data", "studios.json");
const QUEUE = join(__dirname, "..", "data", "submissions.json");
const INBOX = join(__dirname, "..", "data", "inbox.json"); // email-free mirror of the Sheet, synced by GitHub Actions
const SEEN = join(__dirname, "..", "data", "reviewed.json");
const LOG = join(__dirname, "..", "data", "review-log.json");

const APPLY = process.argv.includes("--apply");
const PREP = process.argv.includes("--prep");        // no-API: print pending tips + evidence for a human/Claude to judge
const MARK_SEEN = process.argv.includes("--mark-seen"); // no-API: mark all pending as reviewed (run after judging)
const MODEL = process.env.REVIEW_MODEL || "claude-opus-5";

// Same plausibility ranges the scraper uses — a promo outside these is rejected.
const SANE = { "drop-in": [25, 120], intro: [40, 400], pack: [150, 5000], unlimited: [100, 700] };

function loadJSON(path, fallback) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback;
}
function keyOf(s) {
  return `${(s.studio || "").toLowerCase()}|${(s.url || "").trim()}`;
}
function hostSource(url) {
  const h = (() => { try { return new URL(url).hostname; } catch { return ""; } })();
  if (/instagram\.com/i.test(h)) return "instagram";
  if (/facebook\.com|fb\.com/i.test(h)) return "facebook";
  if (/tiktok\.com/i.test(h)) return "manual";
  return "website";
}

/** Parse a simple CSV (handles quoted fields + embedded commas/newlines). */
function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c === "\r") { /* skip */ }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/** Load submissions from a Google Sheet CSV or the local queue. */
async function loadSubmissions() {
  const csvUrl = process.env.SUBMISSIONS_CSV_URL;
  if (csvUrl) {
    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error(`CSV fetch failed: HTTP ${res.status}`);
    const rows = parseCSV(await res.text());
    const header = rows.shift().map((h) => h.toLowerCase());
    const col = (kw) => header.findIndex((h) => h.includes(kw));
    const iStudio = col("studio"), iUrl = col("link"), iOffer = col("offer"), iEmail = col("email");
    return rows.map((r) => ({
      studio: r[iStudio] || "", url: r[iUrl] || "", offer: r[iOffer] || "", email: r[iEmail] || "",
      submittedAt: r[0] || "",
    }));
  }
  // Prefer the committed, email-free inbox (used by the cloud routine, which can't reach Google);
  // fall back to the local dev queue.
  if (existsSync(INBOX)) return loadJSON(INBOX, []);
  return loadJSON(QUEUE, []);
}

/** Best-effort fetch of a promo landing page so Claude can verify prices it can see. */
async function fetchEvidence(url) {
  if (hostSource(url) !== "website") return null; // social pages aren't fetchable
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 pilates-prices-sg-bot/1.0" }, redirect: "follow" });
    if (!res.ok) return null;
    const html = await res.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 6000);
  } catch { return null; }
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["approve", "reject", "uncertain"] },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    reason: { type: "string" },
    studioId: { type: ["string", "null"] },
    promo: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        label: { type: "string" },
        planType: { type: "string", enum: ["drop-in", "intro", "pack", "unlimited"] },
        price: { type: "number" },
        originalPrice: { type: ["number", "null"] },
        classes: { type: ["integer", "null"] },
        firstTimerOnly: { type: "boolean" },
        expires: { type: ["string", "null"] },
      },
      required: ["label", "planType", "price", "originalPrice", "classes", "firstTimerOnly", "expires"],
    },
  },
  required: ["verdict", "confidence", "reason", "studioId", "promo"],
};

function buildPrompt(sub, studios, evidence) {
  const roster = studios.map((s) => `- ${s.id}: ${s.name} (${s.areas.join(", ")})`).join("\n");
  return `You are vetting a crowd-sourced pilates promotion tip for a Singapore reformer-pilates price-comparison site. Decide whether it is a genuine, relevant promo and extract structured fields.

Known studios (map to one id, or null if none clearly match):
${roster}

Submission:
- Studio (as typed by submitter): ${sub.studio || "(none)"}
- Link: ${sub.url}
- Offer text: ${sub.offer || "(none)"}
${evidence ? `\nText extracted from the linked page (may help verify the price):\n"""${evidence}"""` : "\n(The link is a social-media post and could not be fetched; judge from the offer text.)"}

Rules:
- approve only a real pilates class promo (a price/deal) for one of the known studios. reject spam, unrelated links, affiliate/discount-code pages, or promos for studios not in the list. Use uncertain when it looks plausible but you cannot confirm the price or the studio.
- Set confidence "high" only when the price and studio are clear from the offer text or fetched page.
- promo.planType: "drop-in" single class, "intro" first-timer trial, "pack" multi-class bundle, "unlimited" membership.
- promo.price is the SGD amount. Set originalPrice only if a strikethrough/U.P. price is stated. Set expires as YYYY-MM-DD only if a clear end date is given, else null.
- If you cannot map to a known studio, set studioId null and verdict reject or uncertain.`;
}

function decideAutoPublish(r) {
  if (!r || r.verdict !== "approve" || r.confidence !== "high") return false;
  if (!r.studioId || !r.promo) return false;
  const [lo, hi] = SANE[r.promo.planType] || [];
  return typeof r.promo.price === "number" && r.promo.price >= lo && r.promo.price <= hi;
}

async function main() {
  const data = loadJSON(DATA, null);
  if (!data) { console.error("data/studios.json not found"); process.exit(1); }
  const seen = new Set(loadJSON(SEEN, []));
  const log = loadJSON(LOG, []);
  const subs = (await loadSubmissions()).filter((s) => s.url && !seen.has(keyOf(s)));

  // --- No-API modes (use your Claude subscription, not the metered API) ---
  if (PREP) {
    if (!subs.length) { console.log("No new submissions to review."); return; }
    console.log(`${subs.length} pending submission(s). Known studios:\n`);
    for (const s of data.studios) console.log(`  ${s.id} — ${s.name} (${s.areas.join(", ")})`);
    console.log("\nUsable plan types: drop-in | intro | pack | unlimited. Sane price ranges (SGD): " +
      Object.entries(SANE).map(([k, [lo, hi]]) => `${k} ${lo}-${hi}`).join(", ") + "\n");
    for (let i = 0; i < subs.length; i++) {
      const s = subs[i];
      const evidence = await fetchEvidence(s.url);
      console.log(`──── #${i + 1} ────────────────────────────────────────────`);
      console.log(`studio (typed): ${s.studio || "(none)"}`);
      console.log(`link:           ${s.url}   [${hostSource(s.url)}]`);
      console.log(`offer:          ${s.offer || "(none)"}`);
      console.log(`page text:      ${evidence ? evidence.slice(0, 800) + "…" : "(not fetchable — social/image link)"}`);
      console.log("");
    }
    console.log("→ Judge each, then publish good ones with `npm run add-promo`, and run `npm run review -- --mark-seen`.");
    return;
  }
  if (MARK_SEEN) {
    subs.forEach((s) => seen.add(keyOf(s)));
    writeFileSync(SEEN, JSON.stringify([...seen], null, 2) + "\n");
    console.log(`Marked ${subs.length} submission(s) as reviewed.`);
    return;
  }

  console.log(`${APPLY ? "APPLY" : "DRY RUN"} · model ${MODEL} · ${subs.length} new submission(s)\n`);
  if (!subs.length) { console.log("Nothing new to review."); return; }

  const client = new Anthropic();
  let published = 0;

  for (const sub of subs) {
    process.stdout.write(`• ${sub.studio || "(?)"} — ${sub.url}\n`);
    let result = null;
    try {
      const evidence = await fetchEvidence(sub.url);
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
        messages: [{ role: "user", content: buildPrompt(sub, data.studios, evidence) }],
      });
      const text = res.content.find((b) => b.type === "text")?.text ?? "{}";
      result = JSON.parse(text);
    } catch (err) {
      console.log(`   error: ${err.message} — skipping (not marked seen)\n`);
      continue; // leave unseen so a transient failure retries next run
    }

    const publish = decideAutoPublish(result);
    console.log(`   → ${result.verdict}/${result.confidence} · ${result.studioId ?? "no-match"} · ${publish ? "PUBLISH" : "hold"} — ${result.reason}\n`);

    if (publish && APPLY) {
      const studio = data.studios.find((s) => s.id === result.studioId);
      // Safety net: never add the same source link twice, even if reviewed.json was lost.
      const dup = studio && studio.promos.some((p) => p.sourceUrl === sub.url);
      if (studio && !dup) {
        studio.promos.push({
          label: result.promo.label,
          price: result.promo.price,
          ...(result.promo.originalPrice != null ? { originalPrice: result.promo.originalPrice } : {}),
          ...(result.promo.classes != null ? { classes: result.promo.classes } : {}),
          ...(result.promo.firstTimerOnly ? { firstTimerOnly: true } : {}),
          expires: result.promo.expires ?? null,
          source: hostSource(sub.url),
          sourceUrl: sub.url,
        });
        studio.lastChecked = new Date().toISOString().slice(0, 10);
        published++;
      }
    }

    log.push({ ...sub, decidedAt: new Date().toISOString(), result, published: publish && APPLY });
    seen.add(keyOf(sub));
  }

  if (APPLY) {
    if (published) { data.updatedAt = new Date().toISOString().slice(0, 10); writeFileSync(DATA, JSON.stringify(data, null, 2) + "\n"); }
    writeFileSync(SEEN, JSON.stringify([...seen], null, 2) + "\n");
    writeFileSync(LOG, JSON.stringify(log, null, 2) + "\n");
    console.log(`Published ${published} promo(s); logged ${subs.length} decision(s).`);
  } else {
    console.log("Dry run — nothing written. Re-run with --apply to publish approved promos.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
