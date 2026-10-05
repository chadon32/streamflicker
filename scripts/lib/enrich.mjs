/*
 * Turns catalog records into TMDB facts. The client and the rules are injected, so this module has no network, file
 * or TypeScript dependency of its own and can be tested with fakes.
 */

export function summarizeOutcomes(outcomes) {
  const summary = {
    attempted: outcomes.length,
    matched: 0,
    byPoster: 0,
    byTitleYear: 0,
    unmatched: 0,
    rejected: 0,
    rejectedReasons: {},
    errors: 0,
    weakMatches: [],
  };
  for (const outcome of outcomes) {
    if (outcome.outcome === 'matched') {
      summary.matched += 1;
      if (outcome.proof === 'poster') {
        summary.byPoster += 1;
      } else {
        summary.byTitleYear += 1;
        summary.weakMatches.push({ id: outcome.id, tmdbId: outcome.tmdbId });
      }
    } else if (outcome.outcome === 'unmatched') {
      summary.unmatched += 1;
    } else if (outcome.outcome === 'rejected') {
      summary.rejected += 1;
      summary.rejectedReasons[outcome.detail] = (summary.rejectedReasons[outcome.detail] ?? 0) + 1;
    } else {
      summary.errors += 1;
    }
  }
  summary.weakMatches.sort((left, right) => left.id.localeCompare(right.id));
  return summary;
}

/**
 * Which records a run will fetch, and the facts it starts from. Facts for titles that are no longer fetched (removed
 * from the catalog, or reviewed by hand) are not kept. `onlyIds` narrows the work but never the pruning, so asking
 * for a few titles cannot drop the facts of the others.
 */
export function selectWork({ records, existingFacts, rules, now, refresh = false, limit = Number.POSITIVE_INFINITY, onlyIds = null }) {
  const known = new Set(records.map(({ id }) => id));
  const facts = Object.fromEntries(Object.entries(existingFacts).filter(([id]) => known.has(id)));
  const isFresh = (record) => Object.hasOwn(facts, record.id) && rules.isFactFresh(facts[record.id][6], now);
  const work = records
    .filter((record) => (!onlyIds || onlyIds.has(record.id)) && (refresh || !isFresh(record)))
    .slice(0, limit);
  return { facts, work, fresh: records.filter(isFresh).length };
}

/**
 * Look each record up on TMDB and keep only what can be proven. A title ends the run with a fact, or with no fact:
 * a title that cannot be verified again (including on refresh) loses its old fact, except after a transient error,
 * which keeps it so a rerun can try again. A rejected credential stops the whole run.
 */
export async function enrichRecords({
  records,
  existingFacts,
  client,
  rules,
  today,
  now = new Date(),
  refresh = false,
  limit = Number.POSITIVE_INFINITY,
  concurrency = 6,
  batchSize = 100,
  onlyIds = null,
  onBatch = async () => {},
}) {
  const { matchTmdbMovie, buildFact } = rules;
  const { facts, work } = selectWork({ records, existingFacts, rules, now, refresh, limit, onlyIds });
  const outcomes = [];
  let nextIndex = 0;
  let fatal = null;

  async function inspect(record) {
    let results = await client.searchMovie({ title: record.title, year: record.year });
    let match = matchTmdbMovie(record, results);
    if (!match) {
      // The year filter can hide a film whose release year differs from the catalog's; search by title alone and
      // let the poster decide.
      results = await client.searchMovie({ title: record.title });
      match = matchTmdbMovie(record, results);
    }
    if (!match) return { id: record.id, outcome: 'unmatched' };
    const details = await client.movieDetails(match.tmdbId);
    if (!details) return { id: record.id, outcome: 'unmatched', detail: 'details-not-found' };
    const built = buildFact(record, match, details, today);
    if (!built.ok) return { id: record.id, outcome: 'rejected', detail: built.reason };
    return { id: record.id, outcome: 'matched', proof: match.proof, tmdbId: match.tmdbId, fact: built.fact };
  }

  async function worker() {
    while (!fatal && nextIndex < work.length) {
      const record = work[nextIndex];
      nextIndex += 1;
      let outcome;
      try {
        outcome = await inspect(record);
      } catch (error) {
        if (error?.name === 'TmdbAuthError') {
          fatal = error;
          return;
        }
        outcome = { id: record.id, outcome: 'error', detail: error instanceof Error ? error.message : String(error) };
      }
      outcomes.push(outcome);
      if (outcome.outcome === 'matched') facts[record.id] = outcome.fact;
      else if (outcome.outcome !== 'error') delete facts[record.id];
      if (outcomes.length % batchSize === 0) await onBatch({ facts: { ...facts }, completed: outcomes.length, total: work.length });
    }
  }

  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), work.length) }, worker));
  if (fatal) throw fatal;
  return { facts, outcomes, summary: summarizeOutcomes(outcomes) };
}

/** The source of src/data/tmdbFacts.ts: sorted and compact so that reruns produce small, reviewable diffs. */
export function renderFactsModule(facts, { maxAgeDays }) {
  const rows = Object.keys(facts).sort().map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(facts[id])},`);
  const body = rows.length > 0 ? `{\n${rows.join('\n')}\n}` : '{}';
  return `/* This file is generated by scripts/enrich-catalog.mjs from TMDB data. Do not edit it directly. */
import type { TmdbFact } from '../services/tmdbFacts';

/**
 * Facts read from TMDB for bundled titles, keyed by catalog id. Each row is [TMDB id, US certification, runtime in
 * minutes, TMDB vote count, YouTube trailer key or '', how the title was identified, ISO date read]. TMDB's terms
 * limit how long its data may be cached (six months), so every row carries the date it was read and the quality
 * tests fail once a row is older than ${maxAgeDays} days. Refresh with: npm run enrich:catalog -- --refresh
 */
export const TMDB_FACTS: Readonly<Record<string, TmdbFact>> = ${body};
`;
}
