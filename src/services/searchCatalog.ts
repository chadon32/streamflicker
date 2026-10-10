/**
 * Shared, dependency-free search helpers.  Keeping the normalization and
 * collection rules in one place prevents the browser and the TMDB function
 * from making subtly different decisions about a franchise query.
 */

const FUSED_TOKEN_ALIASES: Record<string, string> = {
  spiderman: 'spider man',
  spiderverse: 'spider verse',
  xmen: 'x men',
  starwars: 'star wars',
  startrek: 'star trek',
  harrypotter: 'harry potter',
  jurassicpark: 'jurassic park',
  missionimpossible: 'mission impossible',
  lordoftherings: 'lord of the rings',
  planetofapes: 'planet of the apes',
};

export const FRANCHISE_SUFFIXES = new Set([
  'movies',
  'films',
  'franchise',
  'collection',
  'saga',
  'series',
]);

export interface SearchCollectionSummary {
  id: number;
  name: string;
  partCount?: number;
  searchAliases?: string[];
}

export interface SearchCollectionPartMetadata {
  collectionId?: number;
  collectionName?: string;
  collectionPartPosition?: number;
  collectionPartCount?: number;
  searchAliases?: string[];
}

export interface SearchMovieCandidate extends SearchCollectionPartMetadata {
  id: number;
  title?: string;
  original_title?: string;
  release_date?: string;
  adult?: boolean;
  [key: string]: unknown;
}

export interface SearchCollectionCandidate extends SearchCollectionSummary {
  parts?: SearchMovieCandidate[];
}

export function normalizeSearchText(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((token) => (FUSED_TOKEN_ALIASES[token] ?? token).split(' '))
    .join(' ');
}

export function stripFranchiseSuffix(value: string): string {
  const tokens = normalizeSearchText(value).split(' ').filter(Boolean);
  while (tokens.length > 0 && FRANCHISE_SUFFIXES.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  return tokens.join(' ');
}

export function getSearchQueryVariants(value: string): string[] {
  const normalized = normalizeSearchText(value);
  const base = stripFranchiseSuffix(normalized);
  return [...new Set([normalized, base].filter(Boolean))];
}

/**
 * Query sent to TMDB. Plural/franchise suffixes describe the desired result
 * set rather than a title, so remove them after expanding fused aliases.
 * Singular "movie" and "film" intentionally remain for real titles such as
 * "Scary Movie" and "A Minecraft Movie".
 */
export function normalizeMovieSearchQuery(value: string): string {
  return stripFranchiseSuffix(normalizeSearchText(value));
}

function tokens(value: string): string[] {
  return stripFranchiseSuffix(value).split(' ').filter(Boolean);
}

function containsContiguousPhrase(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  return haystack.some((_, index) => needle.every((token, offset) => haystack[index + offset] === token));
}

/**
 * A collection is expanded only when its name describes the query directly.
 * This deliberately rejects a generic collection that merely happens to
 * contain one query token, while still allowing useful names such as
 * "James Bond Collection" for a search for "bond".
 */
export function isStrongCollectionMatch(query: string, collectionName: string): boolean {
  const queryTokens = tokens(query);
  const collectionTokens = tokens(collectionName);
  if (queryTokens.length === 0 || collectionTokens.length === 0) return false;

  const normalizedQuery = queryTokens.join(' ');
  const normalizedCollection = collectionTokens.join(' ');
  if (normalizedCollection === normalizedQuery) return true;

  const allQueryTokensPresent = queryTokens.every((token) => collectionTokens.includes(token));
  if (!allQueryTokensPresent) return false;

  // Multi-word titles need a contiguous franchise phrase.  For a one-word
  // query allow a collection name with a small descriptive prefix/suffix, but
  // do not expand arbitrary collections whose names only mention the token.
  if (queryTokens.length > 1) {
    return containsContiguousPhrase(collectionTokens, queryTokens)
      && collectionTokens.length - queryTokens.length <= 2;
  }

  return collectionTokens.length <= 4
    && (collectionTokens[0] === queryTokens[0]
      || collectionTokens[collectionTokens.length - 1] === queryTokens[0]);
}

export function selectStrongCollections<T extends SearchCollectionSummary>(
  query: string,
  collections: T[],
  limit = 3,
): T[] {
  const matches = collections
    .filter((collection) => Number.isInteger(collection.id) && collection.id > 0)
    .filter((collection) => isStrongCollectionMatch(query, collection.name))
    .sort((left, right) => {
      const leftExact = stripFranchiseSuffix(left.name) === stripFranchiseSuffix(query) ? 1 : 0;
      const rightExact = stripFranchiseSuffix(right.name) === stripFranchiseSuffix(query) ? 1 : 0;
      return rightExact - leftExact || left.name.localeCompare(right.name) || left.id - right.id;
    });

  return matches.slice(0, Math.max(1, Math.min(5, limit)));
}

function releaseDateValue(value?: string): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function titleValue(movie: SearchMovieCandidate): string {
  return (movie.title ?? movie.original_title ?? '').trim();
}

function sortCollectionParts(left: SearchMovieCandidate, right: SearchMovieCandidate): number {
  return releaseDateValue(left.release_date) - releaseDateValue(right.release_date)
    || titleValue(left).localeCompare(titleValue(right))
    || left.id - right.id;
}

function mergePartMetadata(
  candidate: SearchMovieCandidate,
  metadata: SearchCollectionPartMetadata,
): SearchMovieCandidate {
  return {
    ...candidate,
    ...(metadata.collectionId ? { collectionId: metadata.collectionId } : {}),
    ...(metadata.collectionName ? { collectionName: metadata.collectionName } : {}),
    ...(metadata.collectionPartPosition ? { collectionPartPosition: metadata.collectionPartPosition } : {}),
    ...(metadata.collectionPartCount ? { collectionPartCount: metadata.collectionPartCount } : {}),
    ...(metadata.searchAliases?.length
      ? { searchAliases: [...new Set([...(candidate.searchAliases ?? []), ...metadata.searchAliases])] }
      : {}),
  };
}

/**
 * Merge direct search hits and collection parts by numeric TMDB ID.  Collection
 * parts are ordered by release date inside each collection; direct results
 * retain TMDB's search order after the expanded franchise titles.
 */
export function mergeTMDBMovieCandidates(
  directResults: SearchMovieCandidate[],
  collections: SearchCollectionCandidate[],
  maxResults = 80,
): SearchMovieCandidate[] {
  const byId = new Map<number, SearchMovieCandidate>();
  const collectionResults: SearchMovieCandidate[] = [];

  for (const collection of collections) {
    const validParts = (collection.parts ?? [])
      .filter((part) => Number.isInteger(part.id) && part.id > 0 && part.adult !== true)
      .sort(sortCollectionParts);
    const partCount = collection.partCount ?? validParts.length;
    validParts.forEach((part, index) => {
      const prepared = mergePartMetadata(part, {
        collectionId: collection.id,
        collectionName: collection.name,
        collectionPartPosition: index + 1,
        collectionPartCount: partCount,
        searchAliases: [collection.name, stripFranchiseSuffix(collection.name)],
      });
      if (!byId.has(prepared.id)) {
        byId.set(prepared.id, prepared);
        collectionResults.push(prepared);
      } else {
        const existing = byId.get(prepared.id)!;
        byId.set(prepared.id, mergePartMetadata(existing, prepared));
      }
    });
  }

  for (const direct of directResults) {
    if (!Number.isInteger(direct.id) || direct.id <= 0 || direct.adult === true) continue;
    const existing = byId.get(direct.id);
    if (existing) {
      // Direct hits carry the freshest search synopsis/poster while retaining
      // the franchise metadata already attached to the collection part.
      byId.set(direct.id, mergePartMetadata({ ...existing, ...direct }, existing));
    } else {
      byId.set(direct.id, direct);
    }
  }

  const ordered = [
    ...collectionResults.map((part) => byId.get(part.id) ?? part),
    ...directResults
      .filter((direct) => byId.has(direct.id) && !collectionResults.some((part) => part.id === direct.id))
      .map((direct) => byId.get(direct.id) ?? direct),
  ];
  const seen = new Set<number>();
  return ordered.filter((movie) => {
    if (seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  }).slice(0, Math.max(1, maxResults));
}

export interface MergeableMovie {
  id: string;
  title: string;
  year: number;
  availability?: { status?: string };
}

function normalizedTitleYear(movie: MergeableMovie): string {
  return `${movie.title.toLowerCase().replace(/[^a-z0-9]/g, '')}-${movie.year}`;
}

function isVerifiedMovie(movie: MergeableMovie): boolean {
  return movie.availability?.status === 'verified';
}

function preferMovie<T extends MergeableMovie>(left: T, right: T): T {
  if (isVerifiedMovie(right) && !isVerifiedMovie(left)) return right;
  if (isVerifiedMovie(left) && !isVerifiedMovie(right)) return left;
  return left;
}

/** Merge a live page set with local discovery data without hiding live titles. */
export function mergeLiveAndLocalMovies<T extends MergeableMovie>(live: T[], local: T[]): T[] {
  const liveById = new Map<string, T>();
  for (const movie of live) {
    const existing = liveById.get(movie.id);
    liveById.set(movie.id, existing ? preferMovie(existing, movie) : movie);
  }

  const liveKeys = new Set([...liveById.values()].map(normalizedTitleYear));
  const localUnique = local.filter((movie) => {
    if (liveById.has(movie.id)) return false;
    const key = normalizedTitleYear(movie);
    if (liveKeys.has(key)) return false;
    liveKeys.add(key);
    return true;
  });

  return [...liveById.values(), ...localUnique];
}

export function mergeLiveMoviePages<T extends MergeableMovie>(current: T[], next: T[]): T[] {
  const byId = new Map<string, T>();
  for (const movie of current) byId.set(movie.id, movie);
  for (const movie of next) {
    const existing = byId.get(movie.id);
    byId.set(movie.id, existing ? preferMovie(existing, movie) : movie);
  }
  return [...byId.values()];
}
