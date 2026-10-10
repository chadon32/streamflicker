#!/usr/bin/env node
/*
 * Reads certification, runtime, vote count and a trailer for each bundled title from TMDB and writes them to
 * src/data/tmdbFacts.ts, which the catalog generator turns into "checked" records. See docs/tmdb-enrichment.md.
 */
import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { enrichRecords, renderFactsModule, selectWork } from './lib/enrich.mjs';
import { importTypeScriptModule, repositoryRoot } from './lib/load-ts.mjs';
import { createTmdbClient } from './tmdb-client.mjs';

const MAX_REQUESTS_PER_SECOND = 40;
const POSTER_PREFIX = 'https://image.tmdb.org/t/p/w500/';
const factsPath = resolve(repositoryRoot, 'src/data/tmdbFacts.ts');
const number = (value) => value.toLocaleString('en-US');

const usage = (maxAgeDays) => `Usage: npm run enrich:catalog -- [options]

  --dry-run         Show what would be fetched; make no requests and write nothing
  --limit N         Fetch at most N titles this run
  --ids a,b,c       Only these catalog ids
  --refresh         Re-check titles that already have fresh facts
  --rps N           Requests per second (default 20; TMDB's limit is around ${MAX_REQUESTS_PER_SECOND})
  --concurrency N   Titles in flight at once (default 6)
  --help            Show this message

Set TMDB_API_READ_ACCESS_TOKEN in .env first (a free token from themoviedb.org/settings/api).
TMDB limits caching to six months, so facts older than ${maxAgeDays} days must be refreshed with --refresh.`;

function positiveInteger(value, flag) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${flag} needs a whole number greater than 0 (got "${value}")`);
  return parsed;
}

async function readSourceMovies() {
  const source = (await readFile(resolve(repositoryRoot, 'src/data/movies.ts'), 'utf8')).replace(/\r\n/g, '\n');
  const match = source.match(/export const SAMPLE_MOVIES: Movie\[] = (\[[\s\S]*?\]);\s*export const movies/);
  if (!match) throw new Error('Could not parse src/data/movies.ts');
  return JSON.parse(match[1]);
}

async function readExistingFacts() {
  try {
    return (await importTypeScriptModule('src/data/tmdbFacts.ts')).TMDB_FACTS;
  } catch (error) {
    if (error?.code === 'ENOENT') return {};
    throw error;
  }
}

async function saveFacts(facts, maxAgeDays) {
  const temporary = `${factsPath}.tmp`;
  await writeFile(temporary, renderFactsModule(facts, { maxAgeDays }));
  await rename(temporary, factsPath);
}

function printSummary(summary) {
  const reasons = Object.entries(summary.rejectedReasons).map(([reason, count]) => `${reason} ${count}`).join(', ');
  const lines = [
    '',
    `Checked ${number(summary.attempted)} titles:`,
    `  matched    ${number(summary.matched)}  (poster proof ${number(summary.byPoster)}, title and year ${number(summary.byTitleYear)})`,
    `  no match   ${number(summary.unmatched)}`,
    `  rejected   ${number(summary.rejected)}${reasons ? `  (${reasons})` : ''}`,
    `  errors     ${number(summary.errors)}${summary.errors > 0 ? '  (run the same command again to retry them)' : ''}`,
  ];
  if (summary.weakMatches.length > 0) {
    lines.push('', 'Matched by title and year only (no poster proof). Spot-check a few against the TMDB page:');
    for (const { id, tmdbId } of summary.weakMatches.slice(0, 15)) lines.push(`  ${id}  https://www.themoviedb.org/movie/${tmdbId}`);
    if (summary.weakMatches.length > 15) lines.push(`  ...and ${number(summary.weakMatches.length - 15)} more`);
  }
  console.log(lines.join('\n'));
}

async function main() {
  const rules = await importTypeScriptModule('src/services/tmdbFacts.ts');
  const maxAgeDays = rules.TMDB_FACT_MAX_AGE_DAYS;
  let values;
  try {
    ({ values } = parseArgs({
      options: {
        'dry-run': { type: 'boolean', default: false },
        refresh: { type: 'boolean', default: false },
        limit: { type: 'string' },
        ids: { type: 'string' },
        rps: { type: 'string', default: '20' },
        concurrency: { type: 'string', default: '6' },
        help: { type: 'boolean', default: false },
      },
    }));
  } catch (error) {
    console.error(`${error.message}\n\n${usage(maxAgeDays)}`);
    process.exitCode = 1;
    return;
  }
  if (values.help) {
    console.log(usage(maxAgeDays));
    return;
  }

  const limit = values.limit === undefined ? Number.POSITIVE_INFINITY : positiveInteger(values.limit, '--limit');
  const concurrency = positiveInteger(values.concurrency, '--concurrency');
  const requestsPerSecond = positiveInteger(values.rps, '--rps');
  if (requestsPerSecond > MAX_REQUESTS_PER_SECOND) throw new Error(`--rps above ${MAX_REQUESTS_PER_SECOND} would exceed TMDB's rate limit`);

  // The credential comes from the environment or the git-ignored .env, and is never printed.
  const envFile = process.env.STREAMFLICKER_ENV_FILE || resolve(repositoryRoot, '.env');
  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(envFile);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  const token = (process.env.TMDB_API_READ_ACCESS_TOKEN ?? '').trim();
  const apiKey = (process.env.TMDB_API_KEY ?? '').trim();
  const hasCredential = Boolean(token || apiKey);
  if (!hasCredential && !values['dry-run']) {
    throw new Error('No TMDB credential found. Add TMDB_API_READ_ACCESS_TOKEN=<your read access token> to .env (get a free one at themoviedb.org/settings/api), then run this again.');
  }

  const movies = await readSourceMovies();
  const { VALIDATED_CATALOG_ENTRIES } = await importTypeScriptModule('src/services/catalogQuality.ts');
  const reviewedIds = new Set(Object.keys(VALIDATED_CATALOG_ENTRIES));
  // Reviewed titles already carry hand-checked facts, so only the rest are looked up.
  const records = movies
    .filter(({ id }) => !reviewedIds.has(id))
    .map((movie) => ({ id: movie.id, title: movie.title, year: movie.year, posterPath: movie.posterUrl.replace(POSTER_PREFIX, '') }));

  let onlyIds = null;
  if (values.ids) {
    onlyIds = new Set(values.ids.split(',').map((id) => id.trim()).filter(Boolean));
    const fetchable = new Set(records.map(({ id }) => id));
    const unknown = [...onlyIds].filter((id) => !fetchable.has(id));
    if (unknown.length > 0) console.warn(`Not in the catalog (ignored): ${unknown.join(', ')}`);
  }

  const now = new Date();
  const existingFacts = await readExistingFacts();
  const { work, fresh } = selectWork({ records, existingFacts, rules, now, refresh: values.refresh, limit, onlyIds });
  const requests = Math.ceil((work.length * 2) / 100) * 100;
  const minutes = Math.max(1, Math.ceil(requests / requestsPerSecond / 60));
  console.log([
    `Catalog titles:               ${number(movies.length).padStart(8)}`,
    `Reviewed by hand (skipped):   ${String(reviewedIds.size).padStart(8)}`,
    `Already checked and fresh:    ${number(fresh).padStart(8)}`,
    `To fetch this run:            ${number(work.length).padStart(8)}`,
    work.length > 0 ? `About ${number(requests)} requests, roughly ${minutes} minute${minutes === 1 ? '' : 's'} at ${requestsPerSecond} requests per second.` : 'Nothing to fetch.',
    `TMDB credential: ${hasCredential ? 'found' : 'not set (a dry run does not need one)'}`,
  ].join('\n'));
  if (values['dry-run']) {
    console.log('Dry run: no requests were made and nothing was written.');
    return;
  }
  if (work.length === 0) return;

  const client = createTmdbClient({ token, apiKey, requestsPerSecond });
  const today = now.toISOString().slice(0, 10);
  const result = await enrichRecords({
    records,
    existingFacts,
    client,
    rules,
    today,
    now,
    refresh: values.refresh,
    limit,
    concurrency,
    onlyIds,
    onBatch: async ({ facts, completed, total }) => {
      await saveFacts(facts, maxAgeDays);
      console.log(`  ${number(completed)} of ${number(total)} titles checked...`);
    },
  });
  await saveFacts(result.facts, maxAgeDays);
  console.log(`\nWrote ${number(Object.keys(result.facts).length)} facts to src/data/tmdbFacts.ts.`);
  printSummary(result.summary);
  console.log('\nNext: npm run generate:catalog && npm test');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
