import type { Movie } from '../data/catalog';

export type SortMode = 'featured' | 'newest' | 'oldest' | 'title';

export const SORT_OPTIONS = [
  { id: 'featured', label: 'Featured' },
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'title', label: 'A to Z' },
] as const satisfies ReadonlyArray<{ id: SortMode; label: string }>;

type Sortable = Pick<Movie, 'id' | 'title' | 'year'> & Partial<Pick<Movie, 'trending' | 'voteCount'>>;

/**
 * True only when the catalog can prove a title has not come out yet: a future
 * year, or a readable future release date. A current-year title with no release
 * date stays visible because nothing says it is unreleased.
 */
export function isKnownUnreleased(
  movie: Pick<Movie, 'year'> & Partial<Pick<Movie, 'releaseDate'>>,
  now: Date = new Date(),
): boolean {
  if (movie.year > now.getUTCFullYear()) return true;
  if (!movie.releaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(movie.releaseDate)) return false;
  return movie.releaseDate > now.toISOString().slice(0, 10);
}

/** How many titles browsing lists: every record except the ones it hides as unreleased. */
export function countBrowsable(
  movies: ReadonlyArray<Pick<Movie, 'year'> & Partial<Pick<Movie, 'releaseDate'>>>,
  now: Date = new Date(),
): number {
  return movies.filter((movie) => !isKnownUnreleased(movie, now)).length;
}

// One collator for every comparison: localeCompare with options builds a new one per call, which made sorting the
// full catalog about 50 times slower.
const titleCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const byTitle = (left: Sortable, right: Sortable) => titleCollator.compare(left.title, right.title);

/**
 * Orders a list without mutating it. "Featured" uses only fields the catalog can
 * stand behind: reviewed titles by curation rank, then titles by TMDB vote count
 * (how well known they are), then editorially flagged titles, then a neutral A to
 * Z. The legacy `score` field is not a popularity signal, so no mode ranks by it.
 */
export function sortMovies<T extends Sortable>(
  movies: readonly T[],
  mode: SortMode,
  curationRank: (movieId: string) => number | undefined,
): T[] {
  const sorted = [...movies];
  if (mode === 'newest') return sorted.sort((left, right) => right.year - left.year || byTitle(left, right));
  if (mode === 'oldest') return sorted.sort((left, right) => left.year - right.year || byTitle(left, right));
  if (mode === 'title') return sorted.sort(byTitle);
  return sorted.sort((left, right) => {
    const leftRank = curationRank(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = curationRank(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftRank - rightRank
      || (right.voteCount ?? 0) - (left.voteCount ?? 0)
      || Number(Boolean(right.trending)) - Number(Boolean(left.trending))
      || byTitle(left, right);
  });
}
