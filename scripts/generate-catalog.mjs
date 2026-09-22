import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(repositoryRoot, 'src/data/movies.ts');
const outputPath = resolve(repositoryRoot, 'src/data/generatedMovies.ts');
const checkOnly = process.argv.includes('--check');

async function importTypeScriptModule(relativePath) {
  const source = await readFile(resolve(repositoryRoot, relativePath), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const encoded = Buffer.from(output).toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

function unique(values) {
  return [...new Set(values)];
}

function dictionaryIndex(dictionary, value) {
  const index = dictionary.indexOf(value);
  if (index < 0) throw new Error(`Catalog dictionary is missing ${value}`);
  return index;
}

function encodeSequence(dictionary, values) {
  const indexes = values.map((value) => dictionaryIndex(dictionary, value));
  return indexes.length === 1 ? indexes[0] : indexes;
}

function visibleText(value) {
  return value.replace(/[\u2013\u2014]/g, '-');
}

const source = await readFile(sourcePath, 'utf8');
const catalogMatch = source.match(
  /export const SAMPLE_MOVIES: Movie\[] = (\[[\s\S]*?\]);\s*export const movies/,
);
if (!catalogMatch) throw new Error('Could not parse src/data/movies.ts');

const sourceMovies = JSON.parse(catalogMatch[1]);
const { normalizeMovieClassification } = await importTypeScriptModule('src/services/catalogClassification.ts');
const { getValidatedYouTubeTrailerId } = await importTypeScriptModule('src/services/trailer.ts');
const canonicalMovies = sourceMovies.map((movie) => normalizeMovieClassification(movie));

const ratings = unique(canonicalMovies.map(({ rating }) => rating));
const durations = unique(canonicalMovies.map(({ duration }) => duration));
const directors = unique(canonicalMovies.map(({ director }) => visibleText(director)));
const cast = unique(canonicalMovies.flatMap((movie) => movie.cast.map(visibleText)));
const genres = unique(canonicalMovies.flatMap(({ genre }) => genre));
const tags = unique(canonicalMovies.flatMap((movie) => movie.tags));

const posterPrefix = 'https://image.tmdb.org/t/p/w500/';
const backdropPrefix = 'https://image.tmdb.org/t/p/w1280/';
const packedMovies = canonicalMovies.map((movie) => {
  if (!movie.posterUrl.startsWith(posterPrefix) || !movie.backdropUrl.startsWith(backdropPrefix)) {
    throw new Error(`Movie ${movie.id} uses an unsupported image origin`);
  }

  const posterPath = movie.posterUrl.slice(posterPrefix.length);
  const backdropPath = movie.backdropUrl.slice(backdropPrefix.length);
  const castCodes = movie.cast.map((name) => dictionaryIndex(cast, visibleText(name)));
  const compactCast = castCodes.length === 1 ? castCodes[0] : castCodes;
  const trailerId = getValidatedYouTubeTrailerId(movie.youtubeTrailerId);

  return [
    movie.id,
    visibleText(movie.title),
    movie.year,
    dictionaryIndex(ratings, movie.rating),
    movie.score,
    movie.matchPercentage,
    dictionaryIndex(durations, movie.duration),
    encodeSequence(genres, movie.genre),
    encodeSequence(tags, movie.tags),
    dictionaryIndex(directors, visibleText(movie.director)),
    compactCast,
    visibleText(movie.description),
    posterPath,
    backdropPath === posterPath ? 0 : backdropPath,
    trailerId || 0,
    movie.trending ? 1 : 0,
  ];
});

const decodeSequence = (indexes, dictionary) => (Array.isArray(indexes) ? indexes : [indexes])
  .map((index) => dictionary[index]);
const roundTrippedMovies = packedMovies.map(([
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
  castCodes,
  description,
  posterPath,
  backdropPath,
  youtubeTrailerId,
  flags,
]) => ({
  id,
  title,
  year,
  rating: ratings[rating],
  score,
  matchPercentage,
  duration: durations[duration],
  genre: decodeSequence(genreCodes, genres),
  tags: decodeSequence(tagCodes, tags),
  director: directors[director],
  cast: (Array.isArray(castCodes) ? castCodes : [castCodes]).map((index) => cast[index]),
  description,
  posterUrl: posterPrefix + posterPath,
  backdropUrl: backdropPrefix + (backdropPath || posterPath),
  youtubeTrailerId: youtubeTrailerId || '',
  streamingPlatforms: [],
  availability: { status: 'discovery', source: 'bundled', region: 'US' },
  trending: (flags & 1) !== 0 || undefined,
}));
const expectedMovies = canonicalMovies.map((movie) => ({
  ...movie,
  title: visibleText(movie.title),
  director: visibleText(movie.director),
  cast: movie.cast.map(visibleText),
  description: visibleText(movie.description),
  youtubeTrailerId: getValidatedYouTubeTrailerId(movie.youtubeTrailerId),
  streamingPlatforms: [],
  availability: { status: 'discovery', source: 'bundled', region: 'US' },
  trending: movie.trending || undefined,
}));
assert.deepEqual(roundTrippedMovies, expectedMovies, 'Packed catalog must round-trip without data loss');

const sourceHash = createHash('sha256').update(catalogMatch[1]).digest('hex');
const packedRows = packedMovies.map((movie) => `  ${JSON.stringify(movie)},`).join('\n');
const output = `/* This file is generated by scripts/generate-catalog.mjs. Do not edit it directly. */
import type { Movie } from './catalog';

export const SOURCE_CATALOG_HASH = '${sourceHash}';
const RATINGS = ${JSON.stringify(ratings)};
const DURATIONS = ${JSON.stringify(durations)};
const DIRECTORS = ${JSON.stringify(directors)};
const CAST = ${JSON.stringify(cast)};
const GENRES = ${JSON.stringify(genres)};
const TAGS = ${JSON.stringify(tags)};
const POSTER_PREFIX = 'https://image.tmdb.org/t/p/w500/';
const BACKDROP_PREFIX = 'https://image.tmdb.org/t/p/w1280/';
const BUNDLED_AVAILABILITY = { status: 'discovery', source: 'bundled', region: 'US' } as const;

type PackedMovie = [
  id: string,
  title: string,
  year: number,
  rating: number,
  score: number,
  matchPercentage: number,
  duration: number,
  genres: number | number[],
  tags: number | number[],
  director: number,
  cast: number | number[],
  description: string,
  posterPath: string,
  backdropPath: string | 0,
  trailerId: string | 0,
  flags: number,
];

const PACKED_MOVIES: PackedMovie[] = [
${packedRows}
];

function decodeSequence(indexes: number | number[], dictionary: string[]) {
  return (Array.isArray(indexes) ? indexes : [indexes]).map((index) => dictionary[index]);
}

export const SAMPLE_MOVIES: Movie[] = PACKED_MOVIES.map(([
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
  rating: RATINGS[rating],
  score,
  matchPercentage,
  duration: DURATIONS[duration],
  genre: decodeSequence(genreCodes, GENRES),
  tags: decodeSequence(tagCodes, TAGS),
  director: DIRECTORS[director],
  cast: (Array.isArray(cast) ? cast : [cast]).map((index) => CAST[index]),
  description,
  posterUrl: POSTER_PREFIX + posterPath,
  backdropUrl: BACKDROP_PREFIX + (backdropPath || posterPath),
  youtubeTrailerId: youtubeTrailerId || '',
  streamingPlatforms: [],
  availability: BUNDLED_AVAILABILITY,
  trending: (flags & 1) !== 0 || undefined,
}));

export const movies = SAMPLE_MOVIES;
`;

if (checkOnly) {
  const currentOutput = await readFile(outputPath, 'utf8').catch(() => '');
  if (currentOutput !== output) {
    throw new Error('src/data/generatedMovies.ts is stale. Run npm run generate:catalog.');
  }
  console.log(`Verified ${packedMovies.length} packed movies are current.`);
} else {
  await writeFile(outputPath, output, 'utf8');
  console.log(`Generated ${packedMovies.length} packed movies at ${outputPath}`);
}
