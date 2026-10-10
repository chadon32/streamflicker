# TMDB-verified facts, popularity and trailers — design

Approved scope: option B (facts, popularity, missing trailers). Date: October 1, 2026.

## Goal

Make the browse grid, filters and shortcut chips work on more than the 17 hand-reviewed titles by replacing placeholder rating and runtime with values read from TMDB, recording TMDB vote counts so "Featured" can lead with well-known films, and filling a trailer only where a title has none. One resumable command does the fetch; everything else is a build-time transformation.

## What the data showed

- Only the 17 reviewed records carry a TMDB id (`sourceId`). The other 1,782 carry TMDB poster paths, a title and a year.
- 90% of bundled records share one placeholder runtime and 92% are "R". 971 have no usable trailer, 1,776 have no real director or cast, 44% are classified "Other", and most of the long tail is obscure, so "Featured" falls back to A to Z.
- Locally no TMDB credential is set (`TMDB_API_READ_ACCESS_TOKEN`, `TMDB_API_KEY`, `VITE_TMDB_API_KEY` are all unset). `.env` is git-ignored.
- TMDB's terms (read October 1, 2026): cached TMDB data may not be kept longer than 6 months; revenue use needs a separate written agreement; the logo and notice are required. Rate limit is "in the 40 requests per second range"; `429` signals throttling.

## Scope

In: certification (US), runtime, TMDB id, vote count, a YouTube trailer key; the `tmdb-checked` record source; popularity ordering; copy that distinguishes "reviewed" from "checked"; an expiry alarm; a runbook.

Out (deliberately): where-to-watch (changes weekly; the app already fetches it live), directors, cast, genres, descriptions (reclassifies the catalog, needs its own design), extending the planner or hero to checked titles (changes what "reviewed" means and affects the iOS app), runtime hiding of expired facts (the data would still be cached in the bundle, so only refreshing complies).

## Units

1. `src/services/tmdbFacts.ts` is pure and import-free (the test loader requires it). It owns every rule: `normalizeTitle`, `matchTmdbMovie`, `pickUsCertification`, `pickTrailerKey`, `formatRuntime`, `buildFact`, `isFactFresh`, `applyTmdbFacts`.
2. `scripts/tmdb-client.mjs` is the HTTP layer with an injectable `fetch` and `sleep`: bearer-token auth (api_key fallback), request spacing (default 20 per second), retry with backoff on `429`, 5xx and network errors, honoring `Retry-After`, a fatal error on `401`, and error messages that never contain a credential.
3. `scripts/lib/enrich.mjs` is the orchestration with an injected client: select the work list, search, match, fetch details, build facts, tally outcomes, and render the facts module deterministically.
4. `scripts/enrich-catalog.mjs` is the CLI: flags `--dry-run`, `--limit`, `--ids`, `--refresh`, `--rps`, `--concurrency`; loads `.env` with `process.loadEnvFile`; writes `src/data/tmdbFacts.ts` atomically every 100 titles so an interrupted run resumes; prints a summary and a sample of weaker matches to eyeball.
5. `src/data/tmdbFacts.ts` is generated, committed, and never shipped to browsers (only the generator reads it).
6. `scripts/generate-catalog.mjs` applies the facts after the trust gate has run, so a checked record can never become reviewed. It adds a trailing `voteCount` column to the packed rows.
7. App: `Movie.recordSource` gains `'tmdb-checked'` and `Movie.voteCount`; `hasVerifiedRatingAndRuntime` accepts the new source; `sortMovies('featured')` becomes reviewed, then vote count, then the trending flag, then A to Z; copy says "reviewed" for the hand-picked set and "checked against TMDB" for the rest.

## Data

`src/data/tmdbFacts.ts` exports `TMDB_FACTS: Record<id, [tmdbId, certification, runtimeMinutes, voteCount, trailerKey, proof, checkedAt]>` where `proof` is `'poster'` or `'title-year'` and `checkedAt` is an ISO date. Keys are sorted so reruns produce small diffs.

## Rules

Identification: accept a TMDB search result only if its poster path equals the record's (and its release year is within one year of the record's), or if exactly one result has an equal normalized title and an equal release year. Anything else stays unverified; ambiguity is never guessed.

Acceptance: the movie details must show status Released, a runtime between 40 and 400 minutes, and a recognized US certification (theatrical release first, then the other types, premiere last; `NR` and unrated map to `NOT RATED`).

Trailer: only an official YouTube `Trailer` with an 11-character key; English first, then a name containing "Official Trailer", then earliest published. It fills a title only when the title has no usable trailer; it never replaces one.

Trust: `validateCatalogRecord` already rejects any record whose source is not `bundled-validated`, so checked records stay out of the hero, rails, planner and sharing.

## Compliance and expiry

Every fact carries `checkedAt`. `test-catalog-quality.mjs` fails when any fact is older than 150 days, leaving a month before TMDB's 6-month limit. A weekly scheduled CI run turns that into an email. Refresh with `npm run enrich:catalog -- --refresh`.

## Errors

`401`: stop immediately with a clear message. `429` and 5xx: back off and retry up to five times, then count the title as an error and continue. A title with no match, an ambiguous match, or a failed acceptance check is reported with its reason and left unverified. The credential is never printed.

## Tests

Unit tests for every pure function, including the awkward cases (premiere certification differing from theatrical, two candidates with the same title and year, poster changed since the catalog was built, TMDB returning runtime 0). Fake-fetch tests for retry, backoff, `401`, request spacing and credential redaction. Orchestration tests for resume and `--limit`. A determinism test for the rendered facts module. Consistency tests over the committed facts and the generated catalog. Generation stays date-deterministic; only the expiry alarm reads the clock.

## Rollout

Inert until the facts file has entries: with `TMDB_FACTS = {}` no record changes source. Add a token to `.env`, run `npm run enrich:catalog -- --limit 25`, inspect, run the full fetch, `npm run generate:catalog`, `npm test`, then check the grid, chips, ordering and trailers in a browser.
