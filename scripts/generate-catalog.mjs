import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(repositoryRoot, 'src/data/movies.ts');
const outputPath = resolve(repositoryRoot, 'src/data/generatedMovies.ts');
// Vercel's website-only source bundle intentionally omits ios/. Keep native
// generation opt-in unless the native implementation is present instead of
// recreating ignored native artifacts during a web build or clean web checkout.
// Tests can point this at an absent directory to exercise the same path without
// touching the local checkout.
const nativeAppDirectory = resolve(
  process.env.STREAMFLICKER_NATIVE_APP_DIR || resolve(repositoryRoot, 'ios/App/App'),
);
const nativeOutputPath = resolve(nativeAppDirectory, 'NativeValidatedCatalog.swift');
const nativeRequested = process.argv.includes('--native');
const nativeTreeAvailable = existsSync(nativeAppDirectory);
const nativeImplementationAvailable = existsSync(resolve(nativeAppDirectory, 'NativeMovieNightPlugin.swift'));
const shouldGenerateNative = nativeRequested || (nativeTreeAvailable && nativeImplementationAvailable);
const nativeSkipReason = nativeTreeAvailable ? 'NativeMovieNightPlugin.swift is absent' : 'ios/App/App is absent';
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
const { isFamilyFriendly, isDateNightFriendly } = await importTypeScriptModule('src/services/discovery.ts');
const { CATALOG_CHECKED_AT, getValidatedCatalog, getValidatedCatalogMetadata } = await importTypeScriptModule('src/services/catalogQuality.ts');
const canonicalMovies = sourceMovies.map((movie) => normalizeMovieClassification(movie));
const validatedCatalog = getValidatedCatalog(canonicalMovies);
const validatedIds = new Set(validatedCatalog.map(({ id }) => id));

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
    validatedIds.has(movie.id) ? 'bundled-validated' : 0,
    movie.sourceId || 0,
    movie.releaseDate || 0,
    movie.releaseStatus || 0,
    movie.ratingSource || 0,
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
  recordSource,
  sourceId,
  releaseDate,
  releaseStatus,
  ratingSource,
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
  ...(recordSource ? { recordSource } : {}),
  ...(sourceId ? { sourceId } : {}),
  ...(releaseDate ? { releaseDate } : {}),
  ...(releaseStatus ? { releaseStatus } : {}),
  ...(ratingSource ? { ratingSource } : {}),
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
  availability: validatedIds.has(id)
    ? { status: 'discovery', source: 'bundled', region: 'US', checkedAt: CATALOG_CHECKED_AT }
    : { status: 'discovery', source: 'bundled', region: 'US' },
  trending: (flags & 1) !== 0 || undefined,
}));
const expectedMovies = canonicalMovies.map((movie) => ({
  ...movie,
  ...(validatedIds.has(movie.id) ? { recordSource: 'bundled-validated' } : {}),
  title: visibleText(movie.title),
  director: visibleText(movie.director),
  cast: movie.cast.map(visibleText),
  description: visibleText(movie.description),
  youtubeTrailerId: getValidatedYouTubeTrailerId(movie.youtubeTrailerId),
  streamingPlatforms: [],
  availability: validatedIds.has(movie.id)
    ? { status: 'discovery', source: 'bundled', region: 'US', checkedAt: CATALOG_CHECKED_AT }
    : { status: 'discovery', source: 'bundled', region: 'US' },
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
const BUNDLED_VALIDATED_AVAILABILITY = { ...BUNDLED_AVAILABILITY, checkedAt: '${CATALOG_CHECKED_AT}' } as const;

type PackedMovie = [
  id: string,
  title: string,
  recordSource: string | 0,
  sourceId: string | 0,
  releaseDate: string | 0,
  releaseStatus: string | 0,
  ratingSource: string | 0,
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
  recordSource,
  sourceId,
  releaseDate,
  releaseStatus,
  ratingSource,
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
  ...(recordSource ? { recordSource: recordSource as Movie['recordSource'] } : {}),
  ...(sourceId ? { sourceId } : {}),
  ...(releaseDate ? { releaseDate } : {}),
  ...(releaseStatus ? { releaseStatus: releaseStatus as Movie['releaseStatus'] } : {}),
  ...(ratingSource ? { ratingSource: ratingSource as Movie['ratingSource'] } : {}),
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
  availability: recordSource === 'bundled-validated' ? BUNDLED_VALIDATED_AVAILABILITY : BUNDLED_AVAILABILITY,
  trending: (flags & 1) !== 0 || undefined,
}));

export const movies = SAMPLE_MOVIES;
`;

function swiftString(value) {
  return JSON.stringify(String(value)).replace(/\\u2028|\\u2029/g, (match) => match === '\\u2028' ? '\\u2028' : '\\u2029');
}

function durationMinutes(duration) {
  const hours = Number(duration.match(/(\d+)h/)?.[1] ?? 0);
  const minutes = Number(duration.match(/(\d+)m/)?.[1] ?? 0);
  const total = hours * 60 + minutes;
  return total > 0 ? total : 0;
}

function nativeOccasions(movie) {
  const occasions = ['any'];
  if (isFamilyFriendly(movie)) occasions.push('family');
  if (isDateNightFriendly(movie)) occasions.push('date-night');
  if (movie.rating.trim().toUpperCase() !== 'R'
    && !movie.genre.includes('Documentary')
    && (movie.genre.includes('Comedy') || movie.genre.includes('Action') || movie.genre.includes('Adventure'))) {
    occasions.push('friends');
  }
  if (!isFamilyFriendly(movie) || movie.genre.includes('Drama')) occasions.push('solo');
  return occasions;
}

const nativeRows = validatedCatalog.map((movie) => {
  const entry = getValidatedCatalogMetadata(movie.id);
  return `    NativeMovie(\n      id: ${swiftString(movie.id)},\n      title: ${swiftString(movie.title)},\n      year: ${movie.year},\n      minutes: ${durationMinutes(movie.duration)},\n      genres: ${JSON.stringify(movie.genre)},\n      occasions: ${JSON.stringify(nativeOccasions(movie))},\n      blurb: ${swiftString(movie.description)},\n      sourceLabel: ${swiftString('StreamFlicker bundled validated record')},\n      availabilityStatus: ${swiftString(movie.availability?.status ?? 'discovery')},\n      region: ${swiftString(movie.availability?.region ?? 'US')},\n      checkedAt: ${entry?.checkedAt ? swiftString(entry.checkedAt) : 'nil'}\n    )`;
}).join(',\n');
const nativeOutput = `// This file is generated by scripts/generate-catalog.mjs. Do not edit it directly.
import Foundation

struct NativeMovie {
    let id: String
    let title: String
    let year: Int
    let minutes: Int
    let genres: [String]
    let occasions: [String]
    let blurb: String
    let sourceLabel: String
    let availabilityStatus: String
    let region: String
    let checkedAt: String?
}

enum NativeValidatedCatalog {
    static let records: [NativeMovie] = [
${nativeRows}
    ]
}
`;

if (checkOnly) {
  const currentOutput = await readFile(outputPath, 'utf8').catch(() => '');
  if (currentOutput !== output) {
    throw new Error('src/data/generatedMovies.ts is stale. Run npm run generate:catalog.');
  }
  if (shouldGenerateNative) {
    const currentNativeOutput = await readFile(nativeOutputPath, 'utf8').catch(() => '');
    if (currentNativeOutput !== nativeOutput) {
      throw new Error('ios/App/App/NativeValidatedCatalog.swift is stale. Run npm run generate:catalog.');
    }
  } else {
    console.log(`Native catalog artifact check skipped because ${nativeSkipReason}.`);
  }
  console.log(`Verified ${packedMovies.length} packed movies and ${validatedCatalog.length} native validated movies are current.`);
} else {
  await writeFile(outputPath, output, 'utf8');
  console.log(`Generated ${packedMovies.length} packed movies at ${outputPath}`);
  if (shouldGenerateNative) {
    if (!nativeTreeAvailable) await mkdir(nativeAppDirectory, { recursive: true });
    await writeFile(nativeOutputPath, nativeOutput, 'utf8');
    console.log(`Generated ${validatedCatalog.length} native validated movies at ${nativeOutputPath}`);
  } else {
    console.log(`Skipped native catalog generation because ${nativeSkipReason}.`);
  }
}
