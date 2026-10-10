import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { enrichRecords, renderFactsModule, summarizeOutcomes } from './lib/enrich.mjs';
import { importTypeScriptModule, importTypeScriptSource } from './lib/load-ts.mjs';
import { createTmdbClient, TmdbAuthError } from './tmdb-client.mjs';

/*
 * The TMDB enrichment pipeline: the HTTP client (request spacing, retry, credential redaction), the orchestration
 * that turns search results into facts, and the CLI's handling of credentials. Nothing here touches the network:
 * the client takes an injected fetch and clock.
 */

const okResponse = (body) => ({ ok: true, status: 200, headers: new Headers(), json: async () => body });
const failResponse = (status, headers = {}) => ({ ok: false, status, headers: new Headers(headers), json: async () => ({}) });

function scriptedFetch(responses) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), headers: options.headers ?? {} });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next;
  };
  return { fetchImpl, calls };
}

function virtualClock() {
  let time = 0;
  const sleeps = [];
  return { now: () => time, sleep: async (ms) => { sleeps.push(ms); time += ms; }, sleeps };
}

function clientWith(responses, options = {}) {
  const { fetchImpl, calls } = scriptedFetch(responses);
  const clock = virtualClock();
  const client = createTmdbClient({ token: 'TOKEN-123', fetchImpl, now: clock.now, sleep: clock.sleep, random: () => 0.5, ...options });
  return { client, calls, sleeps: clock.sleeps };
}

// --- Client: requests and authentication ---------------------------------------------------------------------
{
  const { client, calls } = clientWith([okResponse({ results: [{ id: 1 }] })]);
  assert.deepEqual(await client.searchMovie({ title: 'Alien: Romulus', year: 2024 }), [{ id: 1 }]);
  const url = new URL(calls[0].url);
  assert.equal(url.origin + url.pathname, 'https://api.themoviedb.org/3/search/movie');
  assert.equal(url.searchParams.get('query'), 'Alien: Romulus');
  assert.equal(url.searchParams.get('primary_release_year'), '2024');
  assert.equal(url.searchParams.get('include_adult'), 'false');
  assert.equal(calls[0].headers.Authorization, 'Bearer TOKEN-123');
  assert.equal(url.searchParams.has('api_key'), false, 'A bearer token travels in a header, never in the address');
}
{
  const { client, calls } = clientWith([okResponse({ results: [] })]);
  await client.searchMovie({ title: 'Zombieland' });
  assert.equal(new URL(calls[0].url).searchParams.has('primary_release_year'), false, 'Without a year the search is not narrowed');
}
{
  const { client } = clientWith([okResponse({})]);
  assert.deepEqual(await client.searchMovie({ title: 'Nothing' }), [], 'A response without results is an empty list');
}
{
  const { client, calls } = clientWith([okResponse({ id: 335984 })], { token: '', apiKey: 'KEY-456' });
  await client.movieDetails(335984);
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, '/3/movie/335984');
  assert.equal(url.searchParams.get('append_to_response'), 'release_dates,videos');
  assert.equal(url.searchParams.get('api_key'), 'KEY-456', 'Without a bearer token the key travels as a query parameter');
  assert.equal(calls[0].headers.Authorization, undefined);
}
{
  const { client } = clientWith([failResponse(404)]);
  assert.equal(await client.movieDetails(1), null, 'A title TMDB no longer has is simply missing');
}
{
  const { client } = clientWith([{ ok: true, status: 200, headers: new Headers(), json: async () => { throw new SyntaxError('Unexpected token <'); } }]);
  await assert.rejects(client.movieDetails(1), /unreadable response/, 'A body that is not JSON is reported plainly');
}
assert.throws(() => createTmdbClient({}), /credential/, 'A client without a credential cannot be created');

// --- Client: failures, retries and redaction -----------------------------------------------------------------
{
  const { client, calls } = clientWith([failResponse(401)]);
  await assert.rejects(client.movieDetails(1), (error) => {
    assert.ok(error instanceof TmdbAuthError);
    assert.equal(error.name, 'TmdbAuthError');
    assert.doesNotMatch(error.message, /TOKEN-123/, 'The credential never appears in an error');
    // The usual first-run mistake is pasting TMDB's short API Key where the long read access token belongs, or the reverse.
    assert.match(error.message, /TMDB_API_READ_ACCESS_TOKEN/, 'The error names where the read access token goes');
    assert.match(error.message, /TMDB_API_KEY/, 'and where the short API key goes');
    return true;
  });
  assert.equal(calls.length, 1, 'A rejected credential is not retried');
}
{
  const { client, calls, sleeps } = clientWith([failResponse(429, { 'retry-after': '2' }), failResponse(429, { 'retry-after': '2' }), okResponse({ results: [] })]);
  assert.deepEqual(await client.searchMovie({ title: 'x' }), []);
  assert.equal(calls.length, 3);
  assert.equal(sleeps.filter((ms) => ms === 2000).length, 2, 'A 429 waits as long as Retry-After says');
}
{
  const { client, sleeps } = clientWith([failResponse(503), failResponse(502), okResponse({ results: [] })]);
  await client.searchMovie({ title: 'x' });
  assert.ok(sleeps.includes(500) && sleeps.includes(1000), `Without Retry-After the wait doubles from 500 ms (waited ${sleeps.join(', ')})`);
}
{
  const { client, calls } = clientWith([failResponse(500), failResponse(500), failResponse(500)], { maxRetries: 2 });
  await assert.rejects(client.movieDetails(7), (error) => {
    assert.match(error.message, /status 500/);
    assert.doesNotMatch(error.message, /TOKEN-123/);
    return true;
  });
  assert.equal(calls.length, 3, 'The first try plus two retries');
}
{
  const { client, calls } = clientWith([new TypeError('fetch failed'), new TypeError('fetch failed'), okResponse({ results: [{ id: 9 }] })]);
  assert.deepEqual(await client.searchMovie({ title: 'x' }), [{ id: 9 }]);
  assert.equal(calls.length, 3, 'A network error is retried');
}
{
  const { client } = clientWith([new TypeError('fetch failed')], { token: '', apiKey: 'KEY-456', maxRetries: 0 });
  await assert.rejects(client.searchMovie({ title: 'secret search' }), (error) => {
    assert.match(error.message, /network error/);
    assert.doesNotMatch(error.message, /KEY-456|secret search|api_key/, 'Neither the key nor the query leaks into an error');
    return true;
  });
}
{
  const { client, sleeps } = clientWith(Array.from({ length: 5 }, () => okResponse({ results: [] })), { requestsPerSecond: 10 });
  await Promise.all(Array.from({ length: 5 }, () => client.searchMovie({ title: 'x' })));
  assert.equal(sleeps.reduce((total, ms) => total + ms, 0), 400, 'Five parallel requests at 10 per second are spaced 100 ms apart');
}

// --- Orchestration: from catalog records to facts ------------------------------------------------------------
const rules = await importTypeScriptModule('src/services/tmdbFacts.ts');
const record = (id, title, year, posterPath = `${id}.jpg`) => ({ id, title, year, posterPath });
const hit = (id, title, posterPath, date = '2009-10-02') => ({ id, title, release_date: date, poster_path: `/${posterPath}` });
const detailsFor = (id, overrides = {}) => ({
  id,
  release_date: '2009-10-02',
  runtime: 88,
  status: 'Released',
  vote_count: 100,
  release_dates: { results: [{ iso_3166_1: 'US', release_dates: [{ certification: 'R', type: 3 }] }] },
  videos: { results: [] },
  ...overrides,
});
const run = (overrides) => enrichRecords({ rules, today: '2026-10-02', now: new Date('2026-10-02T12:00:00Z'), concurrency: 2, ...overrides });

// A client that answers from tables and records what it was asked, and how many requests overlapped.
function fakeClient({ searches = {}, details = {}, failures = {} } = {}) {
  const calls = { search: [], details: [] };
  let inFlight = 0;
  let peak = 0;
  const track = async (work) => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    try {
      await new Promise((resolve) => setImmediate(resolve));
      return await work();
    } finally {
      inFlight -= 1;
    }
  };
  const client = {
    searchMovie: ({ title, year }) => track(async () => {
      calls.search.push({ title, year });
      if (failures[title]) throw failures[title];
      return searches[year ? `${title}|${year}` : title] ?? [];
    }),
    movieDetails: (id) => track(async () => {
      calls.details.push(id);
      if (failures[`details:${id}`]) throw failures[`details:${id}`];
      return details[id] ?? null;
    }),
  };
  return { client, calls, peak: () => peak };
}

{
  const { client, calls } = fakeClient({ searches: { 'A Movie|2009': [hit(11, 'A Movie', 'a-2009.jpg')] }, details: { 11: detailsFor(11) } });
  const { facts, outcomes, summary } = await run({ records: [record('a-2009', 'A Movie', 2009)], existingFacts: {}, client });
  assert.deepEqual(facts, { 'a-2009': [11, 'R', 88, 100, '', 'poster', '2026-10-02'] });
  assert.deepEqual(outcomes.map(({ outcome }) => outcome), ['matched']);
  assert.equal(calls.search.length, 1, 'One search is enough when the year-filtered result matches');
  assert.equal(summary.byPoster, 1);
}
{
  const { client, calls } = fakeClient();
  const { facts, summary } = await run({ records: [record('b-2010', 'Nobody Knows', 2010)], existingFacts: {}, client });
  assert.deepEqual(facts, {});
  assert.deepEqual(calls.search, [{ title: 'Nobody Knows', year: 2010 }, { title: 'Nobody Knows', year: undefined }], 'A title with no match is searched once more without the year');
  assert.equal(calls.details.length, 0, 'Details are fetched only for a proven match');
  assert.equal(summary.unmatched, 1);
}
{
  const { client } = fakeClient({ searches: { 'Late Release': [hit(22, 'Late Release', 'c-2010.jpg', '2011-01-01')] }, details: { 22: detailsFor(22, { release_date: '2011-01-01' }) } });
  const { facts } = await run({ records: [record('c-2010', 'Late Release', 2010)], existingFacts: {}, client });
  assert.equal(facts['c-2010']?.[0], 22, 'The title-only search finds a film whose release year differs by one, proven by its poster');
}
{
  const { client } = fakeClient({ searches: { 'Not Yet|2009': [hit(33, 'Not Yet', 'd-2009.jpg')] }, details: { 33: detailsFor(33, { status: 'Planned' }) } });
  const { facts, outcomes, summary } = await run({ records: [record('d-2009', 'Not Yet', 2009)], existingFacts: {}, client });
  assert.deepEqual(facts, {});
  assert.deepEqual(outcomes, [{ id: 'd-2009', outcome: 'rejected', detail: 'not-released' }]);
  assert.deepEqual(summary.rejectedReasons, { 'not-released': 1 });
}

const staleFact = [5, 'PG', 90, 10, '', 'poster', '2026-01-01'];
const freshFact = [5, 'PG', 90, 10, '', 'poster', '2026-10-01'];
{
  const { client } = fakeClient({ searches: { 'Flaky|2012': [hit(44, 'Flaky', 'e-2012.jpg', '2012-05-05')] }, failures: { 'details:44': new Error('TMDB request to /movie/44 failed (status 500)') } });
  const { facts, outcomes } = await run({ records: [record('e-2012', 'Flaky', 2012)], existingFacts: { 'e-2012': staleFact }, client });
  assert.deepEqual(outcomes.map(({ outcome }) => outcome), ['error']);
  assert.deepEqual(facts['e-2012'], staleFact, 'A transient failure keeps the old fact so a rerun can try again');
}
{
  const { client, calls } = fakeClient({ failures: { Third: new TmdbAuthError('TMDB rejected the credential (401).') } });
  const records = [record('f-2001', 'First', 2001), record('f-2002', 'Second', 2002), record('f-2003', 'Third', 2003), record('f-2004', 'Fourth', 2004), record('f-2005', 'Fifth', 2005)];
  await assert.rejects(run({ records, existingFacts: {}, client, concurrency: 1 }), TmdbAuthError);
  assert.ok(calls.search.every(({ title }) => title !== 'Fourth' && title !== 'Fifth'), 'A rejected credential stops the run');
}
{
  const { client, calls } = fakeClient();
  await run({ records: [record('g-2013', 'Fresh One', 2013)], existingFacts: { 'g-2013': freshFact }, client });
  assert.equal(calls.search.length, 0, 'A title with a fresh fact is not fetched again');
}
{
  const { client, calls } = fakeClient();
  const { facts } = await run({ records: [record('h-2013', 'Fresh Two', 2013)], existingFacts: { 'h-2013': freshFact }, client, refresh: true });
  assert.ok(calls.search.length > 0, 'refresh re-checks fresh facts');
  assert.deepEqual(facts, {}, 'A fact that cannot be verified again is dropped rather than kept as if verified');
}
{
  const { client } = fakeClient();
  const { facts } = await run({ records: [record('i-2014', 'Kept', 2014)], existingFacts: { 'i-2014': freshFact, 'gone-1999': freshFact }, client });
  assert.deepEqual(Object.keys(facts), ['i-2014'], 'Facts for titles that are no longer fetched (removed or reviewed by hand) are pruned');
}
{
  const { client, calls } = fakeClient({ searches: { 'Only|2020': [hit(77, 'Only', 'm-2020.jpg', '2020-01-01')] }, details: { 77: detailsFor(77, { release_date: '2020-01-01' }) } });
  const records = [record('m-2020', 'Only', 2020), record('n-2021', 'Other', 2021)];
  const { facts } = await run({ records, existingFacts: { 'n-2021': staleFact }, client, onlyIds: new Set(['m-2020']) });
  assert.deepEqual(Object.keys(facts).sort(), ['m-2020', 'n-2021'], 'Restricting a run to some ids never drops the facts for the others');
  assert.ok(calls.search.every(({ title }) => title === 'Only'), 'Only the requested ids are fetched, even when another fact is stale');
}
{
  const { client } = fakeClient();
  const records = Array.from({ length: 5 }, (_, index) => record(`j-200${index}`, `Title ${index}`, 2000 + index));
  const { outcomes } = await run({ records, existingFacts: {}, client, limit: 2 });
  assert.equal(outcomes.length, 2, 'limit caps how many titles one run attempts');
}
{
  const { client, peak } = fakeClient();
  const records = Array.from({ length: 8 }, (_, index) => record(`k-200${index}`, `Title ${index}`, 2000 + index));
  await run({ records, existingFacts: {}, client, concurrency: 2 });
  assert.ok(peak() <= 2, `No more than two titles are in flight at once (saw ${peak()})`);
}
{
  const { client } = fakeClient({
    searches: Object.fromEntries(Array.from({ length: 5 }, (_, index) => [`Movie ${index}|2009`, [hit(100 + index, `Movie ${index}`, `l-200${index}.jpg`)]])),
    details: Object.fromEntries(Array.from({ length: 5 }, (_, index) => [100 + index, detailsFor(100 + index)])),
  });
  const records = Array.from({ length: 5 }, (_, index) => record(`l-200${index}`, `Movie ${index}`, 2009));
  const batches = [];
  const { facts } = await run({ records, existingFacts: {}, client, concurrency: 1, batchSize: 2, onBatch: async (batch) => { batches.push({ completed: batch.completed, saved: Object.keys(batch.facts).length }); } });
  assert.deepEqual(batches, [{ completed: 2, saved: 2 }, { completed: 4, saved: 4 }], 'Progress is handed over every batch so an interrupted run can resume');
  assert.equal(Object.keys(facts).length, 5);
}

{
  const summary = summarizeOutcomes([
    { id: 'z-1', outcome: 'matched', proof: 'title-year', tmdbId: 9, fact: [] },
    { id: 'a-1', outcome: 'matched', proof: 'title-year', tmdbId: 8, fact: [] },
    { id: 'm-1', outcome: 'matched', proof: 'poster', tmdbId: 7, fact: [] },
    { id: 'n-1', outcome: 'unmatched' },
    { id: 'r-1', outcome: 'rejected', detail: 'no-runtime' },
    { id: 'r-2', outcome: 'rejected', detail: 'no-runtime' },
    { id: 'e-1', outcome: 'error', detail: 'boom' },
  ]);
  assert.deepEqual(
    { ...summary, weakMatches: undefined },
    { attempted: 7, matched: 3, byPoster: 1, byTitleYear: 2, unmatched: 1, rejected: 2, rejectedReasons: { 'no-runtime': 2 }, errors: 1, weakMatches: undefined },
  );
  assert.deepEqual(summary.weakMatches, [{ id: 'a-1', tmdbId: 8 }, { id: 'z-1', tmdbId: 9 }], 'Weaker matches are listed in a stable order for spot-checking');
}

// --- The generated data file ---------------------------------------------------------------------------------
{
  const facts = {
    'b-2010': [2, 'PG', 90, 5, 'x'.repeat(11), 'title-year', '2026-10-02'],
    'a-2009': [1, 'R', 88, 0, '', 'poster', '2026-10-01'],
  };
  const source = renderFactsModule(facts, { maxAgeDays: 150 });
  assert.ok(source.indexOf('"a-2009"') < source.indexOf('"b-2010"'), 'Rows are sorted so reruns produce small diffs');
  assert.equal(renderFactsModule({ ...facts }, { maxAgeDays: 150 }), source, 'Rendering is deterministic');
  assert.match(source, /older than 150 days/, 'The file explains the expiry rule');
  const loaded = await importTypeScriptSource(source);
  assert.deepEqual(loaded.TMDB_FACTS, facts, 'The rendered module loads back to the same facts');
  const empty = await importTypeScriptSource(renderFactsModule({}, { maxAgeDays: 150 }));
  assert.deepEqual(empty.TMDB_FACTS, {}, 'An empty set of facts is a valid module');
}

// --- The command line: credentials and dry runs -------------------------------------------------------------
const { SAMPLE_MOVIES: catalogForCli } = await importTypeScriptModule('src/data/generatedMovies.ts');
const { VALIDATED_CATALOG_ENTRIES: reviewedForCli } = await importTypeScriptModule('src/services/catalogQuality.ts');
const factsFile = resolve('src/data/tmdbFacts.ts');
const factsHash = () => createHash('sha256').update(readFileSync(factsFile)).digest('hex');
// The child never reads the real .env and never inherits a credential, so these tests cannot reach the network.
const cli = (args, env = {}) => spawnSync(process.execPath, [resolve('scripts/enrich-catalog.mjs'), ...args], {
  encoding: 'utf8',
  env: { ...process.env, STREAMFLICKER_ENV_FILE: resolve('scripts/no-such-env-file'), TMDB_API_READ_ACCESS_TOKEN: '', TMDB_API_KEY: '', ...env },
});
const lineValue = (output, label) => output.split('\n').find((line) => line.startsWith(label))?.slice(label.length).trim();
{
  const result = cli(['--help']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Usage: npm run enrich:catalog/);
  assert.match(result.stdout, /--refresh/);
}
{
  const before = factsHash();
  const result = cli(['--dry-run']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(lineValue(result.stdout, 'Catalog titles:'), catalogForCli.length.toLocaleString('en-US'));
  assert.equal(lineValue(result.stdout, 'Reviewed by hand (skipped):'), String(Object.keys(reviewedForCli).length));
  assert.match(result.stdout, /Dry run: no requests were made and nothing was written\./);
  assert.equal(lineValue(result.stdout, 'TMDB credential:'), 'not set (a dry run does not need one)');
  assert.equal(factsHash(), before, 'A dry run writes nothing');
}
{
  const secret = 'SECRET-TOKEN-XYZ-12345';
  const result = cli(['--dry-run'], { TMDB_API_READ_ACCESS_TOKEN: secret });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(lineValue(result.stdout, 'TMDB credential:'), 'found');
  assert.ok(!result.stdout.includes(secret) && !result.stderr.includes(secret), 'The credential is never printed');
}
{
  const result = cli([]);
  assert.equal(result.status, 1, 'A real run without a credential stops before any request');
  assert.match(result.stderr, /TMDB_API_READ_ACCESS_TOKEN/);
}
{
  const result = cli(['--limit', 'abc', '--dry-run']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--limit/);
}
{
  const result = cli(['--dry-run', '--ids', 'no-such-title-1999']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout + result.stderr, /Not in the catalog \(ignored\): no-such-title-1999/);
  assert.equal(lineValue(result.stdout, 'To fetch this run:'), '0');
}
{
  const result = cli(['--nope']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage: npm run enrich:catalog/, 'An unknown option shows the usage');
}

console.log('Passed TMDB enrichment checks.');
