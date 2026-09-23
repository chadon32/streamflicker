import type { Movie } from '../data/catalog';

/**
 * The bundled catalog is intentionally treated as discovery data. Only this
 * small, manually reviewed set is eligible for featured and recommendation
 * surfaces until the source can provide complete, current records.
 *
 * `sourceId` is the stable TMDB source identifier recorded for the curated
 * title. Keeping it beside the local slug lets the offline gate fail closed
 * when a row is accidentally replaced or duplicated.
 */
export interface ValidatedCatalogEntry {
  title: string;
  sourceId: string;
  releaseDate: string;
  releaseStatus: 'released';
  director: string;
  cast: string[];
  ratingSource: 'TMDB';
  checkedAt: string;
  curationRank: number;
}

export const CATALOG_CHECKED_AT = '2026-09-23';
export const CATALOG_REGION = 'US';
export const CATALOG_FRESHNESS_DAYS = 365;

export const VALIDATED_CATALOG_ENTRIES: Record<string, ValidatedCatalogEntry> = {
  'blade-runner-2049-2017': {
    title: 'Blade Runner 2049',
    sourceId: 'tmdb-335984',
    releaseDate: '2017-10-06',
    releaseStatus: 'released',
    director: 'Denis Villeneuve',
    cast: ['Ryan Gosling', 'Harrison Ford', 'Ana de Armas'],
    ratingSource: 'TMDB',
    checkedAt: CATALOG_CHECKED_AT,
    curationRank: 1,
  },
  'interstellar-2014': {
    title: 'Interstellar',
    sourceId: 'tmdb-157336',
    releaseDate: '2014-11-07',
    releaseStatus: 'released',
    director: 'Christopher Nolan',
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
    ratingSource: 'TMDB',
    checkedAt: CATALOG_CHECKED_AT,
    curationRank: 2,
  },
  'inception-2010': {
    title: 'Inception',
    sourceId: 'tmdb-27205',
    releaseDate: '2010-07-16',
    releaseStatus: 'released',
    director: 'Christopher Nolan',
    cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page'],
    ratingSource: 'TMDB',
    checkedAt: CATALOG_CHECKED_AT,
    curationRank: 3,
  },
  'john-wick-2014': {
    title: 'John Wick',
    sourceId: 'tmdb-245891',
    releaseDate: '2014-10-24',
    releaseStatus: 'released',
    director: 'Chad Stahelski',
    cast: ['Keanu Reeves', 'Michael Nyqvist', 'Alfie Allen'],
    ratingSource: 'TMDB',
    checkedAt: CATALOG_CHECKED_AT,
    curationRank: 4,
  },
  'gone-girl-2014': {
    title: 'Gone Girl',
    sourceId: 'tmdb-210577',
    releaseDate: '2014-10-03',
    releaseStatus: 'released',
    director: 'David Fincher',
    cast: ['Ben Affleck', 'Rosamund Pike', 'Neil Patrick Harris'],
    ratingSource: 'TMDB',
    checkedAt: CATALOG_CHECKED_AT,
    curationRank: 5,
  },
  'the-revenant-2015': {
    title: 'The Revenant',
    sourceId: 'tmdb-281957',
    releaseDate: '2015-12-25',
    releaseStatus: 'released',
    director: 'Alejandro González Iñárritu',
    cast: ['Leonardo DiCaprio', 'Tom Hardy', 'Will Poulter'],
    ratingSource: 'TMDB',
    checkedAt: CATALOG_CHECKED_AT,
    curationRank: 6,
  },
  'mad-max--fury-road-2015': {
    title: 'Mad Max: Fury Road',
    sourceId: 'tmdb-76341',
    releaseDate: '2015-05-15',
    releaseStatus: 'released',
    director: 'George Miller',
    cast: ['Tom Hardy', 'Charlize Theron', 'Nicholas Hoult'],
    ratingSource: 'TMDB',
    checkedAt: CATALOG_CHECKED_AT,
    curationRank: 7,
  },
  'the-martian-2015': {
    title: 'The Martian',
    sourceId: 'tmdb-286217',
    releaseDate: '2015-10-02',
    releaseStatus: 'released',
    director: 'Ridley Scott',
    cast: ['Matt Damon', 'Jessica Chastain', 'Kristen Wiig'],
    ratingSource: 'TMDB',
    checkedAt: CATALOG_CHECKED_AT,
    curationRank: 8,
  },
  'prisoners-2013': {
    title: 'Prisoners',
    sourceId: 'tmdb-146233',
    releaseDate: '2013-09-20',
    releaseStatus: 'released',
    director: 'Denis Villeneuve',
    cast: ['Hugh Jackman', 'Jake Gyllenhaal', 'Viola Davis'],
    ratingSource: 'TMDB',
    checkedAt: CATALOG_CHECKED_AT,
    curationRank: 9,
  },
  'world-war-z-2013': {
    title: 'World War Z',
    sourceId: 'tmdb-72190',
    releaseDate: '2013-06-21',
    releaseStatus: 'released',
    director: 'Marc Forster',
    cast: ['Brad Pitt', 'Mireille Enos', 'Daniella Kertesz'],
    ratingSource: 'TMDB',
    checkedAt: CATALOG_CHECKED_AT,
    curationRank: 10,
  },
  'zombieland-2009': {
    title: 'Zombieland',
    sourceId: 'tmdb-19908',
    releaseDate: '2009-10-02',
    releaseStatus: 'released',
    director: 'Ruben Fleischer',
    cast: ['Jesse Eisenberg', 'Woody Harrelson', 'Emma Stone'],
    ratingSource: 'TMDB',
    checkedAt: CATALOG_CHECKED_AT,
    curationRank: 11,
  },
  '28-days-later-2002': {
    title: '28 Days Later',
    sourceId: 'tmdb-170',
    releaseDate: '2002-06-28',
    releaseStatus: 'released',
    director: 'Danny Boyle',
    cast: ['Cillian Murphy', 'Naomie Harris', 'Brendan Gleeson'],
    ratingSource: 'TMDB',
    checkedAt: CATALOG_CHECKED_AT,
    curationRank: 12,
  },
  'alien--romulus-2024': {
    title: 'Alien: Romulus',
    sourceId: 'tmdb-945961',
    releaseDate: '2024-08-16',
    releaseStatus: 'released',
    director: 'Fede Álvarez',
    cast: ['Cailee Spaeny', 'David Jonsson', 'Archie Renaux'],
    ratingSource: 'TMDB',
    checkedAt: CATALOG_CHECKED_AT,
    curationRank: 13,
  },
  'shutter-island-2010': {
    title: 'Shutter Island',
    sourceId: 'tmdb-11324',
    releaseDate: '2010-02-19',
    releaseStatus: 'released',
    director: 'Martin Scorsese',
    cast: ['Leonardo DiCaprio', 'Mark Ruffalo', 'Ben Kingsley'],
    ratingSource: 'TMDB',
    checkedAt: CATALOG_CHECKED_AT,
    curationRank: 14,
  },
  'shaun-of-the-dead-2004': {
    title: 'Shaun of the Dead',
    sourceId: 'tmdb-747',
    releaseDate: '2004-04-09',
    releaseStatus: 'released',
    director: 'Edgar Wright',
    cast: ['Simon Pegg', 'Nick Frost', 'Kate Ashfield'],
    ratingSource: 'TMDB',
    checkedAt: CATALOG_CHECKED_AT,
    curationRank: 15,
  },
  'the-dark-knight-2008': {
    title: 'The Dark Knight',
    sourceId: 'tmdb-155',
    releaseDate: '2008-07-18',
    releaseStatus: 'released',
    director: 'Christopher Nolan',
    cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart'],
    ratingSource: 'TMDB',
    checkedAt: CATALOG_CHECKED_AT,
    curationRank: 16,
  },
  'i-am-legend-2007': {
    title: 'I Am Legend',
    sourceId: 'tmdb-6479',
    releaseDate: '2007-12-14',
    releaseStatus: 'released',
    director: 'Francis Lawrence',
    cast: ['Will Smith', 'Alice Braga', 'Charlie Tahan'],
    ratingSource: 'TMDB',
    checkedAt: CATALOG_CHECKED_AT,
    curationRank: 17,
  },
};

const VALID_SOURCE_ID = /^tmdb-[1-9]\d*$/;
const VALID_MOVIE_ID = /^[a-z0-9]+(?:-+[a-z0-9]+)*-+\d{4}$/;
const VALID_RELEASE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_RATING = /^(?:G|PG|PG-13|R|NC-17|NR|TV-[A-Z0-9-]+|NOT RATED|UNRATED)$/i;
const VALID_IMAGE = /^https:\/\/image\.tmdb\.org\/t\/p\/w(?:500|1280)\/[A-Za-z0-9]+\.jpg$/;
const VALID_TRAILER_ID = /^[A-Za-z0-9_-]{11}$/;
const KNOWN_PLACEHOLDER_TRAILER_IDS = new Set(['c7ynwAgQD-0', 'pyM3z73oMAk']);
const PLACEHOLDER_TEXT = /\b(?:a[- ]list|hollywood|main|generic|unknown|placeholder|director|cast|runtime)\b|\b(?:plot|runtime)\s+(?:tba|unavailable)\b/i;

export interface CatalogQualityResult {
  valid: boolean;
  reasons: string[];
}

function dateValue(value: string): number {
  if (!VALID_RELEASE_DATE.test(value)) return Number.NaN;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = Date.UTC(year, month - 1, day);
  const date = new Date(parsed);
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    ? parsed
    : Number.NaN;
}

function daysBetween(later: string, earlier: string): number {
  const laterValue = dateValue(later);
  const earlierValue = dateValue(earlier);
  if (!Number.isFinite(laterValue) || !Number.isFinite(earlierValue)) return Number.POSITIVE_INFINITY;
  return Math.floor((laterValue - earlierValue) / 86_400_000);
}

function currentUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function hasPlaceholder(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  return value.trim().length === 0 || PLACEHOLDER_TEXT.test(value.trim());
}

/**
 * Mark a source row as bundled discovery data after it has passed the source
 * evidence gate. This function deliberately does not repair or replace any
 * source metadata. Trust must come from the original row.
 */
export function enrichValidatedMovie(movie: Movie, entry: ValidatedCatalogEntry): Movie {
  // A saved or fallback Watchlist row is local recovery data. It must never
  // acquire bundled trust merely because its id happens to match a curated row.
  if (movie.recordSource === 'saved-watchlist'
    || movie.recordSource === 'watchlist-fallback'
    || movie.recordSource === 'tmdb-live') {
    return movie;
  }

  const availability = {
    status: 'discovery' as const,
    source: 'bundled' as const,
    region: CATALOG_REGION,
    checkedAt: entry.checkedAt,
  };

  return {
    ...movie,
    recordSource: 'bundled-validated',
    streamingPlatforms: [],
    availability,
  };
}

/**
 * Deterministic, offline quality gate for records used in trusted surfaces.
 * It intentionally rejects rather than guessing when a required field is
 * missing, stale, future-dated, or shared across unrelated titles.
 */
export function validateCatalogRecord(
  movie: Movie,
  entry: ValidatedCatalogEntry,
  asOf = currentUtcDate(),
  context?: {
    trailerCounts?: ReadonlyMap<string, number>;
    sourceIdCounts?: ReadonlyMap<string, number>;
    localIdCounts?: ReadonlyMap<string, number>;
  },
): CatalogQualityResult {
  const reasons: string[] = [];
  const trailerId = typeof movie.youtubeTrailerId === 'string' ? movie.youtubeTrailerId.trim() : '';
  const movieYear = String(movie.year);
  const movieTitle = typeof movie.title === 'string' ? movie.title.trim() : '';
  const director = typeof movie.director === 'string' ? movie.director : '';
  const cast = Array.isArray(movie.cast) ? movie.cast : [];
  const description = typeof movie.description === 'string' ? movie.description : '';

  if (!VALID_MOVIE_ID.test(movie.id)) reasons.push('invalid local source key');
  if (movie.recordSource && movie.recordSource !== 'bundled-validated') reasons.push('untrusted record provenance');
  if ((context?.localIdCounts?.get(movie.id) ?? 0) > 1) reasons.push('duplicate local source key');
  if (movieTitle !== entry.title) reasons.push('title/source identity mismatch');
  if (!VALID_SOURCE_ID.test(entry.sourceId)) reasons.push('invalid source ID');
  if (movie.sourceId !== entry.sourceId) reasons.push('source identity is missing or mismatched');
  if ((context?.sourceIdCounts?.get(entry.sourceId) ?? 0) > 1) reasons.push('duplicate source ID');
  if (entry.releaseStatus !== 'released') reasons.push('release status is not released');
  if (movie.releaseStatus !== entry.releaseStatus) reasons.push('source release status is missing or mismatched');
  if (!VALID_RELEASE_DATE.test(entry.releaseDate) || !Number.isFinite(dateValue(entry.releaseDate)) || entry.releaseDate.slice(0, 4) !== movieYear) reasons.push('release date is missing or mismatched');
  if (movie.releaseDate !== entry.releaseDate) reasons.push('source release date is missing or mismatched');
  if (!Number.isInteger(movie.year) || movie.year < 1888 || movie.year > 3000) reasons.push('source year is invalid');
  if (Number.isFinite(dateValue(entry.releaseDate)) && entry.releaseDate > asOf) reasons.push('future release date');
  if (!VALID_RELEASE_DATE.test(entry.checkedAt) || entry.checkedAt > asOf) reasons.push('checked date is missing or in the future');
  if (daysBetween(asOf, entry.checkedAt) > CATALOG_FRESHNESS_DAYS) reasons.push('curated metadata is stale');
  if (entry.ratingSource !== 'TMDB') reasons.push('rating provenance is missing');
  if (movie.ratingSource !== entry.ratingSource) reasons.push('source rating provenance is missing or mismatched');
  if (!VALID_RATING.test(movie.rating)) reasons.push('rating is not a recognized certification');
  if (!Number.isFinite(movie.score) || movie.score < 0 || movie.score > 10) reasons.push('legacy rank value is outside its numeric bounds');
  if (hasPlaceholder(director) || cast.length === 0 || cast.some(hasPlaceholder)) reasons.push('placeholder credit');
  if (entry.director !== director || entry.cast.length !== cast.length || entry.cast.some((name, index) => cast[index] !== name)) reasons.push('source credits are missing or mismatched');
  if (!VALID_TRAILER_ID.test(trailerId) || KNOWN_PLACEHOLDER_TRAILER_IDS.has(trailerId)) reasons.push('missing or shared trailer');
  if ((context?.trailerCounts?.get(trailerId) ?? 0) > 1) reasons.push('duplicate trailer ID');
  if (description.trim().length < 40 || /\b(?:plot|description)\s+(?:tba|unavailable)\b/i.test(description)) reasons.push('missing synopsis');
  if (!VALID_IMAGE.test(movie.posterUrl) || !VALID_IMAGE.test(movie.backdropUrl)) reasons.push('unsupported artwork source');

  return { valid: reasons.length === 0, reasons };
}

export function getValidatedCatalogMetadata(movieId: string): ValidatedCatalogEntry | undefined {
  return VALIDATED_CATALOG_ENTRIES[movieId];
}

export function isValidatedCatalogMovie(movie: Movie): boolean {
  const entry = getValidatedCatalogMetadata(movie.id);
  return Boolean(entry && validateCatalogRecord(movie, entry).valid);
}

/** Return the only records allowed to feed featured, recommended, and planner surfaces. */
export function getValidatedCatalog(movies: readonly Movie[]): Movie[] {
  const byId = new Map(movies.map((movie) => [movie.id, movie]));
  const trailerCounts = new Map<string, number>();
  const sourceIdCounts = new Map<string, number>();
  const localIdCounts = new Map<string, number>();
  for (const movie of movies) {
    const trailerId = typeof movie.youtubeTrailerId === 'string' ? movie.youtubeTrailerId.trim() : '';
    trailerCounts.set(trailerId, (trailerCounts.get(trailerId) ?? 0) + 1);
    localIdCounts.set(movie.id, (localIdCounts.get(movie.id) ?? 0) + 1);
    if (movie.sourceId) sourceIdCounts.set(movie.sourceId, (sourceIdCounts.get(movie.sourceId) ?? 0) + 1);
  }
  return Object.entries(VALIDATED_CATALOG_ENTRIES)
    .sort(([, left], [, right]) => left.curationRank - right.curationRank)
    .flatMap(([movieId, entry]) => {
      const movie = byId.get(movieId);
      if (!movie) return [];
      if (movie.recordSource === 'saved-watchlist'
        || movie.recordSource === 'watchlist-fallback'
        || movie.recordSource === 'tmdb-live') return [];
      if (!validateCatalogRecord(movie, entry, currentUtcDate(), { trailerCounts, sourceIdCounts, localIdCounts }).valid) return [];
      return [enrichValidatedMovie(movie, entry)];
    });
}
