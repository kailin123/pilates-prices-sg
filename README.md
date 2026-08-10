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

### Weekly review with Claude (no API key)

The recommended flow reviews tips using your **Claude subscription** — no paid API. Once a week,
open the repo in **Claude Code** (or Claude Desktop with filesystem access) and ask it to review
new submissions. Under the hood:

```bash
npm run review:prep      # prints pending tips + fetched page text + the studio roster (no API)
# → Claude judges each one and publishes the good ones:
npm run add-promo -- --studio <id> --label "..." --price 199 --classes 10 --source instagram --url <link>
npm run review:done      # marks the batch reviewed so it won't reappear (writes data/reviewed.json)
```

`review:prep` reads the local `data/submissions.json` queue by default; to pull public Google Form
responses, publish the linked Sheet (File → Share → **Publish to web → CSV**) and set
`SUBMISSIONS_CSV_URL` before running it. `data/reviewed.json` tracks handled tips;
`data/review-log.json` (kept out of git) holds anything you want to note.

**Fully automated alternative (paid):** `scripts/review-submissions.mjs` also has an API mode
(`npm run review -- --apply`) that calls the Claude API to auto-vet and publish. It needs an
`ANTHROPIC_API_KEY` and bills per submission — only worth it if you don't want a human in the loop.
Set `REVIEW_MODEL=claude-haiku-4-5` to minimise cost.

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

## Discovering new studios

`npm run discover` crawls a handful of stable "best pilates studios in Singapore"
listing pages, pulls out links that look like studio sites, and diffs them against
what we already track. Anything new lands in a **review queue** — it does *not* go
live automatically.

```bash
npm run discover              # DRY RUN — report candidates, write nothing
npm run discover -- --apply   # append new finds to data/candidates.json
npm run candidates            # list what's awaiting review
npm run candidates -- --all   # include already-triaged ones
```

Why a queue and not auto-publish? Same reason the scraper is dry-run by default:
most SG studio sites are JS-gated, so auto-scraping a stranger's prices yields junk.
Discovery only says *"here's a studio worth a look."* You verify pricing, hand-add
the good ones to `data/studios.json` (see [Adding a studio](#adding-a-studio)), then
set that candidate's `status` to `"added"` or `"rejected"`. The daily GitHub Action
runs `discover --apply` too, so the queue fills itself between reviews.

Tune it in `scraper/discover.ts`: `SEEDS` (pages to crawl), `IGNORE_HOSTS`
(non-studios / already-evaluated), and the keyword/foreign-TLD filters.

## Deploy

Static-friendly Next app — deploys to Vercel/Netlify/Cloudflare Pages as-is.

## Scheduled refresh (GitHub Action)

`.github/workflows/refresh-prices.yml` runs daily (04:00 SGT) and on manual dispatch. It scrapes
studio websites and commits any changes back to `data/studios.json`, and runs `discover` to append
newly-found studios to the `data/candidates.json` review queue (never published automatically —
see [Discovering new studios](#discovering-new-studios)). **No secrets or API key are
required** — it uses the built-in `GITHUB_TOKEN` (`contents: write`) to push. Just push the repo to
GitHub and, optionally, trigger a first run from the **Actions** tab. Change the cadence via the
`cron` line.

Promo submissions are **not** reviewed in CI — that's the weekly Claude review above (uses your
subscription, not the paid API). `data/review-log.json` (submitter emails) and `.env.local` are
git-ignored and never leave your machine.
