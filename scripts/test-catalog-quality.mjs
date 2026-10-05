import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';

async function importTypeScriptModule(relativePath) {
  const source = await readFile(resolve(relativePath), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const source = await readFile(resolve('src/data/movies.ts'), 'utf8');
const shareModalSource = await readFile(resolve('src/components/ShareModal.tsx'), 'utf8');
const appSource = await readFile(resolve('src/App.tsx'), 'utf8');
const match = source.match(/export const SAMPLE_MOVIES: Movie\[\] = (\[[\s\S]*?\]);\s*export const movies/);
assert.ok(match, 'The bundled source catalog should remain parseable');
const sourceMovies = JSON.parse(match[1]);
const {
  CATALOG_CHECKED_AT,
  CATALOG_REGION,
  VALIDATED_CATALOG_ENTRIES,
  enrichValidatedMovie,
  getValidatedCatalog,
  validateCatalogRecord,
} = await importTypeScriptModule('src/services/catalogQuality.ts');
const {
  buildMovieNightShareText,
  buildMovieShareText,
  getAvailabilityAttribution,
  getAvailabilityCheckedLabel,
  getAvailabilityDisclosure,
  getMovieSourceLabel,
  getShareEligibility,
} = await importTypeScriptModule('src/services/shareText.ts');

const validated = getValidatedCatalog(sourceMovies);
assert.equal(validated.length, Object.keys(VALIDATED_CATALOG_ENTRIES).length, 'Every curated entry should pass the offline gate');
assert.ok(validated.length < sourceMovies.length / 10, 'Trusted surfaces should use a smaller catalog subset');
assert.ok(validated.every((movie) => movie.availability?.source === 'bundled'), 'Bundled recommendations must retain bundled availability provenance');
assert.ok(validated.every((movie) => movie.availability?.region === CATALOG_REGION), 'Bundled recommendations must carry the configured region');
assert.ok(validated.every((movie) => !/^(?:a-list|hollywood|main|generic|unknown|placeholder|director|cast)\b/i.test(movie.director)), 'Trusted records cannot expose placeholder credits');
assert.ok(validated.every((movie) => !['c7ynwAgQD-0', 'pyM3z73oMAk'].includes(movie.youtubeTrailerId)), 'Trusted records cannot expose shared trailer placeholders');

// The home page ships only the reviewed titles; the 1,799-record catalog loads after first paint.
const { HOME_MOVIES, BROWSABLE_RECORD_COUNT, CATALOG_RECORD_COUNT, SHORTCUT_COUNTS } = await importTypeScriptModule('src/data/homeCatalog.ts');
const { SAMPLE_MOVIES: fullCatalog } = await importTypeScriptModule('src/data/generatedMovies.ts');
const { countBrowsable } = await importTypeScriptModule('src/services/browseOrder.ts');
const {
  isDateNightFriendly,
  isFamilyFriendly,
  isQuickWatch,
} = await importTypeScriptModule('src/services/discovery.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));
assert.equal(CATALOG_RECORD_COUNT, fullCatalog.length, 'The home page advertises the real catalog size');
// "Browse all N" must match the grid it opens, which hides unreleased titles. The snapshot is taken as of
// the review date so that regenerating on a different day cannot change the file.
assert.equal(
  BROWSABLE_RECORD_COUNT,
  countBrowsable(fullCatalog, new Date(CATALOG_CHECKED_AT)),
  'The Browse all count must equal the number of titles browsing lists',
);
assert.ok(BROWSABLE_RECORD_COUNT < CATALOG_RECORD_COUNT, 'Today at least one record is hidden as unreleased, so the two counts differ');
assert.deepEqual(
  HOME_MOVIES.map(({ id }) => id),
  Object.keys(VALIDATED_CATALOG_ENTRIES),
  'The home catalog holds exactly the reviewed titles, in curation order',
);
for (const movie of HOME_MOVIES) {
  assert.deepEqual(plain(movie), plain(fullCatalog.find(({ id }) => id === movie.id)), `${movie.id} must match its full-catalog record`);
}
assert.equal(getValidatedCatalog(HOME_MOVIES).length, HOME_MOVIES.length, 'Every home record must pass the offline gate on its own');
assert.deepEqual(
  SHORTCUT_COUNTS,
  {
    family: fullCatalog.filter(isFamilyFriendly).length,
    dateNight: fullCatalog.filter(isDateNightFriendly).length,
    quickWatch: fullCatalog.filter(isQuickWatch).length,
    zombies: fullCatalog.filter((movie) => movie.tags.includes('#ZombieOutbreak')).length,
  },
  'Shortcut counts must equal what each shortcut returns over the full catalog',
);

// Facts read from TMDB (src/data/tmdbFacts.ts) must be well formed, belong to titles that are fetched rather than
// reviewed by hand, still be fresh (TMDB limits caching to six months), and be exactly what the generated catalog shows.
const { TMDB_FACTS } = await importTypeScriptModule('src/data/tmdbFacts.ts');
const { TMDB_FACT_MAX_AGE_DAYS, formatRuntime, isFactFresh } = await importTypeScriptModule('src/services/tmdbFacts.ts');
const catalogById = new Map(fullCatalog.map((movie) => [movie.id, movie]));
const factsToday = new Date();
for (const [id, fact] of Object.entries(TMDB_FACTS)) {
  const movie = catalogById.get(id);
  assert.ok(movie, `${id} has a TMDB fact but is not in the catalog`);
  assert.equal(id in VALIDATED_CATALOG_ENTRIES, false, `${id} is reviewed by hand and must not also carry a fetched fact`);
  assert.equal(fact.length, 7, `${id}: a fact has seven fields`);
  const [tmdbId, certification, runtimeMinutes, voteCount, trailerKey, proof, checkedAt] = fact;
  assert.ok(Number.isInteger(tmdbId) && tmdbId > 0, `${id}: TMDB id`);
  assert.match(certification, /^(?:G|PG|PG-13|R|NC-17|NOT RATED|TV-[A-Z0-9]+)$/, `${id}: certification`);
  assert.ok(Number.isInteger(runtimeMinutes) && runtimeMinutes >= 40 && runtimeMinutes <= 400, `${id}: runtime`);
  assert.ok(Number.isInteger(voteCount) && voteCount >= 0, `${id}: vote count`);
  assert.match(trailerKey, /^(?:[A-Za-z0-9_-]{11})?$/, `${id}: trailer key`);
  assert.ok(proof === 'poster' || proof === 'title-year', `${id}: proof`);
  assert.ok(
    isFactFresh(checkedAt, factsToday),
    `${id}: TMDB data read on ${checkedAt} is more than ${TMDB_FACT_MAX_AGE_DAYS} days old. TMDB limits caching to six months, so refresh it: npm run enrich:catalog -- --refresh, then npm run generate:catalog.`,
  );
  assert.equal(movie.recordSource, 'tmdb-checked', `${id}: the generated catalog must apply its fact`);
  assert.equal(movie.rating, certification, `${id}: generated rating`);
  assert.equal(movie.duration, formatRuntime(runtimeMinutes), `${id}: generated runtime`);
  assert.equal(movie.voteCount ?? 0, voteCount, `${id}: generated vote count`);
}
assert.equal(
  fullCatalog.filter((movie) => movie.recordSource === 'tmdb-checked').length,
  Object.keys(TMDB_FACTS).length,
  'Every fact, and only a fact, makes a checked record',
);

const firstId = Object.keys(VALIDATED_CATALOG_ENTRIES)[0];
const firstSource = sourceMovies.find((movie) => movie.id === firstId);
const firstEntry = VALIDATED_CATALOG_ENTRIES[firstId];
assert.ok(firstSource && firstEntry, 'The first curated fixture should exist');
const fallbackCuratedRow = { ...firstSource, recordSource: 'watchlist-fallback' };
const savedCuratedRow = { ...firstSource, recordSource: 'saved-watchlist' };
assert.equal(getValidatedCatalog([fallbackCuratedRow]).length, 0, 'Watchlist fallback rows must never enter the trusted catalog');
assert.equal(getValidatedCatalog([savedCuratedRow]).length, 0, 'Saved Watchlist rows must never enter the trusted catalog');
assert.equal(enrichValidatedMovie(fallbackCuratedRow, firstEntry).recordSource, 'watchlist-fallback', 'Fallback provenance must survive any attempted enrichment');
assert.equal(enrichValidatedMovie(savedCuratedRow, firstEntry).recordSource, 'saved-watchlist', 'Saved Watchlist provenance must survive any attempted enrichment');
assert.equal(getShareEligibility(fallbackCuratedRow).shareable, false, 'Watchlist fallback rows must remain non-shareable');
assert.equal(getShareEligibility(savedCuratedRow).shareable, false, 'Saved Watchlist rows must remain non-shareable');
// A "checked" record has real rating and runtime (matched to TMDB with proof) but no editorial review, so it can
// never become a recommendation or be shared, even if its id were a reviewed id.
const checkedCuratedRow = { ...firstSource, recordSource: 'tmdb-checked' };
assert.equal(getValidatedCatalog([checkedCuratedRow]).length, 0, 'Checked records must never enter the trusted catalog');
assert.ok(validateCatalogRecord(checkedCuratedRow, firstEntry).reasons.includes('untrusted record provenance'), 'A checked record is not a reviewed record');
assert.equal(getShareEligibility(checkedCuratedRow).shareable, false, 'Checked records must remain non-shareable');
// The hero, rails and planner are fed only by the reviewed titles that ship with the app,
// so watchlist-fallback rows, live results and the lazily loaded catalog can never reach them.
assert.match(appSource, /getValidatedCatalog\(HOME_MOVIES\)/, 'Trusted surfaces must be fed only by the shipped reviewed titles');
assert.doesNotMatch(
  appSource,
  /getValidatedCatalog\(\s*(?:canonicalCatalog|fullCatalog|loadedCatalog|fallbackCatalog|tmdbResults)/,
  'Fallback rows, live results and the loaded catalog must never feed trusted surfaces',
);
const placeholderMovie = { ...enrichValidatedMovie(firstSource, firstEntry), youtubeTrailerId: 'c7ynwAgQD-0' };
assert.equal(validateCatalogRecord(placeholderMovie, firstEntry).valid, false, 'Shared trailer placeholders must fail closed');
assert.ok(validateCatalogRecord(placeholderMovie, firstEntry).reasons.includes('missing or shared trailer'));
assert.equal(
  validateCatalogRecord({ ...firstSource, director: 'A-List Director' }, firstEntry).valid,
  false,
  'Curated metadata must inspect the original source row before enrichment',
);
assert.equal(
  validateCatalogRecord(
    { ...firstSource, cast: ['Jane Placeholder', ...firstEntry.cast.slice(1)] },
    { ...firstEntry, cast: ['Jane Placeholder', ...firstEntry.cast.slice(1)] },
  ).valid,
  false,
  'Embedded placeholder credit text must fail closed',
);
assert.equal(
  validateCatalogRecord({ ...firstSource, title: 'A Different Movie' }, firstEntry).valid,
  false,
  'A title/source identity mismatch must fail closed',
);
assert.equal(
  validateCatalogRecord({ ...firstSource, releaseDate: '2017-02-30' }, firstEntry).valid,
  false,
  'Impossible calendar dates must fail closed',
);
assert.equal(
  validateCatalogRecord(enrichValidatedMovie(firstSource, { ...firstEntry, checkedAt: '2020-01-01' }), { ...firstEntry, checkedAt: '2020-01-01' }).valid,
  false,
  'Stale curated metadata must fail closed',
);
assert.ok(
  validateCatalogRecord(enrichValidatedMovie(firstSource, firstEntry), firstEntry, '2027-10-01').reasons.includes('curated metadata is stale'),
  'Curated metadata must become ineligible after its freshness window',
);
// TMDB's terms forbid caching its data for more than six months, so reviewed metadata expires after 150 days.
const plusDays = (iso, days) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const reviewedRow = enrichValidatedMovie(firstSource, firstEntry);
assert.equal(validateCatalogRecord(reviewedRow, firstEntry, plusDays(firstEntry.checkedAt, 150)).valid, true, 'Reviewed metadata is still usable 150 days after it was checked');
assert.ok(
  validateCatalogRecord(reviewedRow, firstEntry, plusDays(firstEntry.checkedAt, 151)).reasons.includes('curated metadata is stale'),
  'Reviewed metadata expires after 150 days, inside TMDB six-month caching limit',
);
// Early warning: a month before the reviewed titles hide themselves, this suite (and the weekly CI run) fails.
for (const [id, entry] of Object.entries(VALIDATED_CATALOG_ENTRIES)) {
  const ageDays = Math.floor((Date.now() - Date.parse(`${entry.checkedAt}T00:00:00Z`)) / 86_400_000);
  assert.ok(
    ageDays <= 120,
    `${id} was checked ${ageDays} days ago (${entry.checkedAt}) and hides itself after 150. Re-check the reviewed titles' certification and runtime on TMDB, then update CATALOG_CHECKED_AT in src/services/catalogQuality.ts.`,
  );
}

// The curated rows used to carry bucketed placeholders ("R", "2h 0m") while claiming
// ratingSource: TMDB (Interstellar showed R / 2h 0m). These are the certification and
// runtime shown on each title's own TMDB page, read on 2026-10-01.
const TMDB_VERIFIED_FACTS = {
  'blade-runner-2049-2017': ['R', 164],
  'interstellar-2014': ['PG-13', 169],
  'inception-2010': ['PG-13', 148],
  'john-wick-2014': ['R', 101],
  'gone-girl-2014': ['R', 149],
  'the-revenant-2015': ['R', 157],
  'mad-max--fury-road-2015': ['R', 121],
  'the-martian-2015': ['PG-13', 141],
  'prisoners-2013': ['R', 153],
  'world-war-z-2013': ['PG-13', 116],
  'zombieland-2009': ['R', 88],
  '28-days-later-2002': ['R', 113],
  'alien--romulus-2024': ['R', 119],
  'shutter-island-2010': ['R', 138],
  'shaun-of-the-dead-2004': ['R', 99],
  'the-dark-knight-2008': ['PG-13', 152],
  'i-am-legend-2007': ['PG-13', 101],
};
assert.deepEqual(
  Object.keys(TMDB_VERIFIED_FACTS).sort(),
  Object.keys(VALIDATED_CATALOG_ENTRIES).sort(),
  'Every curated entry needs verified certification and runtime facts',
);
for (const [id, [certification, runtimeMinutes]] of Object.entries(TMDB_VERIFIED_FACTS)) {
  const entry = VALIDATED_CATALOG_ENTRIES[id];
  assert.equal(entry.certification, certification, `${id} curated certification`);
  assert.equal(entry.runtimeMinutes, runtimeMinutes, `${id} curated runtime`);
  const row = sourceMovies.find((movie) => movie.id === id);
  assert.equal(row.rating, certification, `${id} source row rating must match its verified certification`);
  assert.equal(row.duration, `${Math.floor(runtimeMinutes / 60)}h ${runtimeMinutes % 60}m`, `${id} source row runtime must match`);
}
assert.ok(
  validateCatalogRecord({ ...firstSource, rating: 'PG' }, firstEntry).reasons.includes('source certification is missing or mismatched'),
  'A curated row whose rating disagrees with its verified certification must fail closed',
);
assert.ok(
  validateCatalogRecord({ ...firstSource, duration: '1h 0m' }, firstEntry).reasons.includes('source runtime is missing or mismatched'),
  'A curated row whose runtime disagrees with its verified runtime must fail closed',
);

const disclosureMovie = {
  ...validated[0],
  availability: { status: 'discovery', source: 'bundled', region: CATALOG_REGION },
};
assert.match(getAvailabilityDisclosure(disclosureMovie), /source: StreamFlicker bundled discovery/);
assert.match(getAvailabilityDisclosure(disclosureMovie), /region: US/);
assert.match(getAvailabilityDisclosure(disclosureMovie), /checked date unavailable/);
assert.match(getAvailabilityAttribution(disclosureMovie), /no live provider result/);
const liveMovie = {
  ...disclosureMovie,
  availability: { status: 'verified', source: 'tmdb', region: CATALOG_REGION, checkedAt: CATALOG_CHECKED_AT },
};
assert.match(getAvailabilityDisclosure(liveMovie), /source: TMDB\/JustWatch/);
assert.match(getAvailabilityCheckedLabel(liveMovie), /checked/);
// ISO dates are 1-based in the string but 0-based in Date.UTC. Missing `month - 1`
// rendered every checked date a month late (2026-09-23 showed as Oct 23).
for (const [checkedAt, expected] of [
  ['2026-09-23', 'checked Sep 23, 2026'],
  ['2026-12-31', 'checked Dec 31, 2026'],
  ['2026-01-01T08:30:00.000Z', 'checked Jan 1, 2026'],
]) {
  assert.equal(
    getAvailabilityCheckedLabel({ ...liveMovie, availability: { ...liveMovie.availability, checkedAt } }),
    expected,
    `${checkedAt} must render in its own month`,
  );
}
assert.match(getAvailabilityAttribution(liveMovie), /JustWatch through TMDB/);
assert.match(getAvailabilityAttribution(liveMovie), /commercial permission/);
assert.match(getMovieSourceLabel(validated[0]), /validated subset/);
assert.match(getMovieSourceLabel(sourceMovies.find((movie) => movie.id === 'scream-7-2026')), /search-only/);
assert.equal(
  getShareEligibility(sourceMovies.find((movie) => movie.id === 'scream-7-2026')).shareable,
  false,
  'Scream 7 bundled discovery evidence must remain search-only',
);
assert.equal(
  getShareEligibility(sourceMovies.find((movie) => movie.id === 'paranormal-activity-8-2027')).shareable,
  false,
  'Paranormal Activity 8 future/placeholder evidence must remain search-only',
);
assert.equal(
  getShareEligibility({ ...validated[0], recordSource: 'watchlist-fallback' }).shareable,
  false,
  'Watchlist fallback records must not enter a share action',
);
assert.match(shareModalSource, /What you(?:'|&apos;)ll share/i, 'The share dialog previews the exact text-only message');
assert.doesNotMatch(shareModalSource, /movie\.(?:posterUrl|backdropUrl)/, 'Owned share card must not embed licensed movie artwork');
assert.doesNotMatch(buildMovieShareText(disclosureMovie, 'https://www.streamflicker.com/?movie=fixture'), /poster|backdrop|user|score/i, 'Owned share text must remain poster-free and identity-free');

// Shared messages are read by friends in a chat, not by an auditor: no record metadata.
const fixtureShareUrl = 'https://www.streamflicker.com/?movie=fixture';
const singleShare = buildMovieShareText(validated[0], fixtureShareUrl);
assert.equal(
  singleShare,
  `${validated[0].title} (${validated[0].year}) on StreamFlicker: trailer and where to watch ${fixtureShareUrl}`,
  'A single-title share should be one readable sentence ending in the link',
);
assert.doesNotMatch(singleShare, /record source|availability source|status:|region:|bundled|discovery/i, 'Share text must not leak internal record metadata');
const liveShareMovie = {
  ...validated[0],
  id: 'tmdb-157336',
  recordSource: 'tmdb-live',
  availability: { status: 'verified', source: 'tmdb', region: CATALOG_REGION, checkedAt: CATALOG_CHECKED_AT },
};
assert.equal(getShareEligibility(liveShareMovie).shareable, true, 'A live record with a region and check date is shareable');
assert.match(buildMovieShareText(liveShareMovie, fixtureShareUrl), /Streaming data from JustWatch via TMDB\.$/, 'Live provider data keeps its required attribution, after the link');
assert.match(
  buildMovieShareText({ ...disclosureMovie, recordSource: undefined }, fixtureShareUrl),
  /^Search-only result: .+ cannot be shared\./,
  'Search-only records still explain why they cannot be shared',
);
const nightShare = buildMovieNightShareText('Curated for any occasion.', [validated[0], validated[1]], 'https://www.streamflicker.com');
assert.equal(
  nightShare.split('\n').slice(0, 4).join('\n'),
  `My StreamFlicker movie night\nCurated for any occasion.\n1. ${validated[0].title} (${validated[0].year})\n2. ${validated[1].title} (${validated[1].year})`,
  'A movie-night plan should list its picks plainly',
);
assert.match(nightShare, /Trailers and where to watch: https:\/\/www\.streamflicker\.com/);
assert.match(nightShare, /Picks come from StreamFlicker's reviewed list \(checked Sep 23, 2026\)\. Check availability before you pay\./, 'The plan keeps one honest provenance footnote');
assert.doesNotMatch(nightShare, /availability source|record source|status: discovery|region: US/i, 'Plans must not repeat machine metadata per title');
assert.equal(CATALOG_CHECKED_AT, '2026-09-23');

// A plan may include well-known titles that were matched to TMDB ("checked"). They are listed and marked, and the
// footnote says what the mark means, so a plan never claims more review than its picks have.
const checkedForShare = { ...validated[1], id: 'checked-share', title: 'A Well-Known Film', year: 2012, recordSource: 'tmdb-checked', availability: { status: 'discovery', source: 'bundled', region: 'US' } };
const mixedShare = buildMovieNightShareText('Curated for any occasion.', [validated[0], checkedForShare], 'https://www.streamflicker.com');
assert.equal(
  mixedShare.split('\n').slice(0, 4).join('\n'),
  `My StreamFlicker movie night\nCurated for any occasion.\n1. ${validated[0].title} (${validated[0].year})\n2. A Well-Known Film (2012) (checked on TMDB)`,
  'A checked pick is listed and marked',
);
assert.match(
  mixedShare,
  /Picks marked "checked on TMDB" were matched to TMDB but are not hand-reviewed; the others come from StreamFlicker's reviewed list \(checked Sep 23, 2026\)\. Check availability before you pay\./,
  'The footnote explains the mark and keeps the reviewed date for the reviewed picks',
);
assert.doesNotMatch(mixedShare, /aren't listed|isn't listed/, 'Nothing was left out');
const checkedOnlyShare = buildMovieNightShareText('Curated for any occasion.', [checkedForShare], 'https://www.streamflicker.com');
assert.match(checkedOnlyShare, /1\. A Well-Known Film \(2012\) \(checked on TMDB\)/);
assert.match(checkedOnlyShare, /These picks were matched to TMDB but are not hand-reviewed\. Check availability before you pay\./);
assert.doesNotMatch(checkedOnlyShare, /reviewed list/, 'A plan with no reviewed pick must not claim the reviewed list');
const unreviewedForShare = { ...checkedForShare, id: 'unreviewed-share', recordSource: undefined };
assert.match(
  buildMovieNightShareText('Curated for any occasion.', [validated[0], unreviewedForShare], 'https://www.streamflicker.com'),
  /1 more pick isn't listed because it hasn't been reviewed yet\./,
  'A bundled title nobody checked is still left out',
);
assert.match(buildMovieNightShareText('Curated for any occasion.', [unreviewedForShare]), /No picks to share yet\./);

console.log(`Passed catalog quality and poster-free share checks for ${validated.length} trusted records.`);
