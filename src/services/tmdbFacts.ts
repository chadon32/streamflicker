/*
 * The rules for turning TMDB responses into catalog facts. Everything here is pure and has no imports, so the
 * test runner (which transpiles one file at a time) and the catalog generator can load it directly.
 */

export type MatchProof = 'poster' | 'title-year';

/**
 * One title's facts as read from TMDB: TMDB id, US certification, runtime in minutes, vote count, YouTube
 * trailer key ('' when there is none), how the title was identified, and the ISO date the values were read.
 */
export type TmdbFact = readonly [
  tmdbId: number,
  certification: string,
  runtimeMinutes: number,
  voteCount: number,
  trailerKey: string,
  proof: MatchProof,
  checkedAt: string,
];

/** TMDB's terms limit caching to six months, so facts are refreshed well before that. */
export const TMDB_FACT_MAX_AGE_DAYS = 150;

export interface CatalogRecordRef {
  id: string;
  title: string;
  year: number;
  /** Poster path as stored in the catalog: no image host and no leading slash. */
  posterPath: string;
}

export interface TmdbSearchResult {
  id: number;
  title?: string;
  original_title?: string;
  release_date?: string;
  poster_path?: string | null;
}

export interface TmdbMatch {
  tmdbId: number;
  proof: MatchProof;
}

export interface TmdbReleaseDate {
  certification?: string;
  type?: number;
}

export interface TmdbVideo {
  key?: string;
  site?: string;
  type?: string;
  official?: boolean;
  name?: string;
  published_at?: string;
  iso_639_1?: string;
}

export interface TmdbDetails {
  id: number;
  release_date?: string;
  runtime?: number | null;
  status?: string;
  vote_count?: number;
  release_dates?: { results?: Array<{ iso_3166_1?: string; release_dates?: TmdbReleaseDate[] }> };
  videos?: { results?: TmdbVideo[] };
}

export type FactResult =
  | { ok: true; fact: TmdbFact }
  | { ok: false; reason: 'not-released' | 'no-runtime' | 'runtime-out-of-range' | 'no-certification' | 'year-mismatch' };

/** The fields of a catalog record that a fact changes. */
export interface FactTarget {
  id: string;
  rating: string;
  duration: string;
  youtubeTrailerId: string;
}

const MIN_RUNTIME_MINUTES = 40;
const MAX_RUNTIME_MINUTES = 400;
const MS_PER_DAY = 86_400_000;
const CERTIFICATION_PATTERN = /^(?:G|PG|PG-13|R|NC-17|NOT RATED|TV-[A-Z0-9]+)$/;
const YOUTUBE_KEY_PATTERN = /^[A-Za-z0-9_-]{11}$/;
// TMDB release types: 3 theatrical, 2 limited theatrical, 4 digital, 5 physical, 6 TV, 1 premiere. The theatrical
// certification is the one people mean; a festival premiere is often "NR".
const CERTIFICATION_TYPE_ORDER = [3, 2, 4, 5, 6, 1];

/** Lowercase, accent-free, punctuation-free form used to compare titles. */
export function normalizeTitle(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titlesMatch(left: string, right: string): boolean {
  const normalized = normalizeTitle(left);
  return normalized.length > 0 && normalized === normalizeTitle(right);
}

function releaseYear(date: string | undefined): number {
  const year = Number(date?.slice(0, 4));
  return Number.isInteger(year) ? year : 0;
}

function posterKey(path: string | null | undefined): string {
  return (path ?? '').trim().replace(/^\/+/, '');
}

/**
 * Identify a catalog record among TMDB search results. The same poster is proof (a poster path is unique to one
 * film); otherwise exactly one result with an equal title and release year is accepted. Anything ambiguous or
 * unproven returns null, and the record stays unverified.
 */
export function matchTmdbMovie(record: CatalogRecordRef, candidates: readonly TmdbSearchResult[]): TmdbMatch | null {
  const poster = posterKey(record.posterPath);
  if (poster) {
    const byPoster = candidates.filter((candidate) =>
      posterKey(candidate.poster_path) === poster && Math.abs(releaseYear(candidate.release_date) - record.year) <= 1);
    if (byPoster.length === 1) return { tmdbId: byPoster[0].id, proof: 'poster' };
    if (byPoster.length > 1) return null;
  }
  const byTitle = candidates.filter((candidate) =>
    releaseYear(candidate.release_date) === record.year
    && [candidate.title, candidate.original_title].some((name) => typeof name === 'string' && titlesMatch(name, record.title)));
  return byTitle.length === 1 ? { tmdbId: byTitle[0].id, proof: 'title-year' } : null;
}

function normalizeCertification(value: string): string {
  const upper = value.trim().toUpperCase();
  if (upper === 'NR' || upper === 'UNRATED') return 'NOT RATED';
  return CERTIFICATION_PATTERN.test(upper) ? upper : '';
}

/** The US certification, preferring the theatrical release; '' when TMDB has no recognizable one. */
export function pickUsCertification(details: TmdbDetails): string {
  const us = details.release_dates?.results?.find((entry) => entry.iso_3166_1 === 'US');
  const rank = (type: number | undefined) => {
    const index = CERTIFICATION_TYPE_ORDER.indexOf(type ?? -1);
    return index < 0 ? CERTIFICATION_TYPE_ORDER.length : index;
  };
  const ordered = [...(us?.release_dates ?? [])].sort((left, right) => rank(left.type) - rank(right.type));
  for (const entry of ordered) {
    const certification = normalizeCertification(entry.certification ?? '');
    if (certification) return certification;
  }
  return '';
}

/** An official YouTube trailer: English first, then one named "Official Trailer", then the earliest published. */
export function pickTrailerKey(details: TmdbDetails): string {
  const trailers = (details.videos?.results ?? []).filter((video) =>
    video.official === true
    && video.site === 'YouTube'
    && video.type === 'Trailer'
    && typeof video.key === 'string'
    && YOUTUBE_KEY_PATTERN.test(video.key));
  const penalty = (video: TmdbVideo) => (video.iso_639_1 === 'en' ? 0 : 2) + (/official trailer/i.test(video.name ?? '') ? 0 : 1);
  trailers.sort((left, right) => penalty(left) - penalty(right) || (left.published_at ?? '').localeCompare(right.published_at ?? ''));
  return trailers[0]?.key ?? '';
}

export function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

/** Turn a matched title's TMDB details into a fact, or say why it cannot be trusted. */
export function buildFact(record: CatalogRecordRef, match: TmdbMatch, details: TmdbDetails, checkedAt: string): FactResult {
  if (details.status && details.status !== 'Released') return { ok: false, reason: 'not-released' };
  if (Math.abs(releaseYear(details.release_date) - record.year) > 1) return { ok: false, reason: 'year-mismatch' };
  const runtime = details.runtime;
  if (typeof runtime !== 'number' || !Number.isFinite(runtime) || runtime <= 0) return { ok: false, reason: 'no-runtime' };
  if (!Number.isInteger(runtime) || runtime < MIN_RUNTIME_MINUTES || runtime > MAX_RUNTIME_MINUTES) return { ok: false, reason: 'runtime-out-of-range' };
  const certification = pickUsCertification(details);
  if (!certification) return { ok: false, reason: 'no-certification' };
  const votes = details.vote_count;
  const voteCount = typeof votes === 'number' && Number.isInteger(votes) && votes > 0 ? votes : 0;
  return { ok: true, fact: [match.tmdbId, certification, runtime, voteCount, pickTrailerKey(details), match.proof, checkedAt] };
}

/** True while the values are young enough to keep (a future or unreadable date is never fresh). */
export function isFactFresh(checkedAt: string, now: Date, maxAgeDays: number = TMDB_FACT_MAX_AGE_DAYS): boolean {
  const checked = Date.parse(`${checkedAt}T00:00:00Z`);
  if (!Number.isFinite(checked)) return false;
  const age = (now.getTime() - checked) / MS_PER_DAY;
  return age >= 0 && age <= maxAgeDays;
}

/**
 * Overlay facts on catalog records. Reviewed ids are skipped (their facts are curated), a usable trailer already
 * in the catalog is never replaced, and records without a fact come back untouched.
 */
export function applyTmdbFacts<T extends FactTarget>(
  movies: readonly T[],
  facts: Readonly<Record<string, TmdbFact>>,
  options: { skipIds: ReadonlySet<string>; validTrailerId: (value: string) => string },
): T[] {
  return movies.map((movie) => {
    if (options.skipIds.has(movie.id) || !Object.prototype.hasOwnProperty.call(facts, movie.id)) return movie;
    const [, certification, runtimeMinutes, voteCount, trailerKey] = facts[movie.id];
    const trailer = options.validTrailerId(movie.youtubeTrailerId) || trailerKey || movie.youtubeTrailerId;
    return {
      ...movie,
      rating: certification,
      duration: formatRuntime(runtimeMinutes),
      recordSource: 'tmdb-checked',
      ratingSource: 'TMDB',
      ...(voteCount > 0 ? { voteCount } : {}),
      // Verified only when the trailer in use is TMDB's own official one, whether it was filled in or already identical.
      ...(trailerKey && trailer === trailerKey ? { trailerVerified: true } : {}),
      youtubeTrailerId: trailer,
    } as T;
  });
}
