import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';

async function importTypeScriptModule(relativePath) {
  let source = await readFile(resolve(relativePath), 'utf8');
  if (relativePath.endsWith('src/services/smartSearch.ts')) {
    const discoverySource = await readFile(resolve('src/services/discovery.ts'), 'utf8');
    const searchCatalogSource = await readFile(resolve('src/services/searchCatalog.ts'), 'utf8');
    source = `${discoverySource.replace(/^export\s+/gm, '')}\n${searchCatalogSource.replace(/^export\s+/gm, '')}\n${source
      .replace(/import\s+\{[\s\S]*?\}\s+from\s+'\.\/discovery';\s*/m, '')
      .replace(/import\s+\{[\s\S]*?\}\s+from\s+'\.\/searchCatalog';\s*/m, '')}`;
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

const catalogSource = await readFile(resolve('src/data/movies.ts'), 'utf8');
const catalogMatch = catalogSource.match(
  /export const SAMPLE_MOVIES: Movie\[] = (\[[\s\S]*?\]);\s*export const movies/,
);
if (!catalogMatch) throw new Error('Could not parse the bundled movie catalog');

const movies = JSON.parse(catalogMatch[1]);
const { smartSearchMovies } = await importTypeScriptModule('src/services/smartSearch.ts');
const generatedSource = await readFile(resolve('src/data/generatedMovies.ts'), 'utf8');
const readArrayConstant = (name) => {
  const match = generatedSource.match(new RegExp(`const ${name} = (\\[[^;]*\\]);`));
  if (!match) throw new Error(`Could not parse ${name} from the packed catalog`);
  return JSON.parse(match[1]);
};
const packedMatch = generatedSource.match(
  /const PACKED_MOVIES: PackedMovie\[] = (\[[\s\S]*?\]);\s*function decodeSequence/,
);
if (!packedMatch) throw new Error('Could not parse PACKED_MOVIES from the packed catalog');
const packedMovies = JSON.parse(packedMatch[1].replace(/,\s*]$/, ']'));
const packedDictionaries = {
  ratings: readArrayConstant('RATINGS'),
  durations: readArrayConstant('DURATIONS'),
  directors: readArrayConstant('DIRECTORS'),
  cast: readArrayConstant('CAST'),
  genres: readArrayConstant('GENRES'),
  tags: readArrayConstant('TAGS'),
};
const decodeSequence = (indexes, dictionary) => (Array.isArray(indexes) ? indexes : [indexes])
  .map((index) => dictionary[index]);
const expandPackedCatalog = () => packedMovies.map(([
  id,
  title,
  year,
  rating,
  score,
  matchPercentage,
  duration,
  genreCodes,
  tagCodes,
  director,
  cast,
  description,
  posterPath,
  backdropPath,
  youtubeTrailerId,
  flags,
]) => ({
  id,
  title,
  year,
  rating: packedDictionaries.ratings[rating],
  score,
  matchPercentage,
  duration: packedDictionaries.durations[duration],
  genre: decodeSequence(genreCodes, packedDictionaries.genres),
  tags: decodeSequence(tagCodes, packedDictionaries.tags),
  director: packedDictionaries.directors[director],
  cast: (Array.isArray(cast) ? cast : [cast]).map((index) => packedDictionaries.cast[index]),
  description,
  posterUrl: `https://image.tmdb.org/t/p/w500/${posterPath}`,
  backdropUrl: `https://image.tmdb.org/t/p/w1280/${backdropPath || posterPath}`,
  youtubeTrailerId: youtubeTrailerId || '',
  streamingPlatforms: [],
  availability: { status: 'discovery', source: 'bundled', region: 'US' },
  trending: (flags & 1) !== 0 || undefined,
}));
const queries = [
  'harry potter',
  'spiderman',
  'zombie',
  'family movie',
  'date night',
  'sci fi',
  'thriller',
  'mission impossible',
  '1990s horror',
  'romance',
];
const iterations = Number.parseInt(process.env.PERF_ITERATIONS ?? '30', 10);
const warmupIterations = 3;

for (let iteration = 0; iteration < warmupIterations; iteration++) {
  for (const query of queries) smartSearchMovies(movies, query);
}

const timings = [];
for (let iteration = 0; iteration < iterations; iteration++) {
  const start = performance.now();
  for (const query of queries) smartSearchMovies(movies, query);
  timings.push(performance.now() - start);
}

const sorted = [...timings].sort((left, right) => left - right);
const percentile = (value) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))];
const mean = timings.reduce((total, value) => total + value, 0) / timings.length;
const catalogExpansionTimings = [];
for (let iteration = 0; iteration < warmupIterations; iteration++) expandPackedCatalog();
for (let iteration = 0; iteration < iterations; iteration++) {
  const start = performance.now();
  expandPackedCatalog();
  catalogExpansionTimings.push(performance.now() - start);
}
catalogExpansionTimings.sort((left, right) => left - right);
const catalogExpansionMean = catalogExpansionTimings.reduce((total, value) => total + value, 0)
  / catalogExpansionTimings.length;
const result = {
  records: movies.length,
  queries: queries.length,
  iterations,
  meanMs: Number(mean.toFixed(3)),
  medianMs: Number(percentile(0.5).toFixed(3)),
  p95Ms: Number(percentile(0.95).toFixed(3)),
  minMs: Number(sorted[0].toFixed(3)),
  maxMs: Number(sorted[sorted.length - 1].toFixed(3)),
  catalogExpansion: {
    meanMs: Number(catalogExpansionMean.toFixed(3)),
    medianMs: Number(catalogExpansionTimings[Math.floor(catalogExpansionTimings.length * 0.5)].toFixed(3)),
    p95Ms: Number(catalogExpansionTimings[Math.floor(catalogExpansionTimings.length * 0.95)].toFixed(3)),
  },
};

console.log(JSON.stringify(result));
