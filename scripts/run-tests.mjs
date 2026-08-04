import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';

async function importTypeScriptModule(relativePath) {
  let source = await readFile(resolve(relativePath), 'utf8');
  // The lightweight data-URL loader keeps tests dependency-free. Inline the
  // one local runtime dependency used by smartSearch so Node does not need to
  // resolve a relative import from a data: URL.
  if (relativePath.endsWith('src/services/smartSearch.ts')) {
    const discoverySource = await readFile(resolve('src/services/discovery.ts'), 'utf8');
    source = `${discoverySource.replace(/^export\s+/gm, '')}\n${source.replace(/import\s+\{[\s\S]*?\}\s+from\s+'\.\/discovery';\s*/m, '')}`;
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

const { smartSearchMovies } = await importTypeScriptModule('src/services/smartSearch.ts');
const {
  getDateNightPriority,
  isDateNightFriendly,
  isFamilyFriendly,
  isQuickWatch,
} = await importTypeScriptModule('src/services/discovery.ts');
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

assert.equal(smartSearchMovies(searchFixture, 'undead').length, 1, 'Synonym search should find zombie titles');
assert.equal(smartSearchMovies(searchFixture, 'zombie outbreak').length, 1, 'Concept search should not return unrelated horror');
assert.equal(smartSearchMovies(searchFixture, '80s horror').length, 2, 'Decade and genre constraints should combine');
assert.equal(smartSearchMovies(searchFixture, '90s horror').length, 0, 'Decade constraints should exclude other years');
assert.equal(smartSearchMovies(searchFixture, 'outbrek').length, 1, 'One-character search typos should be tolerated');
assert.equal(smartSearchMovies(searchFixture, 'romance').length, 0, 'Unrelated searches should return no matches');

const familySafeFixture = {
  ...searchFixture[0],
  id: 'fixture-family-safe',
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

for (const provider of new Set(canonicalMovies.flatMap((movie) =>
  movie.streamingPlatforms.map(({ id }) => id)))) {
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
  ['Spider-Man 4', 2026, ['Action', 'Sci-Fi']],
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
const combinedResults = applyCatalogFilters(canonicalMovies, combinedFilters);
assert.ok(combinedResults.length > 0, 'The combined-filter regression fixture should return results');
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

const providerUnion = applyCatalogFilters(canonicalMovies, {
  era: 'All',
  genre: 'All',
  tag: null,
  providerIds: ['netflix', 'max'],
});
assert.equal(
  providerUnion.length,
  canonicalMovies.filter((movie) =>
    movie.streamingPlatforms.some(({ id }) => id === 'netflix' || id === 'max')).length,
  'Selecting multiple services should use OR semantics without duplicate movies',
);

console.log(`Passed service, search, and ${movies.length}-record catalog checks.`);
console.log(`Catalog warning: ${duplicateProviderEntries} duplicate provider entries are normalized at runtime.`);
console.log(
  `Verified ${MICRO_TAG_DEFINITIONS.length} microtag, ${GENRE_FILTERS.length} category, `
  + `${ERA_FILTERS.length} era, and ${Object.keys(classificationCounts.providers).length} provider filters.`,
);
