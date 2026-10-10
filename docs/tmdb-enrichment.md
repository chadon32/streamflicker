# TMDB-verified facts

## Why this exists

Most of the bundled catalog (1,782 of 1,799 titles) has placeholder ratings and runtimes: about 90% share one runtime and 92% are "R". The app therefore ignores those values, which keeps the Family night and Quick watch filters nearly empty and leaves most cards without a runtime. `npm run enrich:catalog` looks each of those titles up on TMDB and keeps only what it can prove.

## What it fetches, and what uses it

| Field | Used for |
| --- | --- |
| US certification and runtime | Card labels, the PG-13 and under, Quick watch and Date night filters, the runtime bands, and which shortcut chips appear (a chip needs at least 12 results) |
| Vote count | "Featured" ordering (reviewed titles first, then the best-known, then everything else), and the planner's "well known" bar |
| YouTube trailer key | Only for a title that has no usable trailer today; an existing trailer is never replaced. When the trailer in use is TMDB's own, the title is marked `trailerVerified`, which the planner requires |
| TMDB id, how the title was identified, date read | Auditing, and the expiry rule below |

Not fetched: where to watch (it changes weekly, and the app already fetches it live when someone asks), and directors, cast, genres and descriptions (replacing those reclassifies the whole catalog and needs its own design).

**Checked is not reviewed.** The 17 hand-picked titles are "reviewed": they feed the hero, the rows, the movie night planner and sharing a single title. A title matched to TMDB is "checked": it shows real facts and works in browsing, search and filters. The trust gate rejects it for the hero, the rows and sharing a single title. The planner may suggest the well-known ones, labeled, after the reviewed titles (next section).

## The movie night planner

The web planner's pool is every reviewed title, plus each checked title that clears all of these:

- at least `PLANNER_MIN_VOTES` TMDB votes (`src/services/movieNight.ts`; it starts at 1,000 and is provisional, so set it from the real vote distribution once the enrichment has run);
- a trailer TMDB confirmed (`trailerVerified`), not just the bundled catalog's own id;
- a synopsis of at least 80 characters, at least one genre other than "Other", and a poster.

Reviewed titles always rank first, so adding checked titles can only append picks after them: a choice that already works gives the same picks as before, and a choice that used to dead-end (Family night, Date night, short films) gains picks. Checked titles rank by vote count; their old `score` field is a placeholder and never counts. A checked title counts for Family night only when rated G or PG.

Each checked pick carries a visible "Checked on TMDB" label, the footer and empty-state wording say where picks come from, and a copied plan marks them "(checked on TMDB)" with a line explaining the mark. Opening the planner starts loading the full catalog, since the checked titles live there.

The iPhone app has its own native planner with its own 17-title catalog; none of this reaches it.

## How a title is identified

A TMDB search result is accepted only with proof: the same poster path as the catalog's (a poster path belongs to one film), or exactly one result with an equal title and release year. Ambiguity is never guessed. The film must also be released, have a runtime between 40 and 400 minutes and a recognizable US certification (the theatrical release counts first; `NR` and unrated become `NOT RATED`). A title that fails any of this simply stays unverified.

## Run it

1. Get a free token: themoviedb.org, then Settings, API, "API Read Access Token".
2. Add it to your local `.env`, which git ignores: `TMDB_API_READ_ACCESS_TOKEN=<token>`. The Vercel function reads the same variable name from Vercel's settings. TMDB shows two values on that page: the long "API Read Access Token" goes here, and the short 32-character "API Key" would go in `TMDB_API_KEY` instead (a `401` usually means one was pasted into the wrong variable).
3. Run, checking at each step:

```bash
npm run enrich:catalog -- --dry-run
npm run enrich:catalog -- --limit 25
npm run enrich:catalog
npm run generate:catalog && npm test
```

The dry run makes no requests and writes nothing. The full run is about 3,600 requests at 20 per second (TMDB's limit is around 40), so a few minutes. It saves progress every 100 titles: if it stops, run the same command again and it continues. Other flags: `--ids a,b,c` (only these titles), `--refresh` (re-check titles that already have fresh facts), `--rps N`, `--concurrency N`.

The token is never printed and never written anywhere except your `.env`.

## Reading the summary

- **matched** is split into poster proof and title-and-year only. Open a few of the title-and-year links the summary prints and confirm the TMDB page is the film you expect.
- **no match** and **rejected** titles stay unverified; the reasons (`not-released`, `no-runtime`, `no-certification`, `runtime-out-of-range`, `year-mismatch`) are counted.
- **errors** are transient (network, 5xx). Run the command again to retry only those.
- `401` stops the run at once: the token is wrong or has been revoked.

## Keeping it fresh

TMDB's terms (as the page read on October 1, 2026; read it yourself) do not allow caching its data for more than six months. Every fact carries the date it was read, and `npm test` fails once any fact is older than 150 days, leaving a month to act. A weekly GitHub Actions run (`.github/workflows/ci.yml`) turns that into an email even when nobody pushes. To refresh:

```bash
npm run enrich:catalog -- --refresh
npm run generate:catalog && npm test
```

A title that cannot be verified again on refresh loses its fact rather than keeping an out-of-date one.

The 17 hand-reviewed titles follow the same six-month rule. Their metadata expires 150 days after `CATALOG_CHECKED_AT` (`src/services/catalogQuality.ts`), and the same tests start failing at 120 days. To refresh them, re-check each title's US certification and runtime on its TMDB page, correct any that changed (in `VALIDATED_CATALOG_ENTRIES` and the matching rows in `src/data/movies.ts`), set `CATALOG_CHECKED_AT` to the day you checked, then run `npm run generate:catalog && node scripts/validate-catalog.mjs --write && npm test`. If nobody does, the reviewed rows, hero and planner picks hide themselves rather than show stale data.

The same terms require the TMDB logo and notice, and say that deriving revenue (ads, affiliate links) needs a separate written agreement with TMDB.

## Files

| File | Purpose |
| --- | --- |
| `src/services/tmdbFacts.ts` | Every rule: matching, certification, trailer, validation, expiry, applying facts to records |
| `src/services/movieNight.ts` | The planner's pool, ranking and Family rule (`isPlannerEligible`, `buildPlannerPool`) |
| `scripts/tmdb-client.mjs` | HTTP client: request spacing, retries, no credential in any error |
| `scripts/lib/enrich.mjs` | Work selection, orchestration and rendering of the data file |
| `scripts/enrich-catalog.mjs` | The command |
| `src/data/tmdbFacts.ts` | Generated; read only by the catalog generator, never shipped to browsers |
| `scripts/generate-catalog.mjs` | Applies the facts after the trust gate (`STREAMFLICKER_TMDB_FACTS_PATH` and `STREAMFLICKER_CATALOG_OUTPUT_DIR` let tests point it elsewhere) |
| `scripts/test-tmdb-enrichment.mjs` | Tests for the client, the orchestration and the command (no network) |

Design records: `docs/superpowers/specs/2026-10-01-tmdb-verified-facts-design.md` and `docs/superpowers/specs/2026-10-01-planner-checked-titles-design.md`.
