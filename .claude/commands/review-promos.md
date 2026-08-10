---
description: Review new pilates promo submissions and publish the good ones
---

Do the weekly review of crowd-sourced promo submissions for this repo (pilates-prices-sg),
using your own judgment. This runs locally on the maintainer's machine (Claude subscription,
not the paid API), and you CAN push to GitHub from here.

1. **Sync latest.** Run `git pull` so you have any overnight price refreshes and the current
   `data/reviewed.json` (dedupe state).

2. **Gather pending tips.** Run:
   ```
   SUBMISSIONS_CSV_URL="https://docs.google.com/spreadsheets/d/1tTt-nzMHXByZj_3tJdwi7w9HOr5PygNMlhJA3Pa621A/export?format=csv" npm run review:prep
   ```
   It fetches submissions straight from the Google Form responses (no email column), and prints
   each unreviewed tip with the linked page's text (when fetchable), the known-studio roster,
   valid plan types (drop-in | intro | pack | unlimited), and sane SGD price ranges. If there are
   no new tips, say so and stop.

3. **Judge each tip.** Approve only a genuine pilates class promo for a studio in the roster.
   Reject spam, unrelated/affiliate links, or studios not listed. If you can't confirm the price
   from the offer text or fetched page, SKIP it rather than guessing. Also skip if
   `data/studios.json` already has a promo with that same link.

4. **Publish the approved ones** (one call each):
   ```
   npm run add-promo -- --studio <id> --label "<short label>" --price <sgd> \
     [--original <up>] [--classes <n>] [--first-timer] [--expires YYYY-MM-DD] \
     --source <instagram|facebook|manual|website> --url "<link>" [--as-pack]
   ```
   Pick `--source` from the link host; use `--as-pack` only for a multi-class bundle with a known count.

5. **Close the batch.** Run (same URL as step 2):
   ```
   SUBMISSIONS_CSV_URL="https://docs.google.com/spreadsheets/d/1tTt-nzMHXByZj_3tJdwi7w9HOr5PygNMlhJA3Pa621A/export?format=csv" npm run review:done
   ```

6. **Ship it.** Show the `data/studios.json` diff and a one-line summary (approved / rejected /
   skipped). Then commit and push — this also triggers a Vercel redeploy:
   ```
   git add -A && git commit -m "Add reviewed promos" && git push
   ```

Keep the site trustworthy: it's better to skip a tip you can't confirm than to publish a wrong price.
