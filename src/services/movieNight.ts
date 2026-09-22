import type { Movie } from '../data/catalog';
import {
  isDateNightFriendly,
  isFamilyFriendly,
} from './discovery';

export type MovieNightOccasion = 'any' | 'family' | 'date-night' | 'friends' | 'solo';
export type MovieNightLength = 'any' | 'short' | 'standard' | 'epic';

export interface MovieNightPreferences {
  occasion: MovieNightOccasion;
  length: MovieNightLength;
  genre: string;
  providerId: string;
}

export interface MovieNightPlan {
  createdAt: string;
  preferences: MovieNightPreferences;
  movieIds: string[];
}

const MOVIE_NIGHT_OCCASIONS = new Set<MovieNightOccasion>(['any', 'family', 'date-night', 'friends', 'solo']);
const MOVIE_NIGHT_LENGTHS = new Set<MovieNightLength>(['any', 'short', 'standard', 'epic']);

/** Validates a browser-saved plan before it reaches the planner UI. */
export function normalizeMovieNightPlan(value: unknown): MovieNightPlan | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<MovieNightPlan>;
  const preferences = candidate.preferences;
  if (!preferences
    || typeof candidate.createdAt !== 'string'
    || !Number.isFinite(Date.parse(candidate.createdAt))
    || !MOVIE_NIGHT_OCCASIONS.has(preferences.occasion)
    || !MOVIE_NIGHT_LENGTHS.has(preferences.length)
    || typeof preferences.genre !== 'string'
    || typeof preferences.providerId !== 'string'
    || !Array.isArray(candidate.movieIds)
    || !candidate.movieIds.every((id) => typeof id === 'string' && id.length > 0)) return null;

  const movieIds = [...new Set(candidate.movieIds)];
  if (movieIds.length === 0) return null;
  return {
    createdAt: candidate.createdAt,
    preferences: {
      occasion: preferences.occasion,
      length: preferences.length,
      genre: preferences.genre,
      providerId: preferences.providerId,
    },
    movieIds,
  };
}

/** Keeps browser storage and displayed saved plans aligned and duplicate-free. */
export function deduplicateMovieNightPlans(plans: readonly MovieNightPlan[], limit = 12): MovieNightPlan[] {
  const maximum = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  if (maximum === 0) return [];
  const seen = new Set<string>();
  const uniquePlans: MovieNightPlan[] = [];
  for (const plan of plans) {
    const normalized = normalizeMovieNightPlan(plan);
    if (!normalized) continue;
    const key = JSON.stringify(normalized.movieIds);
    if (seen.has(key)) continue;
    seen.add(key);
    uniquePlans.push(normalized);
    if (uniquePlans.length === maximum) break;
  }
  return uniquePlans;
}

function parseMovieDurationMinutes(duration: string): number {
  const hours = Number(duration.match(/(\d+)h/)?.[1] ?? 0);
  const minutes = Number(duration.match(/(\d+)m/)?.[1] ?? 0);
  return hours * 60 + minutes;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function matchesLength(movie: Movie, length: MovieNightLength): boolean {
  if (length === 'any') return true;
  const minutes = parseMovieDurationMinutes(movie.duration);
  // A bounded runtime filter must not make an unverified runtime claim.
  if (minutes <= 0) return false;
  if (length === 'short') return minutes <= 100;
  if (length === 'standard') return minutes >= 101 && minutes <= 150;
  return minutes > 150;
}

function matchesMovieNightOccasion(movie: Movie, occasion: MovieNightOccasion): boolean {
  if (occasion === 'family') return isFamilyFriendly(movie);
  if (occasion === 'date-night') return isDateNightFriendly(movie);
  if (occasion === 'friends') {
    return movie.rating.trim().toUpperCase() !== 'R'
      && !movie.genre.includes('Documentary')
      && (movie.genre.includes('Comedy') || movie.genre.includes('Action') || movie.genre.includes('Adventure'));
  }
  if (occasion === 'solo') return !isFamilyFriendly(movie) || movie.genre.includes('Drama');
  return true;
}

function matchesProvider(movie: Movie, providerId: string): boolean {
  if (providerId === 'any') return true;
  return movie.availability?.status === 'verified'
    && movie.streamingPlatforms.some((provider) =>
      provider.id === providerId && provider.availabilityStatus === 'verified');
}

function preferenceScore(movie: Movie, preferences: MovieNightPreferences, preferredMovieIds?: ReadonlySet<string>): number {
  let score = movie.score * 10 + movie.matchPercentage / 10;
  if (preferences.genre !== 'All' && movie.genre.includes(preferences.genre)) score += 35;
  if (preferences.providerId !== 'any' && matchesProvider(movie, preferences.providerId)) score += 15;
  if (movie.trending) score += 4;
  if (movie.featured) score += 2;
  if (preferredMovieIds?.has(movie.id)) score += 8;
  return score;
}

/**
 * Returns only titles that match every selected preference. Provider matches
 * are limited to title-level, verified regional availability records.
 */
export function getMovieNightCandidates(
  movies: Movie[],
  preferences: MovieNightPreferences,
  preferredMovieIds?: ReadonlySet<string>,
): Movie[] {
  return movies.filter((movie) =>
    matchesMovieNightOccasion(movie, preferences.occasion)
    && matchesLength(movie, preferences.length)
    && (preferences.genre === 'All' || movie.genre.includes(preferences.genre))
    && matchesProvider(movie, preferences.providerId),
  )
    .sort((left, right) => {
      const scoreDifference = preferenceScore(right, preferences, preferredMovieIds) - preferenceScore(left, preferences, preferredMovieIds);
      if (scoreDifference !== 0) return scoreDifference;
      return stableHash(`${preferences.occasion}:${preferences.length}:${preferences.genre}:${preferences.providerId}:${left.id}`)
        - stableHash(`${preferences.occasion}:${preferences.length}:${preferences.genre}:${preferences.providerId}:${right.id}`);
    });
}

/**
 * Selects a deterministic page from the strict candidates. Each round starts
 * at the next cohort; a partial final cohort wraps only to keep a three-pick
 * page when there are enough distinct candidates.
 */
export function selectMovieNightMovies(
  movies: Movie[],
  preferences: MovieNightPreferences,
  round = 0,
  limit = 3,
  preferredMovieIds?: ReadonlySet<string>,
): Movie[] {
  const candidates = getMovieNightCandidates(movies, preferences, preferredMovieIds);
  const pageSize = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  if (candidates.length === 0 || pageSize === 0) return [];

  const resultSize = Math.min(pageSize, candidates.length);
  const cohortCount = Math.ceil(candidates.length / pageSize);
  const roundIndex = Number.isFinite(round) ? Math.floor(round) : 0;
  const normalizedRound = ((roundIndex % cohortCount) + cohortCount) % cohortCount;
  const start = (normalizedRound * pageSize) % candidates.length;

  return Array.from({ length: resultSize }, (_, index) => candidates[(start + index) % candidates.length]);
}

export function getMovieNightSummary(preferences: MovieNightPreferences): string {
  const occasion = {
    any: 'any occasion',
    family: 'a family night',
    'date-night': 'date night',
    friends: 'a night with friends',
    solo: 'a solo watch',
  }[preferences.occasion];
  const length = {
    any: 'any runtime',
    short: '100 minutes or less',
    standard: '101–150 minutes',
    epic: 'more than 150 minutes',
  }[preferences.length];
  const genre = preferences.genre === 'All' ? 'any genre' : preferences.genre;
  return `Curated for ${occasion}, ${length}, and ${genre.toLowerCase()}.`;
}

export function getMovieNightGenres(movies: Movie[]): string[] {
  return [...new Set(movies.flatMap((movie) => movie.genre))]
    .filter((genre) => genre && genre !== 'Other')
    .sort((left, right) => left.localeCompare(right));
}
