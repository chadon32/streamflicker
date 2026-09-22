import {
  mergeTMDBMovieCandidates,
  normalizeMovieSearchQuery,
  selectStrongCollections,
  stripFranchiseSuffix,
  type SearchCollectionCandidate,
  type SearchMovieCandidate,
} from '../src/services/searchCatalog.js';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const DETAIL_CONCURRENCY = 8;
const MAX_DIRECT_RESULTS = 20;
const MAX_COLLECTIONS = 3;
const MAX_SEARCH_PAGE = 100;
const TMDB_REQUEST_TIMEOUT_MS = 8_000;
// Sixty comfortably covers major film collections while keeping a serverless
// request's provider/detail fan-out bounded.
const MAX_EXPANDED_RESULTS = 60;
const ALLOWED_ORIGINS = new Set([
  'https://streamflicker.com',
  'https://www.streamflicker.com',
  'https://streamclicker.com',
  'https://www.streamclicker.com',
  'https://streamflicker.vercel.app',
  'capacitor://localhost',
  'ionic://localhost',
]);

declare const process: { env: Record<string, string | undefined> };

interface TMDBCredential { bearerToken: string; apiKey: string; }

interface TMDBMovieSearchItem extends SearchMovieCandidate {
  title?: string;
  original_title?: string;
  release_date?: string;
  adult?: boolean;
  vote_average?: number;
  popularity?: number;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
}

interface TMDBCollectionSearchItem { id: number; name?: string; adult?: boolean; }

interface TMDBCollectionDetails extends TMDBCollectionSearchItem {
  parts?: TMDBMovieSearchItem[];
}

interface TMDBPagedResponse<T> {
  page?: number;
  total_pages?: number;
  total_results?: number;
  results?: T[];
}

function cleanSetting(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }

function getCredential(): TMDBCredential | null {
  const bearerToken = cleanSetting(process.env.TMDB_API_READ_ACCESS_TOKEN);
  const apiKey = cleanSetting(process.env.TMDB_API_KEY);
  return bearerToken || apiKey ? { bearerToken, apiKey } : null;
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin') ?? '';
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Origin',
  };
  if (ALLOWED_ORIGINS.has(origin) || /^https?:\/\/localhost(?::\d+)?$/.test(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Accept, Content-Type';
    headers['Access-Control-Max-Age'] = '600';
  }
  return headers;
}

function json(request: Request, body: unknown, status = 200, cache = false): Response {
  const headers = new Headers(corsHeaders(request));
  headers.set('Cache-Control', cache
    ? 'public, max-age=30, s-maxage=60, stale-while-revalidate=300'
    : 'no-store');
  return new Response(JSON.stringify(body), { status, headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json; charset=utf-8' } });
}

async function fetchTMDB<T>(path: string, credential: TMDBCredential, signal: AbortSignal): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' });
  let url = `${TMDB_BASE_URL}${path}`;
  if (credential.bearerToken) headers.set('Authorization', `Bearer ${credential.bearerToken}`);
  else url += `${path.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(credential.apiKey)}`;
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.any([signal, AbortSignal.timeout(TMDB_REQUEST_TIMEOUT_MS)]),
  });
  if (!response.ok) throw new Error(`TMDB request failed with status ${response.status}`);
  return response.json() as Promise<T>;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function parsePage(value: string | null): number | null {
  if (value === null || value.trim() === '') return 1;
  if (!/^\d+$/.test(value.trim())) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 && page <= MAX_SEARCH_PAGE ? page : null;
}

function isAbortError(error: unknown): boolean { return error instanceof DOMException && error.name === 'AbortError'; }

function collectionCandidate(
  collection: TMDBCollectionSearchItem,
  details: TMDBCollectionDetails,
): SearchCollectionCandidate {
  const name = cleanSetting(details.name || collection.name);
  const parts = (details.parts ?? []).filter((part) => part.adult !== true);
  return {
    id: details.id,
    name,
    partCount: parts.length,
    searchAliases: [name, stripFranchiseSuffix(name)].filter(Boolean),
    parts,
  };
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
    if (request.method !== 'GET') return json(request, { error: 'Method not allowed' }, 405);

    const requestUrl = new URL(request.url);
    const rawQuery = requestUrl.searchParams.get('query') ?? '';
    const normalizedQuery = normalizeMovieSearchQuery(rawQuery);
    const requestedRegion = (requestUrl.searchParams.get('region') ?? 'US').trim().toUpperCase();
    const region = /^[A-Z]{2}$/.test(requestedRegion) ? requestedRegion : 'US';
    const page = parsePage(requestUrl.searchParams.get('page'));

    if (stripFranchiseSuffix(normalizedQuery).length < 2 || rawQuery.length > 120) {
      return json(request, { error: 'Query must contain between 2 and 120 characters' }, 400);
    }
    if (page === null) return json(request, { error: 'Page must be a positive integer between 1 and 100' }, 400);

    const credential = getCredential();
    if (!credential) {
      return json(request, {
        schemaVersion: 2,
        configured: false,
        normalizedQuery,
        region,
        checkedAt: new Date().toISOString(),
        expandedCollections: [],
        pagination: { page, pageSize: MAX_DIRECT_RESULTS, totalPages: page, totalResults: 0, hasMore: false },
        results: [],
        warnings: ['Live catalog search is not configured.'],
      }, 503);
    }

    const checkedAt = new Date().toISOString();
    try {
      const movieSearchRequest = fetchTMDB<TMDBPagedResponse<TMDBMovieSearchItem>>(
        `/search/movie?query=${encodeURIComponent(normalizedQuery)}&include_adult=false&language=en-US&page=${page}`,
        credential,
        request.signal,
      );
      const collectionSearchRequest: Promise<TMDBPagedResponse<TMDBCollectionSearchItem> | null> = page === 1
        ? fetchTMDB<TMDBPagedResponse<TMDBCollectionSearchItem>>(
            `/search/collection?query=${encodeURIComponent(normalizedQuery)}&include_adult=false&language=en-US&page=1`,
            credential,
            request.signal,
          )
        : Promise.resolve(null);
      const [movieSearchResult, collectionSearchResult] = await Promise.allSettled([
        movieSearchRequest,
        collectionSearchRequest,
      ]);

      for (const result of [movieSearchResult, collectionSearchResult]) {
        if (result.status === 'rejected' && isAbortError(result.reason)) throw result.reason;
      }
      if (movieSearchResult.status === 'rejected'
        && (collectionSearchResult.status === 'rejected' || collectionSearchResult.value === null)) {
        throw movieSearchResult.reason;
      }

      const warnings: string[] = [];
      const searchData: TMDBPagedResponse<TMDBMovieSearchItem> = movieSearchResult.status === 'fulfilled'
        ? movieSearchResult.value
        : { page, total_pages: page, total_results: 0, results: [] };
      if (movieSearchResult.status === 'rejected') {
        warnings.push('Direct title search is temporarily unavailable; matching franchise titles are still shown.');
      }
      const collectionSearchData = collectionSearchResult.status === 'fulfilled'
        ? collectionSearchResult.value
        : null;
      if (page === 1 && collectionSearchResult.status === 'rejected') {
        warnings.push('Franchise expansion is temporarily unavailable; direct search results are still shown.');
      }

      const directResults = (searchData.results ?? [])
        .filter((item) => Number.isInteger(item.id) && item.id > 0 && item.adult !== true)
        .slice(0, MAX_DIRECT_RESULTS);
      const expandedCollections: Array<{ id: number; name: string; partCount?: number; searchAliases?: string[] }> = [];
      const collectionCandidates: SearchCollectionCandidate[] = [];

      if (page === 1 && collectionSearchData) {
        try {
          const matchingCollections = selectStrongCollections(
            normalizedQuery,
            (collectionSearchData.results ?? [])
              .filter((collection): collection is TMDBCollectionSearchItem & { name: string } =>
                Number.isInteger(collection.id) && collection.id > 0 && collection.adult !== true && Boolean(collection.name?.trim())),
            MAX_COLLECTIONS,
          );
          const details = await mapWithConcurrency(matchingCollections, 3, async (collection) => {
            try {
              return await fetchTMDB<TMDBCollectionDetails>(
                `/collection/${collection.id}?language=en-US`,
                credential,
                request.signal,
              );
            } catch (error) {
              if (isAbortError(error)) throw error;
              warnings.push(`Collection details were unavailable for ${collection.name}.`);
              return null;
            }
          });
          details.forEach((detail, index) => {
            if (!detail) return;
            const candidate = collectionCandidate(matchingCollections[index], detail);
            if (candidate.parts?.length) {
              collectionCandidates.push(candidate);
              expandedCollections.push({
                id: candidate.id,
                name: candidate.name,
                partCount: candidate.parts.length,
                searchAliases: candidate.searchAliases,
              });
            }
          });
        } catch (error) {
          if (isAbortError(error)) throw error;
          warnings.push('Franchise expansion is temporarily unavailable; direct search results are still shown.');
        }
      }

      if (movieSearchResult.status === 'rejected' && collectionCandidates.length === 0) {
        throw movieSearchResult.reason;
      }

      const mergedItems = mergeTMDBMovieCandidates(directResults, collectionCandidates, MAX_EXPANDED_RESULTS);
      let unavailableDetailCount = 0;
      const detailedResults = await mapWithConcurrency(mergedItems, DETAIL_CONCURRENCY, async (item) => {
        try {
          const details = await fetchTMDB<Record<string, unknown>>(
            `/movie/${item.id}?language=en-US&append_to_response=videos,credits,release_dates,watch%2Fproviders`,
            credential,
            request.signal,
          );
          return { item, details };
        } catch (error) {
          if (isAbortError(error)) throw error;
          unavailableDetailCount += 1;
          return { item, details: null };
        }
      });
      if (unavailableDetailCount > 0) {
        warnings.push(`${unavailableDetailCount} title${unavailableDetailCount === 1 ? '' : 's'} could not be refreshed with current details or provider data.`);
      }
      const reportedTotalPages = Number.isInteger(searchData.total_pages) && (searchData.total_pages ?? 0) > 0
        ? searchData.total_pages! : page;
      const totalPages = Math.min(reportedTotalPages, MAX_SEARCH_PAGE);
      return json(request, {
        schemaVersion: 2,
        configured: true,
        normalizedQuery,
        region,
        checkedAt,
        expandedCollections,
        pagination: {
          page: searchData.page ?? page,
          pageSize: MAX_DIRECT_RESULTS,
          totalPages,
          totalResults: searchData.total_results ?? directResults.length,
          hasMore: (searchData.page ?? page) < totalPages,
        },
        results: detailedResults.map(({ item, details }) => ({ item, details })),
        warnings: [...new Set(warnings)],
      }, 200, true);
    } catch (error) {
      if (isAbortError(error)) return json(request, { error: 'Request cancelled' }, 499);
      return json(request, {
        schemaVersion: 2,
        configured: true,
        normalizedQuery,
        region,
        checkedAt,
        expandedCollections: [],
        pagination: { page, pageSize: MAX_DIRECT_RESULTS, totalPages: page, totalResults: 0, hasMore: false },
        results: [],
        warnings: ['Live movie search is temporarily unavailable.'],
        error: 'Live movie search is temporarily unavailable',
      }, 502);
    }
  },
};
