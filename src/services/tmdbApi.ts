import {
  STREAMING_PROVIDERS,
  type Movie,
  type MovieAvailability,
  type StreamingPlatform,
} from '../data/catalog';
import {
  normalizeMovieSearchQuery,
  stripFranchiseSuffix,
} from './searchCatalog';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const LIVE_RESULT_LIMIT = 20;
const DEFAULT_NATIVE_SEARCH_ORIGIN = 'https://streamflicker.vercel.app';

export const TMDB_GENRES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary',
  18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie', 53: 'Thriller',
  10752: 'War', 37: 'Western',
};

interface TMDBSearchItem {
  id: number;
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
  collectionId?: number;
  collectionName?: string;
  collectionPartPosition?: number;
  collectionPartCount?: number;
  searchAliases?: string[];
}

interface TMDBProviderItem { provider_id: number; provider_name: string; }

interface TMDBRegionProviders {
  link?: string;
  flatrate?: TMDBProviderItem[];
  free?: TMDBProviderItem[];
  ads?: TMDBProviderItem[];
  rent?: TMDBProviderItem[];
  buy?: TMDBProviderItem[];
}

interface TMDBMovieDetails extends TMDBSearchItem {
  runtime?: number | null;
  genres?: Array<{ id: number; name: string }>;
  credits?: {
    crew?: Array<{ job?: string; name?: string }>;
    cast?: Array<{ name?: string; order?: number }>;
  };
  videos?: { results?: Array<{ key?: string; site?: string; type?: string; official?: boolean }> };
  release_dates?: {
    results?: Array<{
      iso_3166_1?: string;
      release_dates?: Array<{ certification?: string; type?: number }>;
    }>;
  };
  'watch/providers'?: { results?: Record<string, TMDBRegionProviders> };
}

export interface TMDBExpandedCollection {
  id: number;
  name: string;
  partCount?: number;
  searchAliases?: string[];
}

interface TMDBServerResult { item: TMDBSearchItem; details: TMDBMovieDetails | null; }

export interface TMDBPagination {
  page: number;
  pageSize: number;
  totalPages: number;
  totalResults: number;
  hasMore: boolean;
}

export interface TMDBSearchResponse {
  movies: Movie[];
  status: 'available' | 'unavailable';
  schemaVersion?: number;
  normalizedQuery?: string;
  region?: string;
  checkedAt?: string;
  expandedCollections?: TMDBExpandedCollection[];
  pagination?: TMDBPagination;
  warnings?: string[];
}

interface TMDBServerPayload {
  schemaVersion?: number;
  configured?: boolean;
  normalizedQuery?: string;
  region?: string;
  checkedAt?: string;
  expandedCollections?: TMDBExpandedCollection[];
  pagination?: Partial<TMDBPagination>;
  results?: TMDBServerResult[];
  warnings?: string[];
}

const CANONICAL_PROVIDER_RULES: Array<{ pattern: RegExp; id: string }> = [
  { pattern: /netflix/i, id: 'netflix' }, { pattern: /amazon prime|prime video/i, id: 'prime' },
  { pattern: /hulu/i, id: 'hulu' }, { pattern: /apple tv/i, id: 'appletv' },
  { pattern: /^(hbo )?max$/i, id: 'max' }, { pattern: /shudder/i, id: 'shudder' },
  { pattern: /tubi/i, id: 'tubi' }, { pattern: /paramount/i, id: 'paramount' },
  { pattern: /peacock/i, id: 'peacock' },
];

function cleanSetting(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }

function getViteEnv(): Record<string, unknown> {
  return ((import.meta as ImportMeta & { env?: Record<string, unknown> }).env ?? {});
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function getTMDBApiKey(): string | null {
  const env = getViteEnv();
  if (env.DEV !== true && env.DEV !== 'true') return null;
  const deploymentKey = cleanSetting(env.VITE_TMDB_API_KEY);
  if (deploymentKey) return deploymentKey;
  if (typeof localStorage === 'undefined') return null;
  return cleanSetting(localStorage.getItem('streamflicker_tmdb_key')) || null;
}

export function getTMDBWatchRegion(): string {
  const configuredRegion = cleanSetting(getViteEnv().VITE_TMDB_WATCH_REGION).toUpperCase();
  return /^[A-Z]{2}$/.test(configuredRegion) ? configuredRegion : 'US';
}

export function sanitizeTMDBSearchOrigin(value: string): string {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    const isLocalHttp = parsed.protocol === 'http:'
      && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]');
    if (parsed.protocol !== 'https:' && !isLocalHttp) return '';
    return parsed.origin;
  } catch { return ''; }
}

export function getTMDBSearchOrigin(): string {
  const configured = sanitizeTMDBSearchOrigin(cleanSetting(getViteEnv().VITE_TMDB_SEARCH_ORIGIN));
  const protocol = typeof window !== 'undefined' ? window.location.protocol : '';
  const isNativeOrigin = protocol === 'capacitor:' || protocol === 'ionic:' || protocol === 'file:';
  if (isNativeOrigin) return configured || DEFAULT_NATIVE_SEARCH_ORIGIN;
  return configured;
}

export function normalizeTMDBSearchQuery(query: string): string { return normalizeMovieSearchQuery(query); }

function buildSearchUrl(query: string, region: string, page: number): string {
  const path = `/api/tmdb-search?query=${encodeURIComponent(query)}&region=${encodeURIComponent(region)}&page=${page}`;
  const origin = getTMDBSearchOrigin();
  return origin ? `${origin}${path}` : path;
}

function formatRuntime(runtime?: number | null): string {
  if (!runtime || runtime <= 0) return 'Runtime unavailable';
  const hours = Math.floor(runtime / 60); const minutes = runtime % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function getCertification(details: TMDBMovieDetails, region: string): string {
  const regionalDates = details.release_dates?.results?.find((entry) => entry.iso_3166_1 === region);
  const certification = regionalDates?.release_dates
    ?.filter((entry) => entry.certification?.trim())
    .sort((left, right) => (left.type ?? 99) - (right.type ?? 99))[0]?.certification?.trim();
  return certification || (details.adult ? 'Adult' : 'Not rated');
}

function getTrailerId(details: TMDBMovieDetails): string {
  const candidates = details.videos?.results?.filter(
    (video) => video.site === 'YouTube' && video.type === 'Trailer' && video.key,
  ) ?? [];
  return (candidates.find((video) => video.official)?.key ?? candidates[0]?.key ?? '').trim();
}

function getProviderMetadata(provider: TMDBProviderItem) {
  const canonicalId = CANONICAL_PROVIDER_RULES.find(({ pattern }) => pattern.test(provider.provider_name))?.id;
  const canonical = canonicalId ? STREAMING_PROVIDERS.find(({ id }) => id === canonicalId) : undefined;
  const fallbackLogo = provider.provider_name.split(/\s+/).map((word) => word[0]).join('').slice(0, 4).toUpperCase();
  return {
    id: canonical?.id ?? `tmdb-${provider.provider_id}`,
    name: canonical?.name ?? provider.provider_name,
    color: canonical?.color ?? '#3f3f46',
    logo: canonical?.logo ?? fallbackLogo,
  };
}

export function mapTMDBWatchProviders(
  regionData: TMDBRegionProviders | undefined,
  region: string,
  checkedAt: string,
): StreamingPlatform[] {
  if (!regionData) return [];
  const categories: Array<{ key: 'flatrate' | 'free' | 'ads' | 'rent' | 'buy'; type: StreamingPlatform['type'] }> = [
    { key: 'flatrate', type: 'subscription' }, { key: 'free', type: 'free' }, { key: 'ads', type: 'free' },
    { key: 'rent', type: 'rent' }, { key: 'buy', type: 'buy' },
  ];
  const providers = new Map<string, StreamingPlatform>();
  for (const { key, type } of categories) {
    for (const provider of regionData[key] ?? []) {
      const metadata = getProviderMetadata(provider); const uniqueKey = `${provider.provider_id}-${type}`;
      if (providers.has(uniqueKey)) continue;
      providers.set(uniqueKey, {
        ...metadata, type, affiliateUrl: regionData.link ?? '', availabilityStatus: 'verified', source: 'tmdb',
        region, checkedAt, tmdbProviderId: provider.provider_id,
      });
    }
  }
  return [...providers.values()];
}

export function formatTMDBMovie(
  item: TMDBSearchItem,
  details?: TMDBMovieDetails,
  region = 'US',
  checkedAt = new Date().toISOString(),
): Movie {
  const source = details ?? item;
  const genres = details?.genres?.map(({ name }) => name)
    ?? item.genre_ids?.map((id) => TMDB_GENRES[id]).filter((genre): genre is string => Boolean(genre)) ?? [];
  const poster = source.poster_path
    ? `${TMDB_IMAGE_BASE}/w500${source.poster_path}`
    : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80';
  const backdrop = source.backdrop_path
    ? `${TMDB_IMAGE_BASE}/w1280${source.backdrop_path}`
    : 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80';
  const parsedYear = source.release_date ? new Date(source.release_date).getFullYear() : 0;
  const year = Number.isFinite(parsedYear) && parsedYear > 0 ? parsedYear : new Date().getFullYear();
  const score = source.vote_average ? Number(source.vote_average.toFixed(1)) : 0;
  const regionalProviders = details?.['watch/providers']?.results?.[region];
  const streamingPlatforms = mapTMDBWatchProviders(regionalProviders, region, checkedAt);
  const availability: MovieAvailability = details
    ? { status: streamingPlatforms.length > 0 ? 'verified' : 'not-found', source: 'tmdb', region, checkedAt, link: regionalProviders?.link }
    : { status: 'unavailable', source: 'tmdb', region, checkedAt };
  const director = details?.credits?.crew?.find(({ job }) => job === 'Director')?.name ?? '';
  const cast = [...(details?.credits?.cast ?? [])].sort((left, right) => (left.order ?? 999) - (right.order ?? 999))
    .slice(0, 5).map(({ name }) => name).filter((name): name is string => Boolean(name));
  return {
    id: `tmdb-${item.id}`, recordSource: 'tmdb-live', title: source.title || source.original_title || 'Untitled Movie', year,
    sourceId: `tmdb-${item.id}`,
    ...(source.release_date ? { releaseDate: source.release_date } : {}),
    rating: details ? getCertification(details, region) : (source.adult ? 'Adult' : 'Not rated'), score,
    matchPercentage: Math.max(0, Math.min(100, Math.round(score * 10))), duration: formatRuntime(details?.runtime),
    genre: genres, tags: [], director, cast, description: source.overview || 'No synopsis available for this title.',
    posterUrl: poster, backdropUrl: backdrop, youtubeTrailerId: details ? getTrailerId(details) : '', streamingPlatforms,
    availability,
    ...(item.collectionId ? { collectionId: item.collectionId } : {}),
    ...(item.collectionName ? { collectionName: item.collectionName } : {}),
    ...(item.collectionPartPosition ? { collectionPartPosition: item.collectionPartPosition } : {}),
    ...(item.collectionPartCount ? { collectionPartCount: item.collectionPartCount } : {}),
    ...(item.searchAliases?.length ? { searchAliases: [...new Set(item.searchAliases)] } : {}),
    featured: false, trending: (source.popularity ?? 0) > 50,
  };
}

async function fetchTMDB<T>(path: string, apiKey: string, signal?: AbortSignal): Promise<T> {
  const separator = path.includes('?') ? '&' : '?';
  const response = await fetch(`${TMDB_BASE_URL}${path}${separator}api_key=${encodeURIComponent(apiKey)}`, { signal });
  if (!response.ok) throw new Error(`TMDB request failed with status ${response.status}`);
  return response.json() as Promise<T>;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length); let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) { const index = nextIndex; nextIndex += 1; results[index] = await mapper(items[index]); }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function normalizePage(page: number): number { return Number.isInteger(page) && page > 0 ? Math.min(page, 100) : 1; }

function parsePagination(payload: TMDBServerPayload, fallbackPage: number, resultCount: number): TMDBPagination {
  const page = Number.isInteger(payload.pagination?.page) && (payload.pagination?.page ?? 0) > 0
    ? payload.pagination!.page! : fallbackPage;
  const totalPages = Number.isInteger(payload.pagination?.totalPages) && (payload.pagination?.totalPages ?? 0) > 0
    ? payload.pagination!.totalPages! : page;
  const totalResults = Number.isInteger(payload.pagination?.totalResults) && (payload.pagination?.totalResults ?? 0) >= 0
    ? payload.pagination!.totalResults! : resultCount;
  const pageSize = Number.isInteger(payload.pagination?.pageSize) && (payload.pagination?.pageSize ?? 0) > 0
    ? payload.pagination!.pageSize! : LIVE_RESULT_LIMIT;
  return { page, pageSize, totalPages, totalResults, hasMore: payload.pagination?.hasMore === true || page < totalPages };
}

export function parseTMDBPagination(
  pagination: Partial<TMDBPagination> | undefined,
  fallbackPage = 1,
  resultCount = 0,
): TMDBPagination {
  return parsePagination({ pagination }, normalizePage(fallbackPage), resultCount);
}

async function searchViaServer(query: string, region: string, page: number, signal?: AbortSignal) {
  try {
    const response = await fetch(buildSearchUrl(query, region, page), { signal, headers: { Accept: 'application/json' } });
    if (!response.headers.get('content-type')?.includes('application/json')) return null;
    const payload = await response.json() as TMDBServerPayload;
    return { ok: response.ok, payload };
  } catch (error) {
    if (isAbortError(error)) throw error;
    return null;
  }
}

async function searchViaBrowserKey(query: string, region: string, page: number, apiKey: string, signal?: AbortSignal): Promise<TMDBSearchResponse> {
  const searchData = await fetchTMDB<{ page?: number; total_pages?: number; total_results?: number; results?: TMDBSearchItem[] }>(
    `/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=${page}`, apiKey, signal,
  );
  const checkedAt = new Date().toISOString();
  const results = (searchData.results ?? []).filter((item) => item.adult !== true).slice(0, LIVE_RESULT_LIMIT);
  const movies = await mapWithConcurrency(results, 4, async (item) => {
    try {
      const details = await fetchTMDB<TMDBMovieDetails>(
        `/movie/${item.id}?language=en-US&append_to_response=videos,credits,release_dates,watch%2Fproviders`, apiKey, signal,
      );
      return formatTMDBMovie(item, details, region, checkedAt);
    } catch (error) {
      if (isAbortError(error)) throw error;
      return formatTMDBMovie(item, undefined, region, checkedAt);
    }
  });
  const actualPage = searchData.page ?? page; const totalPages = searchData.total_pages ?? actualPage;
  return {
    movies, status: 'available', schemaVersion: 1, normalizedQuery: query, region, checkedAt,
    pagination: { page: actualPage, pageSize: LIVE_RESULT_LIMIT, totalPages, totalResults: searchData.total_results ?? results.length, hasMore: actualPage < totalPages },
  };
}

export async function searchTMDB(query: string, signal?: AbortSignal, requestedPage = 1): Promise<TMDBSearchResponse> {
  const normalizedQuery = normalizeTMDBSearchQuery(query); const page = normalizePage(requestedPage);
  if (stripFranchiseSuffix(normalizedQuery).length < 2) return { movies: [], status: 'unavailable', pagination: parseTMDBPagination(undefined, page) };
  const requestedRegion = getTMDBWatchRegion();
  try {
    const serverResult = await searchViaServer(normalizedQuery, requestedRegion, page, signal);
    if (serverResult?.ok && serverResult.payload.configured) {
      const region = serverResult.payload.region ?? requestedRegion;
      const checkedAt = serverResult.payload.checkedAt ?? new Date().toISOString();
      const results = serverResult.payload.results ?? [];
      return {
        movies: results.map(({ item, details }) => formatTMDBMovie(item, details ?? undefined, region, checkedAt)),
        status: 'available', schemaVersion: serverResult.payload.schemaVersion,
        normalizedQuery: serverResult.payload.normalizedQuery ?? normalizedQuery, region, checkedAt,
        expandedCollections: serverResult.payload.expandedCollections ?? [],
        pagination: parsePagination(serverResult.payload, page, results.length), warnings: serverResult.payload.warnings ?? [],
      };
    }
  } catch (error) { if (isAbortError(error)) return { movies: [], status: 'unavailable' }; }
  const apiKey = getTMDBApiKey();
  if (!apiKey) return { movies: [], status: 'unavailable', pagination: parseTMDBPagination(undefined, page) };
  try { return await searchViaBrowserKey(normalizedQuery, requestedRegion, page, apiKey, signal); }
  catch (error) {
    if (isAbortError(error)) return { movies: [], status: 'unavailable' };
    console.error('TMDB search error:', error);
    return { movies: [], status: 'unavailable', pagination: parseTMDBPagination(undefined, page) };
  }
}
