import type { Movie } from '../data/catalog';

export interface ShareEligibility {
  shareable: boolean;
  reason?: string;
  sourceLabel: string;
}

function isValidIsoDate(value?: string): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = Date.UTC(year, month - 1, day);
  const date = new Date(parsed);
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function isFutureRecord(movie: Movie, asOf = todayUtc()): boolean {
  if (movie.year > Number(asOf.slice(0, 4))) return true;
  return Boolean(movie.releaseDate && isValidIsoDate(movie.releaseDate) && movie.releaseDate > asOf);
}

/** The record provenance is separate from provider availability provenance. */
export function getMovieSourceLabel(movie: Movie): string {
  if (movie.recordSource === 'watchlist-fallback') return 'StreamFlicker saved Watchlist fallback';
  if (movie.recordSource === 'saved-watchlist') return 'StreamFlicker saved Watchlist record';
  if (/^tmdb-[1-9]\d*$/.test(movie.id) && movie.availability?.source === 'tmdb') return 'TMDB live result';
  if (movie.recordSource === 'bundled-validated') return 'StreamFlicker bundled discovery (validated subset)';
  return 'StreamFlicker bundled discovery (search-only)';
}

/** Share is reserved for records whose identity and provenance can be stated honestly. */
export function getShareEligibility(movie: Movie): ShareEligibility {
  const sourceLabel = getMovieSourceLabel(movie);
  if (movie.recordSource === 'watchlist-fallback') {
    return { shareable: false, sourceLabel, reason: 'This saved Watchlist fallback is search-only and cannot be shared until the catalog record is refreshed.' };
  }
  if (movie.recordSource === 'saved-watchlist') {
    return { shareable: false, sourceLabel, reason: 'Saved Watchlist records are search-only. Open the current catalog result before sharing.' };
  }
  if (isFutureRecord(movie)) {
    return { shareable: false, sourceLabel, reason: 'Future or unreleased titles are search-only and cannot be shared as current movie records.' };
  }

  const isLive = sourceLabel === 'TMDB live result';
  if (isLive) {
    const region = movie.availability?.region?.trim().toUpperCase() ?? '';
    const checkedAt = movie.availability?.checkedAt?.slice(0, 10);
    if (!/^[A-Z]{2}$/.test(region) || !isValidIsoDate(checkedAt) || checkedAt! > todayUtc()) {
      return { shareable: false, sourceLabel, reason: 'This live result has no valid region and checked date, so it remains search-only.' };
    }
    return { shareable: true, sourceLabel };
  }

  if (movie.recordSource === 'bundled-validated' && movie.availability?.source === 'bundled') {
    const checkedAt = movie.availability.checkedAt?.slice(0, 10);
    if (isValidIsoDate(checkedAt) && checkedAt! <= todayUtc()) {
      return { shareable: true, sourceLabel };
    }
    return { shareable: false, sourceLabel, reason: 'This bundled record no longer carries current validated evidence, so it remains search-only.' };
  }
  return { shareable: false, sourceLabel, reason: 'This bundled discovery record is search-only until its identity and curated evidence are validated.' };
}

/** "checked Sep 23, 2026" for an ISO date or timestamp, or "checked date unavailable". */
export function formatCheckedDate(value?: string): string {
  const normalized = value?.slice(0, 10);
  if (!normalized || !isValidIsoDate(normalized)) return 'checked date unavailable';
  const [year, month, day] = normalized.split('-').map(Number);
  // Date.UTC months are zero-based; the ISO string's are one-based.
  const parsed = Date.UTC(year, month - 1, day);
  return `checked ${new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(parsed))}`;
}

function getAvailabilitySource(movie: Movie): string {
  if (movie.availability?.source === 'tmdb') return 'TMDB/JustWatch';
  if (movie.availability?.source === 'bundled') return 'StreamFlicker bundled discovery';
  return 'source unavailable';
}

function getAvailabilityStatus(movie: Movie): string {
  return movie.availability?.status ?? 'status unavailable';
}

/** A compact, visible disclosure suitable for cards and copied share text. */
export function getAvailabilityDisclosure(movie: Movie): string {
  const region = movie.availability?.region?.toUpperCase() || 'US';
  return `Record source: ${getMovieSourceLabel(movie)}; Availability source: ${getAvailabilitySource(movie)}; region: ${region}; status: ${getAvailabilityStatus(movie)}; ${formatCheckedDate(movie.availability?.checkedAt)}.`;
}

export function getAvailabilityCheckedLabel(movie: Movie): string {
  return formatCheckedDate(movie.availability?.checkedAt);
}

export function getAvailabilityAttribution(movie: Movie): string {
  if (movie.availability?.source === 'tmdb') {
    if (movie.availability.status !== 'verified' && movie.availability.status !== 'not-found') {
      return 'TMDB/JustWatch provider lookup was unavailable for this record. Attribution does not imply commercial permission; check current availability before watching or paying.';
    }
    return 'Provider data by JustWatch through TMDB. Attribution does not imply commercial permission, and listings can change.';
  }
  if (movie.availability?.source === 'bundled') {
    return 'This bundled record has no live provider result. Check current availability before watching or paying.';
  }
  return 'No provider source was supplied for this record. Check current availability before watching or paying.';
}

const LIVE_DATA_CREDIT = 'Streaming data from JustWatch via TMDB.';

/** The one-line pitch for a title, without its link. */
export function getMovieShareHeadline(movie: Movie): string {
  return `${movie.title} (${movie.year}) on StreamFlicker: trailer and where to watch`;
}

/**
 * A message a friend would actually read in a chat. Record provenance stays in
 * the app (the title's details), but live provider data keeps its attribution.
 */
export function buildMovieShareText(movie: Movie, shareUrl: string): string {
  const eligibility = getShareEligibility(movie);
  if (!eligibility.shareable) {
    return [`Search-only result: ${movie.title} cannot be shared.`, eligibility.reason].filter(Boolean).join(' ');
  }
  return [
    `${getMovieShareHeadline(movie)} ${shareUrl}`.trim(),
    movie.availability?.source === 'tmdb' ? LIVE_DATA_CREDIT : '',
  ].filter(Boolean).join(' ');
}

const CHECKED_MARK = '(checked on TMDB)';

/**
 * A movie-night plan lists the reviewed picks and the well-known titles that were matched to TMDB ("checked"). Checked
 * picks carry a mark and the footnote says what it means, so a plan never claims more review than its picks have. Any
 * other bundled title is left out and counted.
 */
export function buildMovieNightShareText(summary: string, movies: readonly Movie[], siteUrl = ''): string {
  const isChecked = (movie: Movie) => movie.recordSource === 'tmdb-checked';
  const shareable = movies.filter((movie) => getShareEligibility(movie).shareable);
  const listed = movies.filter((movie) => getShareEligibility(movie).shareable || isChecked(movie));
  const skipped = movies.length - listed.length;
  const lines = [
    'My StreamFlicker movie night',
    summary,
    ...(listed.length > 0
      ? listed.map((movie, index) => `${index + 1}. ${movie.title} (${movie.year})${isChecked(movie) ? ` ${CHECKED_MARK}` : ''}`)
      : ['No picks to share yet.']),
  ];
  if (skipped > 0) {
    lines.push(`${skipped} more ${skipped === 1 ? "pick isn't" : "picks aren't"} listed because ${skipped === 1 ? "it hasn't" : "they haven't"} been reviewed yet.`);
  }
  if (listed.length > 0) {
    if (siteUrl) lines.push(`Trailers and where to watch: ${siteUrl}`);
    if (!listed.some(isChecked)) {
      lines.push(`Picks come from StreamFlicker's reviewed list (${getAvailabilityCheckedLabel(shareable[0])}). Check availability before you pay.`);
    } else if (shareable.length > 0) {
      lines.push(`Picks marked "checked on TMDB" were matched to TMDB but are not hand-reviewed; the others come from StreamFlicker's reviewed list (${getAvailabilityCheckedLabel(shareable[0])}). Check availability before you pay.`);
    } else {
      lines.push('These picks were matched to TMDB but are not hand-reviewed. Check availability before you pay.');
    }
    if (shareable.some((movie) => movie.availability?.source === 'tmdb')) lines.push(LIVE_DATA_CREDIT);
  }
  return lines.join('\n');
}
