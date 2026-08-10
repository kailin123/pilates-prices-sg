/**
 * List the studio-discovery review queue (data/candidates.json).
 *
 *   npm run candidates            # show candidates awaiting review (status "new")
 *   npm run candidates -- --all   # show everything, including added/rejected
 *
 * These are studios the daily `discover` step found but that we don't track yet.
 * Nothing here is public. Triage: open the site, verify pricing, then either
 * hand-add it to data/studios.json (and set the candidate's status to "added")
 * or set its status to "rejected".
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATH = join(__dirname, "..", "data", "candidates.json");

const all = process.argv.slice(2).includes("--all");

if (!existsSync(PATH)) {
  console.log("No data/candidates.json yet — run `npm run discover -- --apply` first.");
  process.exit(0);
}

const candidates = JSON.parse(readFileSync(PATH, "utf8"));
const shown = all ? candidates : candidates.filter((c) => c.status === "new");

if (!shown.length) {
  console.log(all ? "Queue is empty." : "Nothing awaiting review. (Use --all to see triaged ones.)");
  process.exit(0);
}

console.log(`${shown.length} candidate studio(s)${all ? "" : " awaiting review"}:\n`);
for (const c of shown) {
  const tag = c.status === "new" ? "" : `  [${c.status}]`;
  console.log(`• ${c.name}${tag}`);
  console.log(`    ${c.url}`);
  console.log(`    matched "${c.keyword}" · first seen ${c.firstSeen} · seen on ${c.sources.length} list(s)`);
}
console.log(`\nTriage: verify pricing, then hand-add good ones to data/studios.json.`);
console.log(`Mark done by editing the candidate's "status" to "added" or "rejected".`);
