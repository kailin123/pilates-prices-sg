# Pilates Prices SG

Compare drop-in, class packs, memberships and current promotions across Singapore
reformer pilates studios — in one place. Built with Next.js 16 + Tailwind.

## Run it

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
```

## How the data works

The site is driven by a single hand-curated file: **`data/studios.json`**. This is the
source of truth. Types live in `lib/types.ts`.

Each studio has `plans` (drop-in / pack / unlimited / intro), `promos`, a `sourceUrl`,
a `lastChecked` date, and a `confidence` badge:

- **verified** — read from the studio's own site
- **estimate** — mixed-discipline or derived pricing; double-check
- **stale** — known out of date, needs re-verification

Per-class prices and "cheapest to try" are computed in `lib/types.ts`, not stored.

### Adding a studio

Append an object to `data/studios.json`. Only `id`, `name`, `areas`, `disciplines`,
`website`, `plans`, `promos`, `lastChecked`, `sourceUrl`, and `confidence` are required.

### Studio logos

Logos live in `public/logos/<studio-id>.<ext>` and are referenced by the optional
`logo` field on each studio. Refresh them with:

```bash
python3 scripts/fetch-logos.py    # grabs apple-touch-icon / favicon per domain
```

Studios without a fetchable logo (currently Upside Motion, STRONG Pilates) fall back
to a coloured monogram avatar in the UI — no action needed.

## Look & feel

Warm, editorial "boutique studio" palette defined as Tailwind theme tokens in
`app/globals.css` (`cream`, `oat`, `surface`, `ink`, `muted`, `line`, `sage`, `clay`,
`gold`, `rose`). Display font is **Fraunces** (serif), body is **Manrope**, both loaded
via `next/font` in `app/layout.tsx`. It's a committed light theme. To retint the site,
edit the `@theme` block — every component reads these tokens.

### Adding a social-media promo

Instagram/Facebook promos can't be auto-scraped reliably or within ToS (the official
Graph API only exposes accounts you own/that authorize you). So social promos come in two
ways:

1. **Public promo pages / Linktree** — many studios link a `/promotions` page or Linktree
   from their bio. Those are normal web pages: add a scraper adapter in `scraper/adapters.ts`.
2. **IG-only promos** — use the intake helper instead of hand-editing JSON:

   ```bash
   npm run add-promo -- --list                       # see studio ids
   npm run add-promo -- --studio sg-pilates \
     --label "10-class National Day pack" --price 199 --classes 10 \
     --source instagram --url https://instagram.com/p/XXXX \
     --expires 2026-08-31 --first-timer --as-pack --dry-run
   ```

   `--as-pack` also adds a matching pack plan so "from / class" updates. `--dry-run` previews.
   Promos render a small source tag (e.g. `MANUAL`, `INSTAGRAM`) on the card. Expired promos
   auto-hide. The scraper never overwrites non-`website` promos.

   Easiest of all: paste an Instagram post URL or screenshot to Claude and ask it to add the
   promo — it reads the details and runs the helper for you.

3. **Public submission form** — visitors can submit a promo link via the "Submit a promo"
   button on the site. Submissions POST to `app/api/submit-promo/route.ts`, which validates
   the link (and screens a honeypot field) and appends to a **review queue** at
   `data/submissions.json`. Nothing goes live automatically — review the queue, then publish
   good tips with `npm run add-promo`.

   **Backend:** by default the form posts to a **Google Form** (responses → a Google Sheet you
   own), configured via `NEXT_PUBLIC_GFORM_*` in `.env.local` — see
   [docs/google-form-setup.md](docs/google-form-setup.md). This posts straight to Google, so it
   works on static/serverless hosting with **no server needed**. If those env vars are unset,
   the form falls back to the local `/api/submit-promo` route (writes to `data/submissions.json`),
   which is handy in dev but won't persist on read-only serverless.

### Automated review with Claude

Instead of eyeballing the queue, let Claude vet submissions and publish the good ones:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run review               # DRY RUN — prints each verdict, writes nothing
npm run review -- --apply    # publishes high-confidence approvals; logs the rest
```

For each submission the reviewer (`scripts/review-submissions.mjs`) fetches the linked page when
it can (social links aren't fetchable), asks Claude for a structured verdict, and
**auto-publishes only** when the verdict is `approve`, confidence is `high`, the price is in a sane
range, and it matches a known studio. Everything else goes to `data/review-log.json`. Processed
tips are tracked in `data/reviewed.json` so they aren't re-reviewed.

- **Source:** reads the local `data/submissions.json` queue by default. To read Google Form
  responses, publish the linked Sheet (File → Share → **Publish to web → CSV**) and set
  `SUBMISSIONS_CSV_URL` to that URL.
- **Model:** defaults to `claude-opus-5`; set `REVIEW_MODEL=claude-haiku-4-5` for ~5× lower cost on
  this high-volume vetting task.
- **Automate it:** run `npm run review -- --apply` on a schedule (e.g. a daily GitHub Action with
  `ANTHROPIC_API_KEY` as a secret) and commit the updated `data/studios.json`.

## The scraper

`npm run scrape` fetches each studio's public pricing page (adapters in
`scraper/adapters.ts`) and reports detected prices.

```bash
npm run scrape                        # DRY RUN — reports changes, writes nothing
npm run scrape -- --apply             # apply changes to data/studios.json
npm run scrape -- --apply kx-pilates  # apply, only this studio
```

Safety guarantees (learned the hard way):

- **Dry run by default.** Nothing is written unless you pass `--apply`.
- **Sanity ranges.** A parsed price is only accepted if it's plausible for its plan type
  (e.g. a drop-in must be $25–$120), so a stray "$20" in a nav bar is ignored.
- **Per-type merge.** Only plan types the adapter confidently finds are replaced; a
  curated drop-in price the adapter missed is left intact.
- **Curated promos are never overwritten.**

### Reality check

Many SG studio sites are JavaScript-rendered or hide prices behind "enquire" forms, so a
plain `fetch()` often can't see them (`core-reformery` and `kx-pilates` currently parse
nothing live — their prices come from curation). Treat the scraper as an assistant for
spotting changes, not an oracle. To scrape JS-heavy sites later, swap `fetch` for a
headless browser (Playwright) in an adapter.

## Deploy

Static-friendly Next app — deploys to Vercel/Netlify/Cloudflare Pages as-is.

## Scheduled refresh (GitHub Action)

`.github/workflows/refresh-prices.yml` runs daily (04:00 SGT) and on manual dispatch. It
scrapes studio sites, has Claude review new promo submissions, and commits any changes back
to `data/studios.json` (and `data/reviewed.json`, the dedupe state). To enable it:

1. Push the repo to GitHub.
2. **Settings → Secrets and variables → Actions**, add:
   - Secret **`ANTHROPIC_API_KEY`** — your Claude API key (the review step is skipped if absent).
   - Secret **`SUBMISSIONS_CSV_URL`** — the Google Sheet "Publish to web → CSV" URL (so CI reads
     public form responses, not just the local queue).
   - Variable **`REVIEW_MODEL`** *(optional)* — e.g. `claude-haiku-4-5` to cut cost.
3. The workflow has `contents: write` permission and pushes commits via the built-in
   `GITHUB_TOKEN` — no extra setup. Trigger a first run from the **Actions** tab.

Notes: `data/reviewed.json` is committed on purpose (dedupe state — no PII), so CI never
re-reviews or double-posts a tip. `data/review-log.json` (contains submitter emails) and
`.env.local` are git-ignored and never leave your machine. Change the cadence via the `cron`
line in the workflow.
