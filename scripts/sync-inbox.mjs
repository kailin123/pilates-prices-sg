#!/usr/bin/env node
/*
 * Bridge: fetch the Google Form responses (published CSV) and write them into the
 * repo as data/inbox.json — WITHOUT the email column.
 *
 * Why: the weekly review runs in a cloud sandbox that can't reach docs.google.com,
 * but it can read the repo. So GitHub Actions (which has open internet) runs this
 * to mirror the Sheet into the repo; the routine then reviews from data/inbox.json.
 *
 *   SUBMISSIONS_CSV_URL="https://docs.google.com/.../export?format=csv" node scripts/sync-inbox.mjs
 *
 * inbox.json is email-free and safe to commit (studio / link / offer only).
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "inbox.json");

const url = process.env.SUBMISSIONS_CSV_URL;
if (!url) {
  console.error("SUBMISSIONS_CSV_URL is not set — nothing to sync.");
  process.exit(0); // not an error; the workflow simply skips
}

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

const res = await fetch(url, { redirect: "follow" });
if (!res.ok) { console.error(`CSV fetch failed: HTTP ${res.status}`); process.exit(1); }

const rows = parseCSV(await res.text());
const header = (rows.shift() || []).map((h) => h.toLowerCase());
const col = (kw) => header.findIndex((h) => h.includes(kw));
const iStudio = col("studio"), iUrl = col("link"), iOffer = col("offer");

// Email column is deliberately NOT read — inbox.json never contains PII.
const inbox = rows
  .map((r) => ({
    studio: (r[iStudio] || "").trim(),
    url: (r[iUrl] || "").trim(),
    offer: (r[iOffer] || "").trim(),
    submittedAt: (r[0] || "").trim(),
  }))
  .filter((s) => s.url);

writeFileSync(OUT, JSON.stringify(inbox, null, 2) + "\n");
console.log(`Wrote ${inbox.length} submission(s) to data/inbox.json (email-free).`);
