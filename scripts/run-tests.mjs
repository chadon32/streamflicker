import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';

async function importTypeScriptModule(relativePath) {
  let source = await readFile(resolve(relativePath), 'utf8');
  // The lightweight data-URL loader keeps tests dependency-free. Inline local
  // runtime dependencies so Node does not need to resolve relative imports
  // from a data: URL.
  if (relativePath.endsWith('src/services/smartSearch.ts')) {
    const discoverySource = await readFile(resolve('src/services/discovery.ts'), 'utf8');
    const searchCatalogSource = await readFile(resolve('src/services/searchCatalog.ts'), 'utf8');
    source = `${discoverySource.replace(/^export\s+/gm, '')}\n${searchCatalogSource.replace(/^export\s+/gm, '')}\n${source
      .replace(/import\s+\{[\s\S]*?\}\s+from\s+'\.\/discovery';\s*/m, '')
      .replace(/import\s+\{[\s\S]*?\}\s+from\s+'\.\/searchCatalog';\s*/m, '')}`;
  } else if (relativePath.endsWith('src/services/movieNight.ts')) {
    const discoverySource = await readFile(resolve('src/services/discovery.ts'), 'utf8');
    source = `${discoverySource.replace(/^export\s+/gm, '')}\n${source
      .replace(/import\s+\{[\s\S]*?\}\s+from\s+'\.\/discovery';\s*/m, '')}`;
  } else if (relativePath.endsWith('src/services/tmdbApi.ts')) {
    const catalogSource = await readFile(resolve('src/data/catalog.ts'), 'utf8');
    const searchCatalogSource = await readFile(resolve('src/services/searchCatalog.ts'), 'utf8');
    source = `${catalogSource.replace(/^export\s+/gm, '')}\n${searchCatalogSource.replace(/^export\s+/gm, '')}\n${source
      .replace(/import\s+\{[\s\S]*?\}\s+from\s+'\.\.\/data\/catalog';\s*/m, '')
      .replace(/import\s+\{[\s\S]*?\}\s+from\s+'\.\/searchCatalog';\s*/m, '')}`;
  } else if (relativePath.endsWith('api/tmdb-search.ts')) {
    const searchCatalogSource = await readFile(resolve('src/services/searchCatalog.ts'), 'utf8');
    source = `${searchCatalogSource.replace(/^export\s+/gm, '')}\n${source
      .replace(/import\s+\{[\s\S]*?\}\s+from\s+'\.\.\/src\/services\/searchCatalog(?:\.js)?';\s*/m, '')}`;
  }
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const encoded = Buffer.from(output).toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

const { generateAffiliateUrl } = await importTypeScriptModule('src/services/affiliate.ts');
const { getValidatedYouTubeTrailerId } = await importTypeScriptModule('src/services/trailer.ts');
const { getTMDBImageSrcSet, getTMDBImageUrl } = await importTypeScriptModule('src/services/images.ts');
const {
  GUEST_ID_STORAGE_KEY,
  LEGACY_WATCHLIST_STORAGE_KEY,
  WATCHLIST_STORAGE_KEY,
  getWatchlistStorageKey,
  importLegacyWatchlistToGuest,
  importLegacyWatchlistToUser,
  loadWatchlistForUser,
  saveWatchlistForUser,
} = await importTypeScriptModule('src/services/watchlistStorage.ts');
const { resolveDeleteAccountCors } = await importTypeScriptModule(
  'supabase/functions/_shared/deleteAccountCors.ts',
);
const deleteAccountSource = await readFile(resolve('supabase/functions/delete-account/index.ts'), 'utf8');
assert.doesNotMatch(deleteAccountSource, /deleteError\.message/, 'Delete-account logs must not expose raw provider exception text');
assert.match(deleteAccountSource, /errorName:/, 'Delete-account failures should retain only a safe error classification');

const watchlistMovie = {
  id: 'watchlist-fixture',
  title: 'Saved Fixture',
  year: 2024,
  rating: 'PG-13',
  score: 8,
  matchPercentage: 80,
  duration: '1h 40m',
  genre: ['Drama'],
  tags: [],
  director: 'Test Director',
  cast: ['Test Actor'],
  description: 'A movie saved by a test user.',
  posterUrl: 'https://example.com/poster.jpg',
  backdropUrl: 'https://example.com/backdrop.jpg',
  youtubeTrailerId: '',
  streamingPlatforms: [],
};
const watchlistStorageData = new Map();
const watchlistStorage = {
  getItem(key) {
    return watchlistStorageData.has(key) ? watchlistStorageData.get(key) : null;
  },
  setItem(key, value) {
    watchlistStorageData.set(key, String(value));
  },
};
watchlistStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify([watchlistMovie]));
const guestList = loadWatchlistForUser(null, watchlistStorage);
assert.deepEqual(guestList, [], 'An ambiguous legacy list must not be assigned to the guest namespace during migration');
assert.ok(watchlistStorage.getItem(LEGACY_WATCHLIST_STORAGE_KEY), 'Legacy watchlist data should retain a separate migration copy');
assert.equal(watchlistStorage.getItem(getWatchlistStorageKey(null, watchlistStorage)), null, 'Legacy migration should not populate a guest namespace before explicit import');
saveWatchlistForUser('account-a', [watchlistMovie], watchlistStorage);
assert.deepEqual(loadWatchlistForUser('account-b', watchlistStorage), [], 'Account B must not read Account A watchlist data');
assert.deepEqual(loadWatchlistForUser(null, watchlistStorage), [], 'Signing out must not expose an ambiguous legacy list as guest data');
assert.deepEqual(importLegacyWatchlistToGuest(watchlistStorage).map(({ id }) => id), ['watchlist-fixture'], 'Legacy data requires an explicit guest import');
assert.ok(watchlistStorage.getItem(GUEST_ID_STORAGE_KEY), 'Explicit guest import should create a stable device identifier');
assert.deepEqual(loadWatchlistForUser(null, watchlistStorage).map(({ id }) => id), ['watchlist-fixture'], 'An explicitly imported legacy list should become guest data');
assert.deepEqual(importLegacyWatchlistToUser('account-b', watchlistStorage).map(({ id }) => id), ['watchlist-fixture'], 'Legacy data requires an explicit account import');
assert.notEqual(getWatchlistStorageKey('account-a', watchlistStorage), getWatchlistStorageKey('account-b', watchlistStorage), 'Authenticated users need distinct storage keys');

const trustedOrigin = new Request('https://streamflicker.vercel.app/functions/v1/delete-account', {
  method: 'OPTIONS',
  headers: { Origin: 'https://streamflicker.vercel.app' },
});
const trustedCors = resolveDeleteAccountCors(trustedOrigin, 'https://streamflicker.vercel.app');
assert.equal(trustedCors.allowed, true, 'Configured web origins should pass delete-account CORS');
assert.equal(trustedCors.headers['Access-Control-Allow-Origin'], 'https://streamflicker.vercel.app');
const attackerCors = resolveDeleteAccountCors(
  new Request(trustedOrigin.url, { headers: { Origin: 'https://attacker.example' } }),
  'https://streamflicker.vercel.app',
);
assert.equal(attackerCors.allowed, false, 'Untrusted web origins must fail delete-account CORS');
assert.equal(attackerCors.status, 403);
const nativeCors = resolveDeleteAccountCors(
  new Request(trustedOrigin.url, { headers: { Authorization: 'Bearer native-token' } }),
  undefined,
);
assert.equal(nativeCors.allowed, true, 'Native bearer clients without Origin should remain supported');
assert.equal(nativeCors.headers['Access-Control-Allow-Origin'], undefined, 'Native responses must not emit wildcard or guessed origins');
const capacitorCors = resolveDeleteAccountCors(
  new Request(trustedOrigin.url, { headers: { Origin: 'capacitor://localhost' } }),
  'capacitor://localhost',
);
assert.equal(capacitorCors.allowed, true, 'Configured Capacitor origins should remain supported');
assert.equal(capacitorCors.headers['Access-Control-Allow-Origin'], 'capacitor://localhost');
const misconfiguredCors = resolveDeleteAccountCors(
  trustedOrigin,
  'not-an-origin',
);
assert.equal(misconfiguredCors.allowed, false, 'Missing or malformed web origin configuration must fail closed');
assert.equal(misconfiguredCors.status, 500);

assert.equal(
  getTMDBImageUrl('https://image.tmdb.org/t/p/w500/poster.jpg', 342),
  'https://image.tmdb.org/t/p/w342/poster.jpg',
  'TMDB image helpers should request the display-appropriate width',
);
assert.equal(
  getTMDBImageUrl('https://example.com/poster.jpg', 342),
  'https://example.com/poster.jpg',
  'Image helpers must not rewrite non-TMDB origins',
);
assert.match(
  getTMDBImageSrcSet('https://image.tmdb.org/t/p/w1280/backdrop.jpg', [500, 780]) ?? '',
  /w500\/backdrop\.jpg 500w, .*w780\/backdrop\.jpg 780w/,
  'Responsive TMDB images should expose multiple browser-selectable widths',
);

assert.equal(
  getValidatedYouTubeTrailerId('dQw4w9WgXcQ'),
  'dQw4w9WgXcQ',
  'Valid YouTube IDs should be preserved for title-specific trailers',
);
assert.equal(
  getValidatedYouTubeTrailerId('c7ynwAgQD-0'),
  '',
  'Known shared trailer placeholders must be treated as missing',
);
assert.equal(
  getValidatedYouTubeTrailerId('1105776763'),
  '',
  'Malformed or numeric trailer values must not reach the YouTube embed player',
);
assert.equal(
  getValidatedYouTubeTrailerId('  dQw4w9WgXcQ  '),
  'dQw4w9WgXcQ',
  'Trailer validation should trim catalog whitespace',
);

assert.equal(
  generateAffiliateUrl('https://amazon.com/title/example?tag=old', 'prime', {
    amazonTag: 'verified-tag',
    appleAffiliateToken: '',
    impactSubId: '',
    ebayCampId: '',
  }),
  'https://amazon.com/title/example?tag=verified-tag&linkCode=ur2',
  'Amazon links should receive the configured affiliate tag',
);
assert.equal(
  generateAffiliateUrl('javascript:alert(1)', 'prime'),
  '#',
  'Non-HTTP protocols must be rejected',
);
assert.equal(
  generateAffiliateUrl('https://netflix.com/title/example', 'netflix'),
  'https://netflix.com/title/example',
  'Unsupported providers should retain safe HTTPS URLs',
);
assert.equal(
  generateAffiliateUrl('https://amazon.com/title/example', 'prime'),
  'https://amazon.com/title/example',
  'Unconfigured providers should not receive placeholder attribution IDs',
);

const { parsePublicMonetizationConfig } = await importTypeScriptModule('src/services/monetization.ts');
const monetizationConfig = parsePublicMonetizationConfig({
  VITE_NEWSLETTER_URL: 'https://example.com/movie-picks',
  VITE_SUPPORT_URL: 'https://buy.stripe.com/test-support',
  VITE_SPONSOR_INQUIRY_URL: 'https://example.com/sponsor',
  VITE_SPONSOR_NAME: 'Test Studio',
  VITE_SPONSOR_HEADLINE: 'A disclosed test placement',
  VITE_SPONSOR_COPY: 'Sponsor copy used only by the test fixture.',
  VITE_SPONSOR_URL: 'https://example.com/campaign',
  VITE_SPONSOR_CTA: 'View campaign',
  VITE_ADSENSE_ENABLED: 'true',
  VITE_ADSENSE_CLIENT_ID: 'ca-pub-1234567890123456',
  VITE_ADSENSE_HOME_SLOT: '1234567890',
  VITE_ADSENSE_RESULTS_SLOT: '9876543210',
});
assert.equal(monetizationConfig.sponsorship?.name, 'Test Studio', 'Complete sponsor settings should render');
assert.equal(monetizationConfig.ads.enabled, true, 'Approved AdSense settings should enable ad placements');
assert.equal(monetizationConfig.supportUrl, 'https://buy.stripe.com/test-support', 'Hosted checkout URLs should be retained');

const invalidMonetizationConfig = parsePublicMonetizationConfig({
  VITE_SUPPORT_URL: 'javascript:alert(1)',
  VITE_SPONSOR_NAME: 'Incomplete sponsor',
  VITE_SPONSOR_HEADLINE: 'Missing a safe destination',
  VITE_SPONSOR_URL: 'data:text/html,bad',
  VITE_ADSENSE_ENABLED: 'true',
  VITE_ADSENSE_CLIENT_ID: 'publisher-id',
  VITE_ADSENSE_HOME_SLOT: 'slot-id',
});
assert.equal(invalidMonetizationConfig.supportUrl, '', 'Unsafe checkout URLs must be rejected');
assert.equal(invalidMonetizationConfig.sponsorship, null, 'Incomplete sponsor settings must fail closed');
assert.equal(invalidMonetizationConfig.ads.enabled, false, 'Invalid AdSense identifiers must fail closed');

const { isEditDistanceAtMostOne, smartSearchMovies } = await importTypeScriptModule('src/services/smartSearch.ts');
const fullEditDistance = (left, right) => {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    let diagonal = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const previous = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = previous;
    }
  }
  return row[right.length];
};
const binaryStrings = Array.from({ length: 7 }, (_, length) =>
  Array.from({ length: 2 ** length }, (_, value) => length === 0 ? '' : value.toString(2).padStart(length, '0')),
).flat();
for (const left of binaryStrings) {
  for (const right of binaryStrings) {
    assert.equal(
      isEditDistanceAtMostOne(left, right),
      fullEditDistance(left, right) <= 1,
      `Two-pointer typo matching must match Levenshtein <= 1 for ${left}/${right}`,
    );
  }
}
for (const [left, right, expected] of [
  ['outbrek', 'outbreak', true],
  ['spidermn', 'spiderman', true],
  ['vampir', 'vampire', true],
  ['zobmie', 'zombie', false],
  ['harry', 'potter', false],
]) {
  assert.equal(isEditDistanceAtMostOne(left, right), expected, `Typo predicate should classify ${left}/${right}`);
}
const {
  getContentWarnings,
  getDateNightPriority,
  hasVerifiedRatingAndRuntime,
  isDateNightFriendly,
  isFamilyFriendly,
  isQuickWatch,
} = await importTypeScriptModule('src/services/discovery.ts');
const {
  PLANNER_MIN_VOTES,
  buildPlannerPool,
  deduplicateMovieNightPlans,
  getMovieNightCandidates,
  getMovieNightGenres,
  getMovieNightOptionCounts,
  getMovieNightSummary,
  isPlannerEligible,
  normalizeMovieNightPlan,
  selectMovieNightMovies,
} = await importTypeScriptModule('src/services/movieNight.ts');
const searchFixture = [
  {
    id: 'fixture-zombie',
    title: 'The Last Outbreak',
    year: 1986,
    rating: 'R',
    score: 8.1,
    matchPercentage: 80,
    duration: '1h 40m',
    genre: ['Horror'],
    tags: ['#ZombieOutbreak'],
    director: 'Test Director',
    cast: ['Test Actor'],
    description: 'Survivors escape an infected city.',
    posterUrl: 'https://example.com/poster.jpg',
    backdropUrl: 'https://example.com/backdrop.jpg',
    youtubeTrailerId: 'fixture',
    streamingPlatforms: [],
  },
  {
    id: 'fixture-slasher',
    title: 'Night Caller',
    year: 1986,
    rating: 'R',
    score: 8.4,
    matchPercentage: 81,
    duration: '1h 35m',
    genre: ['Horror'],
    tags: ['#Slasher'],
    director: 'Other Director',
    cast: ['Other Actor'],
    description: 'A masked killer stalks a quiet town.',
    posterUrl: 'https://example.com/slasher.jpg',
    backdropUrl: 'https://example.com/slasher-backdrop.jpg',
    youtubeTrailerId: 'fixture-two',
    streamingPlatforms: [],
  },
];

const spiderManFixture = {
  ...searchFixture[0],
  id: 'fixture-spider-man',
  title: 'Spider-Man 2',
  year: 2004,
  genre: ['Action'],
  tags: [],
  description: 'Peter Parker struggles to balance ordinary life with his superhero responsibilities.',
};
const spiderDecoyFixture = {
  ...searchFixture[0],
  id: 'fixture-spider-decoy',
  title: 'Robot Swarm',
  year: 2011,
  genre: ['Sci-Fi'],
  tags: [],
  description: 'Tiny robot spiders escape from a laboratory.',
};

assert.equal(smartSearchMovies(searchFixture, 'undead').length, 1, 'Synonym search should find zombie titles');
assert.equal(smartSearchMovies(searchFixture, 'zombie outbreak').length, 1, 'Concept search should not return unrelated horror');
assert.equal(smartSearchMovies(searchFixture, '80s horror').length, 2, 'Decade and genre constraints should combine');
assert.equal(smartSearchMovies(searchFixture, '90s horror').length, 0, 'Decade constraints should exclude other years');
assert.equal(smartSearchMovies(searchFixture, 'outbrek').length, 1, 'One-character search typos should be tolerated');
assert.equal(smartSearchMovies(searchFixture, 'romance').length, 0, 'Unrelated searches should return no matches');
for (const query of ['spiderman', 'spider man', 'spider-man']) {
  assert.deepEqual(
    smartSearchMovies([...searchFixture, spiderManFixture, spiderDecoyFixture], query).map(({ id }) => id),
    ['fixture-spider-man'],
    `${query} should find the Spider-Man title without matching a synopsis that only mentions spiders`,
  );
}

// Browse ordering uses only fields the catalog can stand behind: reviewed first, the
// editorially flagged titles next, then a neutral A to Z. (The legacy `score` field ranks
// junk like "Parasite Challenge Double-Up WJSN" at 9.5, so it is not a popularity signal.)
// The public contact address comes from deployment config, is validated, and is never hard-coded.
const { parseContactEmail } = await importTypeScriptModule('src/services/contact.ts');
assert.equal(parseContactEmail('hello@example.com'), 'hello@example.com', 'A normal address is accepted');
assert.equal(parseContactEmail('  hello@example.com  '), 'hello@example.com', 'Whitespace is trimmed');
for (const bad of [undefined, null, '', '   ', 'not-an-email', 'a@b', 'two@@example.com', 'sp ace@example.com', 'a@example.com, b@example.com', '<script>@example.com', 'javascript:alert(1)', `${'a'.repeat(250)}@example.com`]) {
  assert.equal(parseContactEmail(bad), '', `${String(bad).slice(0, 30)} must not become a contact address`);
}

// The privacy page may only claim "no analytics" while outbound-click reporting is switched off.
const { getMeasurementStatement } = await importTypeScriptModule('src/services/privacyCopy.ts');
for (const unset of [undefined, '', '   ']) {
  assert.equal(
    getMeasurementStatement(unset),
    "We don't run our own analytics or advertising trackers.",
    'Without a click endpoint the policy may say there is no measurement',
  );
}
const withEndpoint = getMeasurementStatement(' https://example.com/clicks ');
assert.match(withEndpoint, /which provider and title you chose and when/, 'With a click endpoint the policy must say what is recorded');
assert.match(withEndpoint, /no name or account details/, 'and that the report is not tied to a person');
assert.doesNotMatch(withEndpoint, /don't run our own analytics/, 'and must not claim there is no measurement');

// TMDB facts: the rules that turn a TMDB response into a rating, runtime, vote count and trailer for a
// bundled title. Identification needs proof (the same poster, or one exact title and year); nothing is guessed.
const {
  TMDB_FACT_MAX_AGE_DAYS,
  applyTmdbFacts,
  buildFact,
  formatRuntime,
  isFactFresh,
  matchTmdbMovie,
  normalizeTitle,
  pickTrailerKey,
  pickUsCertification,
} = await importTypeScriptModule('src/services/tmdbFacts.ts');
assert.equal(TMDB_FACT_MAX_AGE_DAYS, 150, "Facts are refreshed well inside TMDB's six-month caching limit");

assert.equal(normalizeTitle('Alien: Romulus'), 'alien romulus');
assert.equal(normalizeTitle('Amélie'), 'amelie', 'Accents are ignored');
assert.equal(normalizeTitle('Tom & Jerry'), 'tom and jerry');
assert.equal(normalizeTitle('  Mad   Max: Fury Road! '), 'mad max fury road');
assert.equal(normalizeTitle('千と千尋'), '', 'A title with no Latin letters normalizes to nothing, so it can never match by title');

const zombieland = { id: 'zombieland-2009', title: 'Zombieland', year: 2009, posterPath: 'dUkJ1.jpg' };
assert.deepEqual(
  matchTmdbMovie(zombieland, [
    { id: 2, title: 'Zombieland', release_date: '2009-10-02', poster_path: '/other.jpg' },
    { id: 1, title: 'Zombieland: The Extended Cut', release_date: '2009-10-02', poster_path: '/dUkJ1.jpg' },
  ]),
  { tmdbId: 1, proof: 'poster' },
  'The same poster is proof, even against a rival with the same title and year',
);
assert.deepEqual(
  matchTmdbMovie(zombieland, [{ id: 3, title: 'Zombieland', release_date: '2009-10-02', poster_path: '/new-poster.jpg' }]),
  { tmdbId: 3, proof: 'title-year' },
  'A poster that changed since the catalog was built falls back to one exact title and year',
);
assert.equal(matchTmdbMovie(zombieland, [
  { id: 4, title: 'Zombieland', release_date: '2009-10-02', poster_path: '/a.jpg' },
  { id: 5, title: 'Zombieland', release_date: '2009-03-01', poster_path: '/b.jpg' },
]), null, 'Two candidates with the same title and year are ambiguous, so nothing is guessed');
assert.equal(matchTmdbMovie(zombieland, [{ id: 6, title: 'Zombieland', release_date: '2010-10-02', poster_path: '/a.jpg' }]), null, 'A title match needs the same year');
assert.equal(matchTmdbMovie(zombieland, [{ id: 7, title: 'Zombieland', release_date: '2011-10-02', poster_path: '/dUkJ1.jpg' }]), null, 'A poster match two years from the catalog year is suspicious');
assert.deepEqual(
  matchTmdbMovie(zombieland, [{ id: 8, title: 'Zombieland', release_date: '2010-01-01', poster_path: '/dUkJ1.jpg' }]),
  { tmdbId: 8, proof: 'poster' },
  'A one-year difference (festival versus release) is allowed with a poster match',
);
assert.equal(matchTmdbMovie(zombieland, [
  { id: 9, title: 'Zombieland', release_date: '2009-01-01', poster_path: '/dUkJ1.jpg' },
  { id: 10, title: 'Other', release_date: '2009-01-01', poster_path: '/dUkJ1.jpg' },
]), null, 'Two candidates sharing the poster are ambiguous, even when one of them also matches by title');
assert.deepEqual(
  matchTmdbMovie(
    { id: 'let-the-right-one-in-2008', title: 'Låt den rätte komma in', year: 2008, posterPath: 'x.jpg' },
    [{ id: 11, title: 'Let the Right One In', original_title: 'Låt den rätte komma in', release_date: '2008-10-24', poster_path: '/y.jpg' }],
  ),
  { tmdbId: 11, proof: 'title-year' },
  'The original title counts',
);
assert.equal(
  matchTmdbMovie({ id: 'x-2020', title: '千と千尋', year: 2020, posterPath: 'p.jpg' }, [{ id: 12, title: '千尋', release_date: '2020-01-01', poster_path: '/q.jpg' }]),
  null,
  'A title with no Latin letters is never matched by title',
);
assert.equal(matchTmdbMovie(zombieland, []), null, 'No candidates means no match');

const certificationDetails = (entries, region = 'US') => ({
  id: 1,
  release_dates: {
    results: [
      { iso_3166_1: 'GB', release_dates: [{ certification: '18', type: 3 }] },
      { iso_3166_1: region, release_dates: entries },
    ],
  },
});
assert.equal(pickUsCertification(certificationDetails([{ certification: '', type: 1 }, { certification: 'PG-13', type: 3 }])), 'PG-13');
assert.equal(pickUsCertification(certificationDetails([{ certification: 'NR', type: 1 }, { certification: 'R', type: 3 }])), 'R', 'A festival premiere must not outrank the theatrical release');
assert.equal(pickUsCertification(certificationDetails([{ certification: 'R', type: 4 }, { certification: 'PG', type: 2 }])), 'PG', 'Limited theatrical outranks digital');
assert.equal(pickUsCertification(certificationDetails([{ certification: 'NR', type: 3 }])), 'NOT RATED');
assert.equal(pickUsCertification(certificationDetails([{ certification: 'Unrated', type: 4 }])), 'NOT RATED');
assert.equal(pickUsCertification(certificationDetails([{ certification: 'TV-MA', type: 6 }])), 'TV-MA');
assert.equal(pickUsCertification(certificationDetails([{ certification: '18+', type: 3 }])), '', 'An unrecognized label is not a certification');
assert.equal(pickUsCertification(certificationDetails([{ certification: 'X', type: 3 }, { certification: 'R', type: 4 }])), 'R', 'An unrecognized label is skipped, not trusted');
assert.equal(pickUsCertification(certificationDetails([{ certification: 'pg-13', type: 3 }])), 'PG-13', 'Case is normalized');
assert.equal(pickUsCertification(certificationDetails([{ certification: 'R', type: 3 }], 'FR')), '', 'Only the US certification counts');
assert.equal(pickUsCertification({ id: 1 }), '', 'No release dates means no certification');

const youtubeKey = (letter) => letter.repeat(11);
const trailerVideo = (overrides = {}) => ({
  key: youtubeKey('a'), site: 'YouTube', type: 'Trailer', official: true, name: 'Official Trailer', iso_639_1: 'en', published_at: '2020-01-01T00:00:00.000Z', ...overrides,
});
const withVideos = (...videos) => ({ id: 1, videos: { results: videos } });
assert.equal(pickTrailerKey(withVideos(trailerVideo({ key: youtubeKey('b'), official: false }))), '', 'An unofficial upload is never used');
assert.equal(
  pickTrailerKey(withVideos(trailerVideo({ type: 'Teaser' }), trailerVideo({ site: 'Vimeo' }), trailerVideo({ key: 'short' }), trailerVideo({ type: 'Clip' }))),
  '',
  'Only an official YouTube trailer with a well-formed key counts',
);
assert.equal(pickTrailerKey(withVideos(trailerVideo({ key: youtubeKey('b'), iso_639_1: 'fr' }), trailerVideo({ key: youtubeKey('c') }))), youtubeKey('c'), 'English comes first');
assert.equal(
  pickTrailerKey(withVideos(trailerVideo({ key: youtubeKey('d'), name: 'Final Trailer' }), trailerVideo({ key: youtubeKey('e'), name: 'Official Trailer' }))),
  youtubeKey('e'),
  'A name containing Official Trailer comes next',
);
assert.equal(
  pickTrailerKey(withVideos(trailerVideo({ key: youtubeKey('f'), published_at: '2021-05-01T00:00:00.000Z' }), trailerVideo({ key: youtubeKey('g'), published_at: '2020-05-01T00:00:00.000Z' }))),
  youtubeKey('g'),
  'Then the earliest published',
);
assert.equal(pickTrailerKey({ id: 1 }), '', 'No videos means no trailer');

assert.equal(formatRuntime(164), '2h 44m');
assert.equal(formatRuntime(120), '2h 0m');
assert.equal(formatRuntime(60), '1h 0m');
assert.equal(formatRuntime(88), '1h 28m');
assert.equal(formatRuntime(59), '59m');

const tmdbDetails = (overrides = {}) => ({
  id: 7,
  release_date: '2009-10-02',
  runtime: 88,
  status: 'Released',
  vote_count: 8123,
  release_dates: { results: [{ iso_3166_1: 'US', release_dates: [{ certification: 'R', type: 3 }] }] },
  videos: { results: [trailerVideo({ key: youtubeKey('z') })] },
  ...overrides,
});
const matchedByPoster = { tmdbId: 7, proof: 'poster' };
assert.deepEqual(
  buildFact(zombieland, matchedByPoster, tmdbDetails(), '2026-10-02'),
  { ok: true, fact: [7, 'R', 88, 8123, youtubeKey('z'), 'poster', '2026-10-02'] },
);
const factOutcome = (overrides) => {
  const result = buildFact(zombieland, matchedByPoster, tmdbDetails(overrides), '2026-10-02');
  return result.ok ? 'ok' : result.reason;
};
assert.equal(factOutcome({ status: 'Post Production' }), 'not-released');
assert.equal(factOutcome({ runtime: 0 }), 'no-runtime');
assert.equal(factOutcome({ runtime: null }), 'no-runtime');
assert.equal(factOutcome({ runtime: undefined }), 'no-runtime');
assert.equal(factOutcome({ runtime: 12 }), 'runtime-out-of-range', 'A short is not a runtime to filter on');
assert.equal(factOutcome({ runtime: 500 }), 'runtime-out-of-range');
assert.equal(factOutcome({ release_dates: { results: [] } }), 'no-certification');
assert.equal(factOutcome({ release_date: '2012-01-01' }), 'year-mismatch');
assert.equal(factOutcome({ release_date: '2010-01-01' }), 'ok', 'A one-year difference is allowed');
const bareFact = buildFact(zombieland, matchedByPoster, tmdbDetails({ vote_count: undefined, videos: undefined }), '2026-10-02');
assert.deepEqual(bareFact.ok && bareFact.fact.slice(3, 5), [0, ''], 'Missing votes and trailers become 0 and an empty key');

const factsNow = new Date('2026-10-01T12:00:00Z');
assert.equal(isFactFresh('2026-10-01', factsNow), true);
assert.equal(isFactFresh('2026-05-05', factsNow), true, '149.5 days old is still fresh');
assert.equal(isFactFresh('2026-05-04', factsNow), false, '150.5 days old has to be refreshed');
assert.equal(isFactFresh('2026-10-02', factsNow), false, 'A date in the future is not trusted');
assert.equal(isFactFresh('soon', factsNow), false, 'An unreadable date is not fresh');
assert.equal(isFactFresh('2026-09-01', factsNow, 10), false, 'The limit can be tightened');

const acceptAnyTrailer = (value) => (/^[A-Za-z0-9_-]{11}$/.test(value) && value !== 'c7ynwAgQD-0' ? value : '');
const placeholderRow = { id: 'a-2009', rating: 'R', duration: '1h 45m', youtubeTrailerId: 'c7ynwAgQD-0' };
const appliedFacts = { 'a-2009': [7, 'PG-13', 88, 8123, youtubeKey('z'), 'poster', '2026-10-02'] };
const applyOptions = { skipIds: new Set(), validTrailerId: acceptAnyTrailer };
assert.deepEqual(applyTmdbFacts([placeholderRow], appliedFacts, applyOptions), [{
  id: 'a-2009', rating: 'PG-13', duration: '1h 28m', youtubeTrailerId: youtubeKey('z'), recordSource: 'tmdb-checked', ratingSource: 'TMDB', voteCount: 8123, trailerVerified: true,
}]);
// A trailer is "verified" when it is TMDB's official trailer: filled from TMDB, or identical to the catalog's own id.
assert.equal(
  applyTmdbFacts([{ ...placeholderRow, youtubeTrailerId: youtubeKey('z') }], appliedFacts, applyOptions)[0].trailerVerified,
  true,
  "A bundled trailer identical to TMDB's official one is verified",
);
assert.equal(
  'trailerVerified' in applyTmdbFacts([{ ...placeholderRow, youtubeTrailerId: youtubeKey('e') }], appliedFacts, applyOptions)[0],
  false,
  "A bundled trailer that differs from TMDB's is kept, but it is not verified",
);
assert.equal(
  'trailerVerified' in applyTmdbFacts([placeholderRow], { 'a-2009': [7, 'PG-13', 88, 0, '', 'poster', '2026-10-02'] }, applyOptions)[0],
  false,
  'With no TMDB trailer nothing is verified',
);
assert.equal(
  applyTmdbFacts([{ ...placeholderRow, youtubeTrailerId: youtubeKey('e') }], appliedFacts, applyOptions)[0].youtubeTrailerId,
  youtubeKey('e'),
  'A usable trailer already in the catalog is never replaced',
);
const noVotesNoTrailer = { 'a-2009': [7, 'PG-13', 88, 0, '', 'poster', '2026-10-02'] };
assert.equal(applyTmdbFacts([placeholderRow], noVotesNoTrailer, applyOptions)[0].youtubeTrailerId, 'c7ynwAgQD-0', 'With no TMDB trailer the row is left as it was (the packer drops placeholders)');
assert.equal('voteCount' in applyTmdbFacts([placeholderRow], noVotesNoTrailer, applyOptions)[0], false, 'A zero vote count is not stored');
assert.equal(applyTmdbFacts([placeholderRow], appliedFacts, { ...applyOptions, skipIds: new Set(['a-2009']) })[0], placeholderRow, 'A reviewed title never receives fetched facts');
const factless = { id: 'b-2010', rating: 'R', duration: '1h 45m', youtubeTrailerId: '' };
assert.equal(applyTmdbFacts([factless], appliedFacts, applyOptions)[0], factless, 'A title without a fact comes back as it was');
const factInput = [{ ...placeholderRow }];
applyTmdbFacts(factInput, appliedFacts, applyOptions);
assert.equal(factInput[0].rating, 'R', 'The input rows are not mutated');
assert.equal(
  applyTmdbFacts([{ id: 'constructor', rating: 'R', duration: '1h 45m', youtubeTrailerId: '' }], appliedFacts, applyOptions)[0].rating,
  'R',
  'Inherited object properties are not facts',
);

// Anonymous visitors should not download the auth SDK just to learn they are signed out.
// It is needed only for a stored session or an auth redirect (email confirmation, recovery).
const { mayHaveSupabaseSession } = await importTypeScriptModule('src/lib/authHint.ts');
const fakeStorage = (keys) => ({ length: keys.length, key: (index) => keys[index] ?? null });
const noLocation = { hash: '', search: '' };
assert.equal(mayHaveSupabaseSession(fakeStorage([]), noLocation), false, 'A first-time visitor has no session');
assert.equal(mayHaveSupabaseSession(fakeStorage(['streamflicker_watchlist_v2', 'streamflicker_my_services']), noLocation), false, 'App storage keys are not a session');
assert.equal(mayHaveSupabaseSession(fakeStorage(['sb-abcdefghij-auth-token']), noLocation), true, 'A stored Supabase session needs the SDK');
assert.equal(mayHaveSupabaseSession(fakeStorage(['sb-abcdefghij-auth-token.0']), noLocation), true, 'A chunked Supabase session needs the SDK');
assert.equal(mayHaveSupabaseSession(fakeStorage(['sb-abcdefghij-auth-token-code-verifier']), noLocation), true, 'A pending PKCE exchange needs the SDK');
assert.equal(mayHaveSupabaseSession(fakeStorage([]), { hash: '#access_token=abc&type=recovery', search: '' }), true, 'An email-link redirect needs the SDK');
assert.equal(mayHaveSupabaseSession(fakeStorage([]), { hash: '#error=access_denied&error_description=expired', search: '' }), true, 'An auth error redirect needs the SDK to clear it');
assert.equal(mayHaveSupabaseSession(fakeStorage([]), { hash: '', search: '?code=pkce-code' }), true, 'A PKCE callback needs the SDK');
assert.equal(mayHaveSupabaseSession(fakeStorage([]), { hash: '', search: '?q=zombie&movie=inception-2010&utm_source=x' }), false, 'App query parameters are not an auth callback');
assert.equal(mayHaveSupabaseSession({ get length() { throw new Error('storage blocked'); }, key: () => null }, noLocation), false, 'Blocked storage means no session');

const { SORT_OPTIONS, countBrowsable, isKnownUnreleased, sortMovies } = await importTypeScriptModule('src/services/browseOrder.ts');
assert.deepEqual(SORT_OPTIONS.map(({ id }) => id), ['featured', 'newest', 'oldest', 'title']);
const browseFixture = [
  { id: 'obscure-z', title: 'Zebra Crossing', year: 2020 },
  { id: 'reviewed-second', title: 'Second Reviewed', year: 2014 },
  { id: 'flagged', title: 'Big Franchise Film', year: 2025, trending: true },
  { id: 'obscure-a', title: 'Alpha Short', year: 2022 },
  { id: 'reviewed-first', title: 'First Reviewed', year: 2010 },
];
const reviewedRank = (id) => ({ 'reviewed-first': 1, 'reviewed-second': 2 })[id];
assert.deepEqual(
  sortMovies(browseFixture, 'featured', reviewedRank).map(({ id }) => id),
  ['reviewed-first', 'reviewed-second', 'flagged', 'obscure-a', 'obscure-z'],
  'Featured shows reviewed titles by curation rank, then flagged titles, then A to Z',
);
assert.deepEqual(sortMovies(browseFixture, 'newest', reviewedRank).map(({ id }) => id), ['flagged', 'obscure-a', 'obscure-z', 'reviewed-second', 'reviewed-first']);
assert.deepEqual(sortMovies(browseFixture, 'oldest', reviewedRank).map(({ id }) => id), ['reviewed-first', 'reviewed-second', 'obscure-z', 'obscure-a', 'flagged']);
assert.deepEqual(sortMovies(browseFixture, 'title', reviewedRank).map(({ id }) => id), ['obscure-a', 'flagged', 'reviewed-first', 'reviewed-second', 'obscure-z']);
assert.equal(browseFixture[0].id, 'obscure-z', 'Sorting must not mutate the caller\'s array');
const sortNow = new Date('2026-10-01T12:00:00Z');
assert.equal(isKnownUnreleased({ year: 2027 }, sortNow), true, 'A future year is unreleased');
assert.equal(isKnownUnreleased({ year: 2026 }, sortNow), false, 'A current-year title with no release date cannot be called unreleased');
assert.equal(isKnownUnreleased({ year: 2026, releaseDate: '2026-12-18' }, sortNow), true, 'A future release date is unreleased');
assert.equal(isKnownUnreleased({ year: 2026, releaseDate: '2026-09-01' }, sortNow), false, 'A past release date is released');
assert.equal(isKnownUnreleased({ year: 2026, releaseDate: 'soon' }, sortNow), false, 'An unreadable release date is not evidence');
// The "Browse all" count must be what browsing actually lists, so it applies the same rule.
assert.equal(
  countBrowsable([{ year: 2020 }, { year: 2027 }, { year: 2026, releaseDate: '2026-12-18' }, { year: 2026 }, { year: 2026, releaseDate: '2026-09-01' }], sortNow),
  3,
  'Browse counts leave out exactly the titles browsing hides',
);
assert.equal(countBrowsable([], sortNow), 0, 'An empty catalog has nothing to browse');
// After the reviewed titles, Featured leads with what TMDB's votes say people know; the editorial flag and A to Z
// only break ties between titles with no votes.
const popularityFixture = [
  { id: 'unvoted', title: 'Aardvark', year: 2020 },
  { id: 'few-votes', title: 'Beta', year: 2020, voteCount: 40 },
  { id: 'many-votes', title: 'Zeta', year: 2020, voteCount: 90000 },
  { id: 'flagged', title: 'Gamma', year: 2025, trending: true },
  { id: 'reviewed', title: 'Omega', year: 2010 },
];
assert.deepEqual(
  sortMovies(popularityFixture, 'featured', (id) => (id === 'reviewed' ? 1 : undefined)).map(({ id }) => id),
  ['reviewed', 'many-votes', 'few-votes', 'flagged', 'unvoted'],
  'Featured: reviewed first, then by TMDB vote count, then the editorial flag, then A to Z',
);
assert.deepEqual(
  sortMovies(popularityFixture, 'title', () => undefined).map(({ id }) => id),
  ['unvoted', 'few-votes', 'flagged', 'reviewed', 'many-votes'],
  'Votes only affect Featured; A to Z stays A to Z',
);

const {
  isStrongCollectionMatch,
  mergeLiveAndLocalMovies,
  mergeLiveMoviePages,
  mergeTMDBMovieCandidates,
  normalizeMovieSearchQuery,
  selectStrongCollections,
} = await importTypeScriptModule('src/services/searchCatalog.ts');

const harryPotterTitles = [
  ['Harry Potter and the Philosopher\'s Stone', 2001],
  ['Harry Potter and the Chamber of Secrets', 2002],
  ['Harry Potter and the Prisoner of Azkaban', 2004],
  ['Harry Potter and the Goblet of Fire', 2005],
  ['Harry Potter and the Order of the Phoenix', 2007],
  ['Harry Potter and the Half-Blood Prince', 2009],
  ['Harry Potter and the Deathly Hallows: Part 1', 2010],
  ['Harry Potter and the Deathly Hallows: Part 2', 2011],
].map(([title, year], index) => ({
  ...searchFixture[0],
  id: `fixture-harry-potter-${index + 1}`,
  title,
  year,
  genre: ['Fantasy'],
  tags: [],
  description: 'A chapter in the wizarding film series.',
  collectionId: 1241,
  collectionName: 'Harry Potter Collection',
  collectionPartPosition: index + 1,
  collectionPartCount: 8,
  searchAliases: ['Harry Potter Collection', 'Harry Potter'],
  score: index === 7 ? 10 : 5 + index / 10,
}));
const harryPotterDecoy = {
  ...searchFixture[0],
  id: 'fixture-harry-potter-decoy',
  title: 'Clay Dreams',
  year: 2018,
  description: 'A character named Harry trains as a potter in a small village.',
  genre: ['Drama'],
  tags: [],
};

for (const query of ['harry potter', 'harrypotter', 'harry potter movies', 'harry potter films', 'harry potter franchise']) {
  const franchiseMatches = smartSearchMovies([...harryPotterTitles, harryPotterDecoy], query);
  assert.equal(franchiseMatches.length, 8, `${query} should return all eight collection films`);
  assert.ok(
    franchiseMatches.every(({ id }) => id.startsWith('fixture-harry-potter-') && id !== harryPotterDecoy.id),
    `${query} should not include a synopsis-only decoy`,
  );
  assert.deepEqual(
    franchiseMatches.map(({ collectionPartPosition }) => collectionPartPosition),
    [1, 2, 3, 4, 5, 6, 7, 8],
    `${query} should keep the franchise in release order instead of re-sorting by rating`,
  );
}

const harryPotterRetrospective = {
  ...harryPotterTitles[0],
  id: 'fixture-harry-potter-retrospective',
  title: 'Harry Potter: A Retrospective',
  score: 99,
  collectionId: undefined,
  collectionName: undefined,
  collectionPartPosition: undefined,
  collectionPartCount: undefined,
  searchAliases: undefined,
};
assert.deepEqual(
  smartSearchMovies([
    harryPotterTitles[1],
    harryPotterRetrospective,
    harryPotterTitles[0],
  ], 'harry potter').map(({ id }) => id),
  [
    'fixture-harry-potter-retrospective',
    'fixture-harry-potter-1',
    'fixture-harry-potter-2',
  ],
  'A highly relevant ordinary result must retain its rank while matching franchise parts keep collection order',
);

const ordinaryRelevanceFixture = [
  {
    ...searchFixture[0],
    id: 'fixture-academy-exact',
    title: 'Academy',
    score: 1,
    genre: ['Drama'],
    tags: [],
  },
  {
    ...searchFixture[0],
    id: 'fixture-academy-genre',
    title: 'Lessons Learned',
    score: 60,
    genre: ['Academy'],
    tags: [],
  },
  {
    ...searchFixture[0],
    id: 'fixture-academy-tag-tie',
    title: 'Campus Story',
    score: 62,
    genre: ['Drama'],
    tags: ['#Academy'],
  },
  {
    ...searchFixture[0],
    id: 'fixture-academy-title-tie',
    title: 'Summer Academy',
    score: 20,
    genre: ['Drama'],
    tags: [],
  },
];
assert.deepEqual(
  smartSearchMovies(ordinaryRelevanceFixture, 'academy').map(({ id }) => id),
  [
    'fixture-academy-exact',
    'fixture-academy-genre',
    'fixture-academy-tag-tie',
    'fixture-academy-title-tie',
  ],
  'Ordinary relevance ranking must preserve score ordering and stable input order for equal scores',
);

assert.equal(
  normalizeMovieSearchQuery('harrypotter movies'),
  'harry potter',
  'Fused franchise aliases and plural suffixes should normalize before live search',
);
assert.equal(
  normalizeMovieSearchQuery('Scary Movie'),
  'scary movie',
  'Singular movie words that belong to a real title must be preserved',
);
assert.equal(
  isStrongCollectionMatch('spider man', 'The Amazing Spider-Man Collection'),
  true,
  'A short descriptive prefix should not hide a closely related franchise collection',
);
assert.equal(
  isStrongCollectionMatch('spider man', 'Spider Collection'),
  false,
  'A collection missing a required franchise token must not be expanded',
);
assert.deepEqual(
  selectStrongCollections('spider man', [
    { id: 2, name: 'The Amazing Spider-Man Collection' },
    { id: 1, name: 'Spider-Man Collection' },
    { id: 3, name: 'Spider Collection' },
    { id: 4, name: 'LEGO Star Wars Collection' },
  ]).map(({ id }) => id),
  [1, 2],
  'Only strongly matching collections should be selected, with the exact collection first',
);

const mergedCollectionCandidates = mergeTMDBMovieCandidates(
  [{ id: 102, title: 'Harry Potter Two', release_date: '2002-11-15', overview: 'Fresh direct result.' }],
  [{
    id: 1241,
    name: 'Harry Potter Collection',
    partCount: 2,
    parts: [
      { id: 102, title: 'Harry Potter Two', release_date: '2002-11-15' },
      { id: 101, title: 'Harry Potter One', release_date: '2001-11-16' },
      { id: 999, title: 'Adult decoy', release_date: '2000-01-01', adult: true },
    ],
  }],
  60,
);
assert.deepEqual(
  mergedCollectionCandidates.map(({ id }) => id),
  [101, 102],
  'Collection parts should be release ordered, adult-filtered, and deduplicated against direct hits',
);
assert.equal(mergedCollectionCandidates[1].overview, 'Fresh direct result.', 'Direct TMDB data should refresh a duplicate collection part');
assert.equal(mergedCollectionCandidates[1].collectionPartPosition, 2, 'Collection position metadata should survive deduplication');
assert.ok(
  mergedCollectionCandidates[1].searchAliases.some((alias) => alias.toLowerCase() === 'harry potter'),
  'Collection aliases should remain searchable',
);

const liveUnverified = {
  ...searchFixture[0],
  id: 'tmdb-557',
  title: 'Spider-Man',
  year: 2002,
  availability: { status: 'unavailable', source: 'tmdb' },
};
const liveVerified = {
  ...liveUnverified,
  availability: { status: 'verified', source: 'tmdb' },
};
const mergedLivePages = mergeLiveMoviePages([liveUnverified], [liveVerified]);
assert.equal(mergedLivePages[0].availability.status, 'verified', 'A refreshed verified live record should win during page merging');
const mergedLiveAndLocal = mergeLiveAndLocalMovies(mergedLivePages, [
  { ...searchFixture[0], id: 'bundled-spider-man', title: 'Spider Man', year: 2002 },
  { ...searchFixture[0], id: 'bundled-unique', title: 'A Different Movie', year: 2002 },
]);
assert.deepEqual(
  mergedLiveAndLocal.map(({ id }) => id),
  ['tmdb-557', 'bundled-unique'],
  'Punctuation-insensitive title/year deduplication should keep authoritative live data and unique local titles',
);

const { default: tmdbSearchHandler } = await importTypeScriptModule('api/tmdb-search.ts');
const originalFetch = globalThis.fetch;
const originalTMDBToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
const originalTMDBKey = process.env.TMDB_API_KEY;
try {
  delete process.env.TMDB_API_READ_ACCESS_TOKEN;
  delete process.env.TMDB_API_KEY;
  const unconfiguredResponse = await tmdbSearchHandler.fetch(new Request(
    'https://streamflicker.vercel.app/api/tmdb-search?query=harry%20potter&region=US&page=1',
  ));
  assert.equal(unconfiguredResponse.status, 503, 'The server endpoint must fail closed when no TMDB credential is configured');
  const unconfiguredPayload = await unconfiguredResponse.json();
  assert.equal(unconfiguredPayload.configured, false, 'The no-credential response should explicitly identify configuration state');

  process.env.TMDB_API_KEY = 'unit-test-key';
  const requestedTMDBUrls = [];
  globalThis.fetch = async (input) => {
    const requestUrl = new URL(input instanceof Request ? input.url : String(input));
    requestedTMDBUrls.push(requestUrl);
    let body;
    if (requestUrl.pathname.endsWith('/search/movie')) {
      body = {
        page: 1,
        total_pages: 2,
        total_results: 21,
        results: [{
          id: 102,
          title: 'Harry Potter Two',
          release_date: '2002-11-15',
          overview: 'Fresh direct search copy.',
          adult: false,
        }],
      };
    } else if (requestUrl.pathname.endsWith('/search/collection')) {
      body = { results: [{ id: 1241, name: 'Harry Potter Collection', adult: false }] };
    } else if (requestUrl.pathname.endsWith('/collection/1241')) {
      body = {
        id: 1241,
        name: 'Harry Potter Collection',
        parts: [
          { id: 102, title: 'Harry Potter Two', release_date: '2002-11-15', adult: false },
          { id: 101, title: 'Harry Potter One', release_date: '2001-11-16', adult: false },
        ],
      };
    } else if (/\/movie\/(101|102)$/.test(requestUrl.pathname)) {
      const id = Number(requestUrl.pathname.split('/').pop());
      body = {
        id,
        title: id === 101 ? 'Harry Potter One' : 'Harry Potter Two',
        release_date: id === 101 ? '2001-11-16' : '2002-11-15',
        runtime: 120,
        genres: [{ id: 14, name: 'Fantasy' }],
        credits: { crew: [], cast: [] },
        videos: { results: [] },
        release_dates: { results: [] },
        'watch/providers': { results: {} },
      };
    } else {
      return new Response(JSON.stringify({ error: `Unexpected test URL ${requestUrl.pathname}` }), { status: 404 });
    }
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const expandedResponse = await tmdbSearchHandler.fetch(new Request(
    'https://streamflicker.vercel.app/api/tmdb-search?query=harrypotter%20movies&region=US&page=1',
    { headers: { Origin: 'capacitor://localhost' } },
  ));
  assert.equal(expandedResponse.status, 200, 'A configured franchise search should succeed');
  assert.equal(
    expandedResponse.headers.get('Access-Control-Allow-Origin'),
    'capacitor://localhost',
    'The public search endpoint should allow the native Capacitor origin',
  );
  const expandedPayload = await expandedResponse.json();
  assert.equal(expandedPayload.schemaVersion, 2, 'The server should return the versioned live-search contract');
  assert.equal(expandedPayload.normalizedQuery, 'harry potter', 'The server should normalize fused franchise queries');
  assert.deepEqual(
    expandedPayload.results.map(({ item }) => item.id),
    [101, 102],
    'The endpoint should return the whole matching collection in release order without a direct-result duplicate',
  );
  assert.equal(expandedPayload.results[1].item.overview, 'Fresh direct search copy.', 'Direct search metadata should refresh its collection duplicate');
  assert.equal(expandedPayload.expandedCollections[0].partCount, 2, 'Expanded collection metadata should report the part count');
  assert.deepEqual(
    expandedPayload.pagination,
    { page: 1, pageSize: 20, totalPages: 2, totalResults: 21, hasMore: true },
    'The endpoint should preserve honest direct-search pagination alongside franchise expansion',
  );
  assert.ok(
    requestedTMDBUrls.some((url) => url.pathname.endsWith('/search/movie') && url.searchParams.get('query') === 'harry potter'),
    'The normalized base franchise query should be sent to TMDB',
  );
} finally {
  globalThis.fetch = originalFetch;
  if (originalTMDBToken === undefined) delete process.env.TMDB_API_READ_ACCESS_TOKEN;
  else process.env.TMDB_API_READ_ACCESS_TOKEN = originalTMDBToken;
  if (originalTMDBKey === undefined) delete process.env.TMDB_API_KEY;
  else process.env.TMDB_API_KEY = originalTMDBKey;
}

const {
  formatTMDBMovie,
  mapTMDBWatchProviders,
  normalizeTMDBSearchQuery,
  parseTMDBPagination,
  sanitizeTMDBSearchOrigin,
} = await importTypeScriptModule('src/services/tmdbApi.ts');
assert.equal(normalizeTMDBSearchQuery('spiderman'), 'spider man', 'Live search should expand a fused Spider-Man query');
assert.equal(normalizeTMDBSearchQuery('Spider-Man'), 'spider man', 'Punctuation should be normalized for live search');
assert.equal(normalizeTMDBSearchQuery('harrypotter movies'), 'harry potter', 'Live search should remove a plural franchise suffix');
assert.equal(sanitizeTMDBSearchOrigin('javascript:alert(1)'), '', 'Unsafe live-search origin schemes must be rejected');
assert.equal(sanitizeTMDBSearchOrigin('http://example.com'), '', 'Insecure non-local live-search origins must be rejected');
assert.equal(sanitizeTMDBSearchOrigin('http://localhost:4173/path'), 'http://localhost:4173', 'Local HTTP development origins may be used');
assert.deepEqual(
  parseTMDBPagination({ page: 2, pageSize: 20, totalPages: 4, totalResults: 67, hasMore: true }),
  { page: 2, pageSize: 20, totalPages: 4, totalResults: 67, hasMore: true },
  'Versioned TMDB pagination metadata should be preserved',
);

const availabilityCheckedAt = '2026-08-16T12:00:00.000Z';
const mappedProviders = mapTMDBWatchProviders({
  link: 'https://www.themoviedb.org/movie/557/watch',
  flatrate: [{ provider_id: 8, provider_name: 'Netflix' }],
  ads: [{ provider_id: 73, provider_name: 'Tubi TV' }],
  free: [{ provider_id: 73, provider_name: 'Tubi TV' }],
  rent: [{ provider_id: 2, provider_name: 'Apple TV' }],
}, 'US', availabilityCheckedAt);
assert.equal(mappedProviders.length, 3, 'Duplicate provider offers of the same type should be collapsed');
assert.ok(
  mappedProviders.some(({ id, type }) => id === 'netflix' && type === 'subscription'),
  'TMDB flatrate should map to a verified subscription provider',
);
assert.ok(
  mappedProviders.every(({ availabilityStatus, region }) => availabilityStatus === 'verified' && region === 'US'),
  'Mapped provider records should carry verification and region metadata',
);

const liveSpiderMan = formatTMDBMovie(
  {
    id: 557,
    title: 'Spider-Man',
    release_date: '2002-05-03',
    vote_average: 7.3,
    popularity: 80,
    overview: 'A student becomes a web-slinging hero.',
    genre_ids: [28, 878],
  },
  {
    id: 557,
    title: 'Spider-Man',
    release_date: '2002-05-03',
    vote_average: 7.3,
    popularity: 80,
    overview: 'A student becomes a web-slinging hero.',
    runtime: 121,
    genres: [{ id: 28, name: 'Action' }, { id: 878, name: 'Sci-Fi' }],
    credits: {
      crew: [{ job: 'Director', name: 'Sam Raimi' }],
      cast: [{ name: 'Tobey Maguire', order: 0 }],
    },
    videos: {
      results: [{ key: 'official-trailer', site: 'YouTube', type: 'Trailer', official: true }],
    },
    release_dates: {
      results: [{ iso_3166_1: 'US', release_dates: [{ certification: 'PG-13', type: 3 }] }],
    },
    'watch/providers': {
      results: {
        US: {
          link: 'https://www.themoviedb.org/movie/557/watch',
          flatrate: [{ provider_id: 8, provider_name: 'Netflix' }],
        },
      },
    },
  },
  'US',
  availabilityCheckedAt,
);
assert.equal(liveSpiderMan.availability.status, 'verified', 'A regional provider response should be marked verified');
assert.equal(liveSpiderMan.youtubeTrailerId, 'official-trailer', 'Live results should use the returned official trailer');
assert.equal(liveSpiderMan.rating, 'PG-13', 'Live results should use the regional certification');
assert.equal(liveSpiderMan.availability.checkedAt, availabilityCheckedAt, 'Provider freshness should use the server check timestamp');

const missingRegionMovie = formatTMDBMovie(
  { id: 558, title: 'Spider-Man 2', release_date: '2004-06-30' },
  {
    id: 558,
    title: 'Spider-Man 2',
    release_date: '2004-06-30',
    'watch/providers': { results: { GB: { link: 'https://www.themoviedb.org/movie/558/watch' } } },
  },
  'US',
  availabilityCheckedAt,
);
assert.equal(missingRegionMovie.availability.status, 'not-found', 'Missing regional data must not become guessed availability');
assert.equal(missingRegionMovie.streamingPlatforms.length, 0, 'Missing regional data should produce no provider badges');
assert.equal(missingRegionMovie.youtubeTrailerId, '', 'Missing trailer data must not use a shared fallback trailer');

// Fixtures stand in for records whose rating and runtime came from TMDB (reviewed
// bundled titles or live results). Unreviewed bundled rows carry placeholders.
const familySafeFixture = {
  ...searchFixture[0],
  id: 'fixture-family-safe',
  recordSource: 'bundled-validated',
  title: 'A Warm Family Adventure',
  rating: 'PG-13',
  genre: ['Action', 'Drama'],
  tags: [],
  duration: '1h 40m',
  description: 'A couple and their family work together to find a hopeful new home.',
};
assert.equal(isFamilyFriendly(searchFixture[0]), false, 'R-rated horror should not be family-friendly');
assert.equal(isFamilyFriendly(familySafeFixture), true, 'Low-risk PG-13 drama should be family-friendly');
assert.equal(isDateNightFriendly(familySafeFixture), true, 'Relationship-driven drama should fit date night');
assert.equal(isQuickWatch(familySafeFixture), true, 'Movies at or below 110 minutes should fit quick-watch mode');

// ~90% of the bundled catalog has the same "1h 45m" and 92% is tagged "R": placeholders.
// A filter may only lean on a field that is real.
assert.equal(hasVerifiedRatingAndRuntime(familySafeFixture), true, 'Reviewed bundled titles carry TMDB-verified facts');
assert.equal(hasVerifiedRatingAndRuntime({ ...familySafeFixture, recordSource: 'tmdb-live' }), true, 'Live TMDB results carry TMDB facts');
// A bundled title matched to TMDB with proof ("checked") carries real facts too, so filters and labels may use them.
const checkedFixture = { ...familySafeFixture, recordSource: 'tmdb-checked' };
assert.equal(hasVerifiedRatingAndRuntime(checkedFixture), true, 'Titles matched to TMDB with proof carry TMDB facts');
assert.equal(isFamilyFriendly(checkedFixture), true, 'A checked PG-13 title can be family-friendly');
assert.equal(isQuickWatch(checkedFixture), true, 'A checked 1h 40m title is a quick watch');
assert.ok(getContentWarnings({ ...checkedFixture, rating: 'R' }).includes('Rated R'), 'A checked R is a content warning');
for (const recordSource of [undefined, 'saved-watchlist', 'watchlist-fallback']) {
  assert.equal(hasVerifiedRatingAndRuntime({ ...familySafeFixture, recordSource }), false, `${recordSource ?? 'unreviewed bundled'} rows carry unverified facts`);
}
const unreviewedPlaceholder = { ...familySafeFixture, recordSource: undefined, rating: 'PG-13', duration: '1h 45m' };
assert.equal(isFamilyFriendly(unreviewedPlaceholder), false, 'A placeholder PG-13 must not make an unreviewed title family-friendly');
assert.equal(isQuickWatch(unreviewedPlaceholder), false, 'A placeholder runtime must not make an unreviewed title a quick watch');
assert.equal(
  isDateNightFriendly({ ...unreviewedPlaceholder, rating: 'R' }),
  true,
  'Date night rests on genre and synopsis, so a placeholder R must not exclude an unreviewed romance',
);
assert.equal(isDateNightFriendly({ ...familySafeFixture, rating: 'R' }), false, 'A verified R rating still excludes date night');
assert.ok(!getContentWarnings({ ...unreviewedPlaceholder, rating: 'R' }).includes('Rated R'), 'A placeholder R must not be shown as a content warning');
assert.ok(getContentWarnings({ ...familySafeFixture, rating: 'R' }).includes('Rated R'), 'A verified R is a content warning');
const movieNightFixture = [
  { ...searchFixture[0], recordSource: 'bundled-validated', id: 'movie-night-family', title: 'Family Quest', rating: 'PG', genre: ['Animation', 'Family'], tags: [], description: 'A family discovers a new adventure together.', duration: '1h 35m', score: 8.9 },
  { ...searchFixture[0], recordSource: 'bundled-validated', id: 'movie-night-date', title: 'A Love Story', rating: 'PG-13', genre: ['Romance', 'Drama'], tags: [], description: 'A couple finds love and a second chance.', duration: '2h 5m', score: 8.5 },
  { ...searchFixture[0], recordSource: 'bundled-validated', id: 'movie-night-action', title: 'The Big Escape', rating: 'PG-13', genre: ['Action'], tags: [], description: 'Friends race across the city in a clever escape.', duration: '1h 45m', score: 8.2 },
];
const familyNightPreferences = { occasion: 'family', length: 'short', genre: 'All', providerId: 'any' };
assert.equal(selectMovieNightMovies(movieNightFixture, familyNightPreferences, 0, 3)[0].id, 'movie-night-family', 'Movie Night should prioritize family-safe short titles');
assert.ok(selectMovieNightMovies(movieNightFixture, { occasion: 'date-night', length: 'any', genre: 'All', providerId: 'any' }).some(({ id }) => id === 'movie-night-date'), 'Movie Night should include relationship-driven date-night choices');
assert.match(getMovieNightSummary(familyNightPreferences), /family night/, 'Movie Night summaries should explain the selected occasion');
assert.deepEqual(getMovieNightGenres(movieNightFixture), ['Action', 'Animation', 'Drama', 'Family', 'Romance'], 'Movie Night genre choices should be unique and sorted');

// Every planner choice shows how many picks it leaves, so a choice that would
// dead-end can be disabled instead of returning "0 picks".
const anythingGoes = { occasion: 'any', length: 'any', genre: 'All', providerId: 'any' };
assert.deepEqual(
  getMovieNightOptionCounts(movieNightFixture, anythingGoes),
  {
    occasion: { any: 3, family: 3, 'date-night': 1, friends: 1, solo: 1 },
    length: { any: 3, short: 1, standard: 2, epic: 0 },
  },
  'Option counts should report the picks left by swapping in each choice',
);
assert.deepEqual(
  getMovieNightOptionCounts(movieNightFixture, { ...anythingGoes, genre: 'Romance' }),
  {
    occasion: { any: 1, family: 1, 'date-night': 1, friends: 0, solo: 1 },
    length: { any: 1, short: 0, standard: 1, epic: 0 },
  },
  'Option counts should respect the other selected choices',
);
const unreviewedNight = { ...movieNightFixture[2], recordSource: undefined, id: 'movie-night-unreviewed' };
assert.equal(
  getMovieNightCandidates([unreviewedNight], { ...anythingGoes, length: 'standard' }).length,
  0,
  'A placeholder runtime must not satisfy a bounded runtime choice',
);
assert.equal(
  getMovieNightCandidates([unreviewedNight], { ...anythingGoes, occasion: 'friends' }).length,
  0,
  'A placeholder rating must not qualify a title for a night with friends',
);
assert.equal(
  getMovieNightCandidates([unreviewedNight], anythingGoes).length,
  1,
  'Anything goes can still use an unreviewed title',
);

// The planner may also suggest well-known titles that were matched to TMDB ("checked"), always after the reviewed
// ones. A checked title needs enough votes to be well known, a trailer TMDB confirmed, a real synopsis and genre.
const checkedPick = (overrides = {}) => ({
  ...searchFixture[0],
  recordSource: 'tmdb-checked',
  id: 'checked-pick',
  title: 'A Well-Known Film',
  year: 2012,
  rating: 'PG',
  genre: ['Comedy'],
  tags: [],
  description: 'A long enough synopsis that tells a viewer what the film is about and why people remember it so well.',
  duration: '1h 40m',
  score: 9.9,
  matchPercentage: 99,
  voteCount: 5000,
  trailerVerified: true,
  youtubeTrailerId: 'a'.repeat(11),
  posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
  ...overrides,
});
assert.equal(isPlannerEligible(checkedPick()), true);
assert.equal(isPlannerEligible(checkedPick({ voteCount: PLANNER_MIN_VOTES })), true, 'The vote threshold is inclusive');
assert.equal(isPlannerEligible(checkedPick({ voteCount: PLANNER_MIN_VOTES - 1 })), false, 'Too few votes means not well known');
assert.equal(isPlannerEligible(checkedPick({ voteCount: undefined })), false, 'No vote count means no evidence');
assert.equal(isPlannerEligible(checkedPick({ trailerVerified: false })), false, "A bundled trailer TMDB did not confirm is not enough");
assert.equal(isPlannerEligible(checkedPick({ trailerVerified: undefined })), false);
assert.equal(isPlannerEligible(checkedPick({ youtubeTrailerId: '' })), false, 'A pick needs a trailer to open');
assert.equal(isPlannerEligible(checkedPick({ youtubeTrailerId: 'short' })), false, 'A malformed trailer id is not a trailer');
assert.equal(isPlannerEligible(checkedPick({ description: 'Too short to read.' })), false, 'A real synopsis is required');
assert.equal(isPlannerEligible(checkedPick({ genre: ['Other'] })), false, 'A title with no real genre would be labelled "Other"');
assert.equal(isPlannerEligible(checkedPick({ genre: ['Other', 'Comedy'] })), true, 'One real genre is enough');
assert.equal(isPlannerEligible(checkedPick({ posterUrl: '' })), false, 'A pick needs a poster');
assert.equal(isPlannerEligible(checkedPick({ recordSource: undefined })), false, 'A bundled title nobody checked is never eligible');
assert.equal(isPlannerEligible(checkedPick({ recordSource: 'watchlist-fallback' })), false);
assert.equal(isPlannerEligible(checkedPick({ recordSource: 'tmdb-live' })), false, 'Live search results are not part of the planner pool');
assert.equal(isPlannerEligible(movieNightFixture[0]), true, 'Reviewed titles are always eligible');

assert.deepEqual(
  buildPlannerPool(movieNightFixture, [
    ...movieNightFixture,
    checkedPick({ id: 'movie-night-family' }),
    checkedPick({ id: 'pool-ok' }),
    checkedPick({ id: 'pool-few-votes', voteCount: 5 }),
    checkedPick({ id: 'pool-unchecked', recordSource: undefined }),
    checkedPick({ id: 'pool-fallback', recordSource: 'watchlist-fallback' }),
  ]).map(({ id }) => id),
  ['movie-night-family', 'movie-night-date', 'movie-night-action', 'pool-ok'],
  'The pool is the reviewed titles, then the eligible checked ones, with no duplicates',
);
assert.deepEqual(buildPlannerPool(movieNightFixture, []).map(({ id }) => id), movieNightFixture.map(({ id }) => id), 'Before the catalog arrives the pool is just the reviewed titles');

assert.deepEqual(
  selectMovieNightMovies([checkedPick({ id: 'rank-few', voteCount: 2000, score: 9.9 }), checkedPick({ id: 'rank-many', voteCount: 60000, score: 5 }), ...movieNightFixture], anythingGoes, 0, 5).map(({ id }) => id),
  ['movie-night-family', 'movie-night-date', 'movie-night-action', 'rank-many', 'rank-few'],
  'Reviewed titles lead; checked titles follow by how many people voted, whatever their placeholder score says',
);
assert.deepEqual(
  selectMovieNightMovies([checkedPick({ id: 'very-popular', voteCount: 900000 }), { ...movieNightFixture[0], id: 'reviewed-low-score', score: 0, matchPercentage: 0 }], anythingGoes, 0, 2).map(({ id }) => id),
  ['reviewed-low-score', 'very-popular'],
  'A reviewed title leads even with a low editorial score and even against a hugely popular checked title',
);
assert.deepEqual(
  selectMovieNightMovies([checkedPick({ id: 'rank-mid', voteCount: 20000 }), checkedPick({ id: 'rank-top', voteCount: 60000 })], anythingGoes, 0, 2, new Set(['rank-mid'])).map(({ id }) => id),
  ['rank-mid', 'rank-top'],
  'A saved title gets a boost among checked titles',
);

assert.deepEqual(
  getMovieNightCandidates(
    [checkedPick({ id: 'family-pg' }), checkedPick({ id: 'family-g', rating: 'G' }), checkedPick({ id: 'family-pg13', rating: 'PG-13' }), checkedPick({ id: 'family-r', rating: 'R' })],
    { ...anythingGoes, occasion: 'family' },
  ).map(({ id }) => id).sort(),
  ['family-g', 'family-pg'],
  'A checked title is a family pick only when rated G or PG',
);
assert.ok(
  getMovieNightCandidates([movieNightFixture[1]], { ...anythingGoes, occasion: 'family' }).some(({ id }) => id === 'movie-night-date'),
  'A reviewed PG-13 title keeps its family eligibility',
);

// Choices that dead-end with the reviewed titles alone gain picks from the checked ones.
assert.equal(getMovieNightOptionCounts(movieNightFixture, anythingGoes).length.epic, 0, 'The reviewed fixtures have no epic-length title');
assert.equal(
  getMovieNightOptionCounts(buildPlannerPool(movieNightFixture, [checkedPick({ id: 'epic-a', duration: '2h 40m' }), checkedPick({ id: 'epic-b', duration: '3h 0m' })]), anythingGoes).length.epic,
  2,
  'Checked titles fill a choice that would otherwise dead-end',
);

// Adding checked titles never changes what the reviewed titles already give: they only append picks after them.
{
  const extras = Array.from({ length: 6 }, (_, index) => checkedPick({ id: `extra-${index}`, voteCount: PLANNER_MIN_VOTES * (index + 1), duration: `1h ${30 + index}m`, genre: ['Action', 'Comedy'] }));
  const widened = buildPlannerPool(movieNightFixture, extras);
  for (const occasion of ['any', 'family', 'date-night', 'friends', 'solo']) {
    for (const length of ['any', 'short', 'standard', 'epic']) {
      const choice = { occasion, length, genre: 'All', providerId: 'any' };
      const before = getMovieNightCandidates(movieNightFixture, choice).map(({ id }) => id);
      const after = getMovieNightCandidates(widened, choice).map(({ id }) => id);
      assert.deepEqual(after.slice(0, before.length), before, `Reviewed picks stay first for ${occasion} / ${length}`);
    }
  }
}
const movieNightRuntimeFixtures = [
  { ...movieNightFixture[0], id: 'movie-night-100', duration: '1h 40m' },
  { ...movieNightFixture[0], id: 'movie-night-101', duration: '1h 41m' },
  { ...movieNightFixture[0], id: 'movie-night-150', duration: '2h 30m' },
  { ...movieNightFixture[0], id: 'movie-night-151', duration: '2h 31m' },
  { ...movieNightFixture[0], id: 'movie-night-unknown', duration: 'Runtime unavailable' },
];
assert.deepEqual(
  getMovieNightCandidates(movieNightRuntimeFixtures, { occasion: 'any', length: 'short', genre: 'All', providerId: 'any' }).map(({ id }) => id),
  ['movie-night-100'],
  'Short Movie Night picks must be 100 minutes or less',
);
assert.deepEqual(
  getMovieNightCandidates(movieNightRuntimeFixtures, { occasion: 'any', length: 'standard', genre: 'All', providerId: 'any' }).map(({ id }) => id).sort(),
  ['movie-night-101', 'movie-night-150'],
  'Standard Movie Night picks must be 101–150 minutes',
);
assert.deepEqual(
  getMovieNightCandidates(movieNightRuntimeFixtures, { occasion: 'any', length: 'epic', genre: 'All', providerId: 'any' }).map(({ id }) => id),
  ['movie-night-151'],
  'Epic Movie Night picks must be longer than 150 minutes and exclude unknown runtimes',
);
assert.equal(
  selectMovieNightMovies(movieNightFixture, { occasion: 'family', length: 'short', genre: 'Romance', providerId: 'any' }).length,
  0,
  'Movie Night must return no picks rather than relaxing an unmatched strict genre preference',
);
const movieNightCohortFixtures = Array.from({ length: 6 }, (_, index) => ({
  ...movieNightFixture[0],
  id: `movie-night-cohort-${index + 1}`,
  score: 9 - index / 10,
}));
const firstMovieNightCohort = selectMovieNightMovies(movieNightCohortFixtures, { occasion: 'any', length: 'any', genre: 'All', providerId: 'any' }, 0, 3);
const secondMovieNightCohort = selectMovieNightMovies(movieNightCohortFixtures, { occasion: 'any', length: 'any', genre: 'All', providerId: 'any' }, 1, 3);
assert.equal(new Set(firstMovieNightCohort.map(({ id }) => id)).size, 3, 'A Movie Night page must not repeat a title');
assert.equal(new Set(secondMovieNightCohort.map(({ id }) => id)).size, 3, 'Alternate Movie Night pages must not repeat a title');
assert.equal(firstMovieNightCohort.some(({ id }) => secondMovieNightCohort.some((alternate) => alternate.id === id)), false, 'A full alternate cohort should not repeat the first cohort');
assert.deepEqual(
  selectMovieNightMovies(movieNightCohortFixtures, { occasion: 'any', length: 'any', genre: 'All', providerId: 'any' }, 2, 3).map(({ id }) => id),
  firstMovieNightCohort.map(({ id }) => id),
  'Movie Night cohorts should cycle deterministically after all strict candidates are shown',
);
const movieNightVerifiedProvider = {
  ...movieNightFixture[0],
  id: 'movie-night-verified-provider',
  availability: { status: 'verified', source: 'tmdb', region: 'US' },
  streamingPlatforms: [{ id: 'netflix', name: 'Netflix', logo: 'N', color: '#E50914', type: 'subscription', affiliateUrl: '', availabilityStatus: 'verified', source: 'tmdb', region: 'US' }],
};
const movieNightBundledProvider = {
  ...movieNightVerifiedProvider,
  id: 'movie-night-bundled-provider',
  availability: { status: 'discovery', source: 'bundled', region: 'US' },
  streamingPlatforms: [{ ...movieNightVerifiedProvider.streamingPlatforms[0], availabilityStatus: 'discovery', source: undefined }],
};
assert.deepEqual(
  selectMovieNightMovies([movieNightVerifiedProvider, movieNightBundledProvider], { occasion: 'any', length: 'any', genre: 'All', providerId: 'netflix' }).map(({ id }) => id),
  ['movie-night-verified-provider'],
  'Movie Night provider filters must require verified movie and matching platform availability',
);
const duplicateMovieNightPlan = {
  createdAt: '2026-09-04T12:00:00.000Z',
  preferences: { occasion: 'family', length: 'short', genre: 'Family', providerId: 'any' },
  movieIds: ['movie-night-family', 'movie-night-family', 'movie-night-date'],
};
assert.deepEqual(
  normalizeMovieNightPlan(duplicateMovieNightPlan)?.movieIds,
  ['movie-night-family', 'movie-night-date'],
  'Saved Movie Night plans should preserve title order while removing duplicate IDs',
);
assert.equal(
  normalizeMovieNightPlan({
    ...duplicateMovieNightPlan,
    preferences: { ...duplicateMovieNightPlan.preferences, occasion: 'weekend' },
  }),
  null,
  'Saved Movie Night plans must reject unknown occasion values',
);
assert.equal(
  normalizeMovieNightPlan({
    ...duplicateMovieNightPlan,
    preferences: { ...duplicateMovieNightPlan.preferences, length: 'feature' },
  }),
  null,
  'Saved Movie Night plans must reject unknown runtime values',
);
assert.deepEqual(
  deduplicateMovieNightPlans([
    duplicateMovieNightPlan,
    { ...duplicateMovieNightPlan, createdAt: '2026-09-04T13:00:00.000Z', movieIds: ['movie-night-family', 'movie-night-date'] },
  ]).map(({ movieIds }) => movieIds),
  [['movie-night-family', 'movie-night-date']],
  'Persisted and displayed Movie Night plans should use the same duplicate-safe plan key',
);
assert.ok(
  getDateNightPriority({
    ...familySafeFixture,
    id: 'fixture-explicit-romance',
    genre: ['Romance'],
    description: 'A romantic couple finds lasting love before their wedding.',
  }) > getDateNightPriority(familySafeFixture),
  'Explicit romance should rank above a broad relationship-driven date-night match',
);
assert.equal(
  smartSearchMovies([...searchFixture, familySafeFixture], 'family').length,
  1,
  'Family intent search should exclude unsafe matches',
);
assert.equal(
  smartSearchMovies([...searchFixture, familySafeFixture], 'date night').length,
  1,
  'Date-night intent search should exclude unrelated horror',
);
assert.equal(
  smartSearchMovies([...searchFixture, familySafeFixture], 'date night movie').length,
  1,
  'Date-night filler words should not narrow a generic occasion search',
);
assert.equal(
  smartSearchMovies([...searchFixture, familySafeFixture], 'family movie').length,
  1,
  'Family filler words should not narrow a generic occasion search',
);

const riskyNamedFamilyFixture = {
  ...familySafeFixture,
  id: 'fixture-family-risky-title',
  title: 'A Vampire Thriller',
};
assert.equal(
  isFamilyFriendly(riskyNamedFamilyFixture),
  false,
  'Family mode should reject high-risk themes named in a title even when the rating is permissive',
);

const catalogSource = await readFile(resolve('src/data/movies.ts'), 'utf8');
const catalogMatch = catalogSource.match(
  /export const SAMPLE_MOVIES: Movie\[] = (\[[\s\S]*?\]);\s*export const movies/,
);
assert.ok(catalogMatch, 'The bundled catalog should be readable');

const movies = JSON.parse(catalogMatch[1]);
assert.ok(movies.length > 0, 'The catalog should not be empty');
assert.equal(new Set(movies.map((movie) => movie.id)).size, movies.length, 'Movie IDs must be unique');

for (const movie of movies) {
  assert.equal(typeof movie.id, 'string', 'Every movie needs an ID');
  assert.equal(typeof movie.title, 'string', 'Every movie needs a title');
  assert.ok(movie.score >= 0 && movie.score <= 10, `${movie.id} has an invalid score`);
  assert.ok(
    Number.isInteger(movie.matchPercentage) &&
      movie.matchPercentage >= 0 &&
      movie.matchPercentage <= 100,
    `${movie.id} has an invalid match percentage`,
  );
  assert.ok(Array.isArray(movie.streamingPlatforms), `${movie.id} needs a provider list`);

  for (const platform of movie.streamingPlatforms) {
    const url = new URL(platform.affiliateUrl);
    assert.ok(['http:', 'https:'].includes(url.protocol), `${movie.id} has an unsafe provider URL`);
  }
}

const duplicateProviderEntries = movies.reduce((total, movie) => {
  const ids = movie.streamingPlatforms.map((platform) => platform.id);
  return total + (ids.length - new Set(ids).size);
}, 0);

const {
  applyCatalogFilters,
  ERA_FILTERS,
  GENRE_FILTERS,
  getCatalogFilterCounts,
  hasMicroTagEvidence,
  MICRO_TAG_DEFINITIONS,
  normalizeMovieClassification,
} = await importTypeScriptModule('src/services/catalogClassification.ts');

const canonicalMovies = movies.map(normalizeMovieClassification);
const canonicalTagIds = new Set(MICRO_TAG_DEFINITIONS.map(({ id }) => id));
const legacyUnsupportedTags = new Set([
  '#AmericanBlockbuster',
  '#KoreanCinema',
  '#MustWatch',
  '#OscarWinner',
  '#Action',
  '#HighTension',
  '#CultClassic',
]);

for (const movie of canonicalMovies) {
  assert.ok(movie.genre.length > 0, `${movie.id} needs at least one canonical category`);
  assert.equal(new Set(movie.genre).size, movie.genre.length, `${movie.id} has duplicate canonical categories`);
  assert.equal(new Set(movie.tags).size, movie.tags.length, `${movie.id} has duplicate canonical microtags`);

  for (const tag of movie.tags) {
    assert.ok(canonicalTagIds.has(tag), `${movie.id} has an unknown canonical microtag ${tag}`);
    assert.ok(!legacyUnsupportedTags.has(tag), `${movie.id} retained unsupported microtag ${tag}`);
    assert.ok(hasMicroTagEvidence(movie, tag), `${movie.id} lacks synopsis evidence for ${tag}`);
  }
}

const classificationCounts = getCatalogFilterCounts(canonicalMovies);

assert.deepEqual(
  Object.keys(classificationCounts.eras).sort(),
  ERA_FILTERS.map(({ id }) => id).sort(),
  'Era counts should represent exactly the exposed era filters',
);
assert.deepEqual(
  Object.keys(classificationCounts.genres).sort(),
  [...GENRE_FILTERS].sort(),
  'Category counts should represent exactly the exposed category filters',
);
assert.deepEqual(
  Object.keys(classificationCounts.tags).sort(),
  MICRO_TAG_DEFINITIONS.map(({ id }) => id).sort(),
  'Microtag counts should represent exactly the exposed evidence filters',
);

for (const era of ERA_FILTERS) {
  const filtered = applyCatalogFilters(canonicalMovies, {
    era: era.id,
    genre: 'All',
    tag: null,
  });
  assert.equal(filtered.length, classificationCounts.eras[era.id], `${era.id} era count is inconsistent`);
  assert.ok(filtered.length > 0, `${era.id} era is exposed without results`);
  assert.ok(
    filtered.every((movie) => movie.year >= era.min && movie.year <= era.max),
    `${era.id} includes a movie outside its year range`,
  );
}

for (const genre of GENRE_FILTERS) {
  const filtered = applyCatalogFilters(canonicalMovies, {
    era: 'All',
    genre,
    tag: null,
  });
  assert.equal(filtered.length, classificationCounts.genres[genre], `${genre} category count is inconsistent`);
  assert.ok(filtered.length > 0, `${genre} category is exposed without results`);
  if (genre !== 'All') {
    assert.ok(filtered.every((movie) => movie.genre.includes(genre)), `${genre} category contains a mismatched movie`);
  }
}

assert.ok(
  canonicalMovies.every((movie) => !movie.genre.includes('Other') || movie.genre.length === 1),
  'Other must remain an exclusive unclassified bucket',
);
assert.ok(
  canonicalMovies.every((movie) => !movie.genre.includes('Documentary') || movie.genre.length === 1),
  'Synopsis-inferred Documentary must remain exclusive from fiction genre shelves',
);

for (const { id: tag } of MICRO_TAG_DEFINITIONS) {
  const filtered = applyCatalogFilters(canonicalMovies, {
    era: 'All',
    genre: 'All',
    tag,
  });
  assert.equal(filtered.length, classificationCounts.tags[tag], `${tag} count is inconsistent`);
  assert.ok(filtered.length > 0, `${tag} is exposed without results`);
  assert.ok(filtered.every((movie) => movie.tags.includes(tag)), `${tag} filter contains a mismatched movie`);
}

assert.deepEqual(
  classificationCounts.providers,
  {},
  'Bundled discovery links must not be exposed as verified provider filters',
);

for (const provider of Object.keys(classificationCounts.providers)) {
  const filtered = applyCatalogFilters(canonicalMovies, {
    era: 'All',
    genre: 'All',
    tag: null,
    providerIds: [provider],
  });
  assert.equal(filtered.length, classificationCounts.providers[provider], `${provider} count is inconsistent`);
  assert.ok(filtered.length > 0, `${provider} provider is exposed without results`);
  assert.ok(
    filtered.every((movie) => movie.streamingPlatforms.some(({ id }) => id === provider)),
    `${provider} filter contains a mismatched movie`,
  );
}

const scream = canonicalMovies.find(({ title }) => title === 'Scream 7');
assert.ok(scream, 'Scream 7 fixture should exist');
assert.ok(scream.tags.includes('#Slasher'), 'Scream 7 should retain the evidenced slasher tag');
assert.ok(!scream.tags.includes('#ZombieOutbreak'), 'Scream 7 must not retain the synthetic zombie tag');

const twentyEightDaysLater = canonicalMovies.find(({ title }) => title === '28 Days Later');
assert.ok(twentyEightDaysLater, '28 Days Later fixture should exist');
assert.ok(
  twentyEightDaysLater.tags.includes('#ZombieOutbreak'),
  '28 Days Later should be classified with the evidenced outbreak tag',
);

const inception = canonicalMovies.find(({ title }) => title === 'Inception');
assert.ok(inception, 'Inception fixture should exist');
assert.ok(inception.tags.includes('#MindBending'), 'Inception should retain the evidenced mind-bending tag');

const moneyMonster = canonicalMovies.find(({ title }) => title === 'Money Monster');
assert.ok(moneyMonster, 'Money Monster fixture should exist');
assert.ok(!moneyMonster.tags.includes('#Monsters'), 'Title words alone must not create a monster tag');

const foundFootageDocumentary = canonicalMovies.find(
  ({ title }) => title === 'The Found Footage Phenomenon',
);
assert.ok(foundFootageDocumentary, 'Found-footage documentary fixture should exist');
assert.ok(
  !foundFootageDocumentary.tags.includes('#FoundFootage'),
  'A documentary about found footage must not be classified as a found-footage story',
);

const scienceFictionDocumentary = canonicalMovies.find(
  ({ title }) => title === 'Time Warp Vol. 2: Horror and Sci-Fi',
);
assert.ok(scienceFictionDocumentary, 'Science-fiction documentary fixture should exist');
assert.ok(
  !scienceFictionDocumentary.tags.includes('#SciFiHorror'),
  'A documentary about sci-fi horror must not be classified as a sci-fi horror story',
);

function getCanonicalMovie(title, year) {
  const movie = canonicalMovies.find((candidate) => candidate.title === title && candidate.year === year);
  assert.ok(movie, `${title} (${year}) fixture should exist`);
  return movie;
}

const johnWick = getCanonicalMovie('John Wick', 2014);
assert.deepEqual(johnWick.genre, ['Action', 'Thriller'], 'John Wick should use its exact editorial categories');

const godzillaKong = getCanonicalMovie('Godzilla x Kong: The New Empire', 2024);
assert.deepEqual(godzillaKong.genre, ['Action', 'Sci-Fi'], 'Godzilla x Kong should not remain in Other');
assert.ok(godzillaKong.tags.includes('#Monsters'), 'Godzilla x Kong should use the curated monster tag');

const shaunOfTheDead = getCanonicalMovie('Shaun of the Dead', 2004);
assert.ok(shaunOfTheDead.genre.includes('Comedy'), 'Shaun of the Dead should be represented as a comedy');
assert.ok(shaunOfTheDead.genre.includes('Horror'), 'Shaun of the Dead should be represented as horror');
assert.ok(shaunOfTheDead.tags.includes('#DarkComedy'), 'Shaun of the Dead should use the curated dark-comedy tag');

const paranormalNextOfKin = getCanonicalMovie('Paranormal Activity: Next of Kin', 2021);
assert.deepEqual(
  paranormalNextOfKin.genre,
  ['Horror'],
  'A fictional story about a documentary filmmaker must not become a Documentary',
);
assert.ok(
  paranormalNextOfKin.tags.includes('#FoundFootage'),
  'Paranormal Activity: Next of Kin should retain its exact-title found-footage classification',
);

const paranormalEight = getCanonicalMovie('Paranormal Activity 8', 2027);
assert.deepEqual(paranormalEight.genre, ['Horror'], 'Paranormal Activity 8 should be represented as franchise horror');
assert.ok(
  !paranormalEight.tags.includes('#FoundFootage'),
  'A plot-TBA franchise entry must not receive a format tag speculatively',
);

const mainstreamEditorialCategories = [
  ['Spider-Man: Brand New Day', 2026, ['Action', 'Sci-Fi']],
  ['The Mandalorian & Grogu', 2026, ['Action', 'Sci-Fi']],
  ['Avatar: Fire and Ash', 2025, ['Action', 'Sci-Fi']],
  ['Superman', 2025, ['Action', 'Sci-Fi']],
  ['The Fantastic Four: First Steps', 2025, ['Action', 'Sci-Fi']],
  ['Mickey 17', 2025, ['Sci-Fi', 'Comedy']],
  ['Captain America: Brave New World', 2025, ['Action', 'Thriller', 'Sci-Fi']],
  ['Thunderbolts*', 2025, ['Action', 'Sci-Fi']],
  ['M3GAN 2.0', 2025, ['Action', 'Thriller', 'Sci-Fi']],
];
for (const [title, year, expectedGenres] of mainstreamEditorialCategories) {
  assert.deepEqual(
    getCanonicalMovie(title, year).genre,
    expectedGenres,
    `${title} (${year}) should use its exact mainstream editorial categories`,
  );
}
const brandNewDay = getCanonicalMovie('Spider-Man: Brand New Day', 2026);
assert.equal(brandNewDay.director, 'Destin Daniel Cretton', 'The bundled Spider-Man record should use the official director');
assert.equal(brandNewDay.youtubeTrailerId, '8TZMtslA3UY', 'The bundled Spider-Man record should use Marvel’s official trailer');
assert.equal(brandNewDay.streamingPlatforms.length, 0, 'The theatrical Spider-Man record must not claim guessed streaming services');
assert.ok(
  getCanonicalMovie('Avatar: Fire and Ash', 2025).tags.includes('#Survival'),
  'Avatar: Fire and Ash should retain its synopsis-evidenced survival tag',
);
assert.ok(
  !getCanonicalMovie('M3GAN 2.0', 2025).genre.includes('Horror'),
  'M3GAN 2.0 must not receive Horror without sufficient supplied evidence',
);

assert.deepEqual(
  getCanonicalMovie('Sinners', 2025).genre,
  ['Other'],
  'A generic synopsis must not receive an exact-title classification speculatively',
);
for (const movie of canonicalMovies.filter(({ title }) => title === 'Parasite 2' || title === 'Parasite 3')) {
  assert.deepEqual(
    movie.genre,
    ['Other'],
    `${movie.title} (${movie.year}) should remain unclassified rather than inheriting a guessed sequel identity`,
  );
}

const darkKnight = getCanonicalMovie('The Dark Knight', 2008);
assert.ok(darkKnight.genre.includes('Action'), 'The Dark Knight should be represented as action');
assert.ok(!darkKnight.genre.includes('Horror'), 'A synopsis saying citizens are terrified must not imply Horror');

const alienRomulus = getCanonicalMovie('Alien: Romulus', 2024);
assert.ok(alienRomulus.tags.includes('#SciFiHorror'), 'Alien: Romulus should remain evidenced sci-fi horror');
assert.ok(
  !alienRomulus.tags.includes('#SpaceExploration'),
  'A story merely set on a space station must not imply space exploration',
);

const fictionalDocumentaryContexts = [
  ['A Haunted House', 2013],
  ['Paranormal Demons', 2018],
  ['Found Footage 3D', 2016],
  ['Vampire Diary', 2007],
  ['The Haunted House Hotel', 2024],
  ['15 Murders: Inside the Mind of a Serial Killer', 2011],
  ['Found Footage', 2018],
  ['My Dinner With An Android', 2023],
];
for (const [title, year] of fictionalDocumentaryContexts) {
  const movie = getCanonicalMovie(title, year);
  assert.ok(
    !movie.genre.includes('Documentary'),
    `${title} (${year}) must not become Documentary because its characters make a documentary`,
  );
}

const alienOutpost = getCanonicalMovie('Alien Outpost', 2014);
assert.deepEqual(
  alienOutpost.genre,
  ['Action', 'Sci-Fi'],
  'Alien Outpost should use its exact fiction categories instead of Documentary',
);

const monster2008 = getCanonicalMovie('Monster', 2008);
assert.deepEqual(monster2008.genre, ['Horror'], 'Monster (2008) should remain fiction rather than Documentary');
assert.ok(monster2008.tags.includes('#Monsters'), 'Monster (2008) should retain its central monster tag');

const exclusiveDocumentaries = [
  ['Alien Contact: Government Coverup', 2025],
  ['The Alien Saga', 2002],
  ['Time Warp Vol. 2: Horror and Sci-Fi', 2020],
  ['Sex Robot Madness', 2025],
  ['Hollywood in the Atomic Age: Monsters! Martians! Mad Scientists!', 2021],
];
for (const [title, year] of exclusiveDocumentaries) {
  const movie = getCanonicalMovie(title, year);
  assert.deepEqual(
    movie.genre,
    ['Documentary'],
    `${title} (${year}) should be exclusively Documentary rather than entering fiction shelves`,
  );
  assert.ok(
    !movie.tags.includes('#SciFiHorror'),
    `${title} (${year}) must not receive a fiction-only sci-fi horror tag`,
  );
}

const noClosetSpace = getCanonicalMovie('No Closet Space: The History of Gay Key West', 2025);
assert.deepEqual(noClosetSpace.genre, ['Documentary'], 'No Closet Space should remain an exclusive documentary');
assert.ok(
  !noClosetSpace.tags.includes('#Monsters'),
  'A venue named The Monster must not create a monster tag',
);

const fifteenMurders = getCanonicalMovie('15 Murders: Inside the Mind of a Serial Killer', 2011);
assert.ok(
  !fifteenMurders.tags.includes('#Monsters'),
  'The metaphorical phrase “birth of a monster” must not create a monster tag',
);

assert.ok(
  getCanonicalMovie('Kong: Skull Island', 2017).tags.includes('#Monsters'),
  'Kong: Skull Island should retain its curated monster tag',
);

const monsterThreatPositives = [
  ['Alien Invasion : Rise of the Phoenix', 2025],
  ['Alien Monster', 2020],
  ['Alien Uprising', 2008],
  ['In a Violent Nature', 2024],
  ['Haunted House of Pancakes', 2025],
  ['Space Mutation', 2025],
  ['Monster on a Plane', 2024],
  ['Monster Mash', 2024],
  ['Monster Hunters', 2020],
  ['The Arbors', 2020],
  ['Girl vs. Monster', 2012],
  ['Monster Busters', 2009],
  ['Monster Island', 2004],
  ['Monster Makers', 2003],
  ['Ghost Ship', 2002],
];
for (const [title, year] of monsterThreatPositives) {
  assert.ok(
    getCanonicalMovie(title, year).tags.includes('#Monsters'),
    `${title} (${year}) should retain a monster tag because the creature is a central threat`,
  );
}

const benignMonsterContexts = [
  ['I Saw the Devil', 2010],
  ['Cyberpunk Newsagent', 2025],
  ['A Monster Calls', 2016],
  ['Monster Trucks', 2016],
  ['Creature', 2023],
  ['Monster High: The Movie', 2022],
  ['Kung Fu Monster', 2018],
  ['Pokémon Detective Pikachu', 2019],
  ['A Monster in Paris', 2011],
];
for (const [title, year] of benignMonsterContexts) {
  assert.ok(
    !getCanonicalMovie(title, year).tags.includes('#Monsters'),
    `${title} (${year}) must not tag a metaphorical, benign, captive, or helper creature as a threat`,
  );
}

for (const [title, year] of [
  ["Apocalypse '45", 2020],
  ['Cult', 2020],
  ['Crimson Rivers II: Angels of the Apocalypse', 2004],
]) {
  assert.ok(
    !getCanonicalMovie(title, year).tags.includes('#PostApocalyptic'),
    `${title} (${year}) must not treat a historical ending, prophecy, or prevented catastrophe as post-apocalyptic`,
  );
}
assert.ok(
  getCanonicalMovie('Cafe Apocalypse', 2026).tags.includes('#PostApocalyptic'),
  'A story explicitly set during the end of the world should remain post-apocalyptic',
);

for (const [title, year] of [
  ['Found Footage Festival Vol. 11', 2020],
  ['Found Footage Film Festival For Friends Vol. 1', 2020],
]) {
  assert.ok(
    !getCanonicalMovie(title, year).tags.includes('#FoundFootage'),
    `${title} (${year}) is a festival program, not a found-footage narrative`,
  );
}
assert.ok(
  paranormalNextOfKin.tags.includes('#FoundFootage'),
  'The festival guard must not remove found-footage tags from actual franchise narratives',
);

const albertPyunDocumentary = getCanonicalMovie('Albert Pyun: King of Cult Movies', 2023);
assert.deepEqual(
  albertPyunDocumentary.genre,
  ['Documentary'],
  'Albert Pyun: King of Cult Movies should remain an exclusive documentary',
);
assert.ok(
  !albertPyunDocumentary.tags.includes('#PostApocalyptic'),
  'A documentary mentioning a post-apocalyptic film must not inherit its setting tag',
);

const robotPlanet = getCanonicalMovie('Robot Planet', 2018);
assert.deepEqual(robotPlanet.genre, ['Documentary'], 'Robot Planet should use its exact nonfiction correction');
assert.ok(!robotPlanet.tags.includes('#SciFiHorror'), 'Robot Planet must not enter the sci-fi horror narrative tag');
assert.ok(!robotPlanet.tags.includes('#ZombieOutbreak'), 'Robot Planet must not tag robots described through zombie fiction');

const androidMusicVideos = getCanonicalMovie('android music videos (volume 1', 2004);
assert.deepEqual(
  androidMusicVideos.genre,
  ['Other'],
  'The android music-video compilation should remain conservatively unclassified',
);
assert.ok(
  !androidMusicVideos.tags.includes('#SciFiHorror'),
  'An internet-horror rumor about music videos must not become a sci-fi horror narrative',
);
assert.ok(
  !androidMusicVideos.tags.includes('#SerialKiller'),
  'A synopsis explicitly calling a serial-killer rumor false must not receive that tag',
);

const thirteenMinutesSciFiHorror = getCanonicalMovie('13 Minutes of Horror: Sci-Fi Horror', 2022);
assert.ok(
  thirteenMinutesSciFiHorror.tags.includes('#SciFiHorror'),
  'The sci-fi horror anthology should remain a positive narrative tag fixture',
);
assert.ok(
  getCanonicalMovie('I Hate Found Footage', 2026).tags.includes('#FoundFootage'),
  'A true found-footage narrative should remain tagged',
);

const exactTitleWrongYear = normalizeMovieClassification({
  ...johnWick,
  id: 'editorial-key-regression',
  year: 2015,
  genre: [],
  tags: [],
  description: 'Plot unavailable.',
});
assert.deepEqual(
  exactTitleWrongYear.genre,
  ['Other'],
  'Editorial corrections must require both an exact normalized title and year',
);

const trustedLiveTitle = normalizeMovieClassification({
  ...johnWick,
  id: 'tmdb-editorial-key-regression',
  genre: ['Comedy'],
  tags: [],
  description: 'Live result with authoritative source genres.',
});
assert.deepEqual(
  trustedLiveTitle.genre,
  ['Comedy'],
  'Bundled editorial corrections must not override a live TMDB classification',
);

const combinedFilters = {
  era: '2010s',
  genre: 'Horror',
  tag: '#ZombieOutbreak',
  providerIds: ['netflix'],
};
const verifiedNetflixMovie = {
  ...canonicalMovies.find((movie) =>
    movie.year >= 2010
    && movie.year <= 2019
    && movie.genre.includes('Horror')
    && movie.tags.includes('#ZombieOutbreak')),
  id: 'tmdb-verified-netflix-fixture',
  availability: {
    status: 'verified',
    source: 'tmdb',
    region: 'US',
    checkedAt: availabilityCheckedAt,
  },
  streamingPlatforms: [{
    id: 'netflix',
    name: 'Netflix',
    logo: 'N',
    color: '#E50914',
    type: 'subscription',
    affiliateUrl: 'https://www.themoviedb.org/movie/fixture/watch',
    availabilityStatus: 'verified',
    source: 'tmdb',
    region: 'US',
    checkedAt: availabilityCheckedAt,
  }],
};
const bundledNetflixClaim = {
  ...verifiedNetflixMovie,
  id: 'bundled-unverified-netflix-fixture',
  availability: { status: 'discovery', source: 'bundled', region: 'US' },
  streamingPlatforms: verifiedNetflixMovie.streamingPlatforms.map((provider) => ({
    ...provider,
    availabilityStatus: 'discovery',
    source: undefined,
  })),
};
const combinedResults = applyCatalogFilters(
  [verifiedNetflixMovie, bundledNetflixClaim],
  combinedFilters,
);
assert.equal(combinedResults.length, 1, 'Only a verified provider record should pass a provider filter');
assert.ok(
  combinedResults.every(
    (movie) =>
      movie.year >= 2010
      && movie.year <= 2019
      && movie.genre.includes('Horror')
      && movie.tags.includes('#ZombieOutbreak')
      && movie.streamingPlatforms.some(({ id }) => id === 'netflix'),
  ),
  'Era, category, microtag, and provider filters must combine with AND semantics',
);

const providerUnion = applyCatalogFilters([verifiedNetflixMovie, bundledNetflixClaim], {
  era: 'All',
  genre: 'All',
  tag: null,
  providerIds: ['netflix', 'max'],
});
assert.equal(
  providerUnion.length,
  1,
  'Selecting multiple services should use OR semantics without including bundled provider guesses',
);

const verifiedProviderCounts = getCatalogFilterCounts([verifiedNetflixMovie, bundledNetflixClaim]);
assert.deepEqual(
  verifiedProviderCounts.providers,
  { netflix: 1 },
  'Provider counts should include only live, verified regional records',
);

console.log(`Passed service, search, and ${movies.length}-record catalog checks.`);
console.log(`Catalog warning: ${duplicateProviderEntries} duplicate provider entries are normalized at runtime.`);
console.log(
  `Verified ${MICRO_TAG_DEFINITIONS.length} microtag, ${GENRE_FILTERS.length} category, `
  + `${ERA_FILTERS.length} era, and ${Object.keys(classificationCounts.providers).length} provider filters.`,
);
