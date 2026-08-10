---
description: Review pending crowd-sourced pilates promo submissions and publish the good ones
---

You are doing the weekly review of crowd-sourced promo submissions for this repo
(pilates-prices-sg). Use your own judgment — do NOT call the paid Claude API / the
`review -- --apply` path. Work through these steps:

1. **Gather pending tips.** Run `npm run review:prep`. It prints each unreviewed submission
   with the linked page's text (when fetchable), the known-studio roster, valid plan types,
   and sane SGD price ranges.
   - The tips come from `data/submissions.json` by default. If the user keeps submissions in a
     Google Form, ask for (or use) the Sheet's "Publish to web → CSV" URL and run with
     `SUBMISSIONS_CSV_URL=<url> npm run review:prep`.
   - If there are no pending tips, say so and stop.

2. **Judge each tip.** Approve only a genuine pilates class promo for a studio in the roster.
   Reject spam, unrelated/affiliate links, or studios not listed. Be skeptical of a price you
   can't see in the fetched page text or the offer text — flag it as unverified rather than
   inventing one. Pick the plan type (drop-in | intro | pack | unlimited) and confirm the price
   is within the sane range for that type.

3. **Publish the approved ones** with the existing helper (one call each):
   ```
   npm run add-promo -- --studio <id> --label "<short label>" --price <sgd> \
     [--original <up>] [--classes <n>] [--first-timer] [--expires YYYY-MM-DD] \
     --source <instagram|facebook|manual|website> --url "<link>" [--as-pack]
   ```
   - Choose `--source` from the link's host (instagram.com → instagram, a studio site → website,
     else manual). Use `--as-pack` only for multi-class bundles where you know the class count.
   - Skip anything you couldn't verify; don't publish guesses.

4. **Close the batch.** Run `npm run review:done` so handled tips don't reappear next week.

5. **Report & offer to ship.** Summarize what you approved, rejected, and skipped-as-unverified.
   Then show the `data/studios.json` diff and ask before committing/pushing (e.g.
   `git add -A && git commit -m "Add reviewed promos" && git push`).

Keep the site trustworthy: it is better to skip a tip you can't confirm than to publish a wrong
price.
