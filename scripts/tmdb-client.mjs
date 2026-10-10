const BASE_URL = 'https://api.themoviedb.org/3';

export class TmdbAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TmdbAuthError';
  }
}

/**
 * A small TMDB client with the manners the service asks for: requests are spaced to a steady rate, throttling (429)
 * and server errors are retried with backoff, and a rejected credential stops everything. Nothing it throws
 * contains the credential or the search text. fetch, sleep and the clock are injectable so tests never touch the
 * network.
 */
export function createTmdbClient({
  token = '',
  apiKey = '',
  fetchImpl = globalThis.fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => Date.now(),
  random = Math.random,
  requestsPerSecond = 20,
  maxRetries = 5,
  timeoutMs = 15_000,
} = {}) {
  if (!token && !apiKey) throw new Error('A TMDB credential is required (TMDB_API_READ_ACCESS_TOKEN or TMDB_API_KEY)');
  const interval = 1000 / requestsPerSecond;
  let nextStart = 0;

  // Reserve the next start time before waiting, so concurrent callers never bunch up above the rate.
  async function waitForSlot() {
    const current = now();
    const start = Math.max(current, nextStart);
    nextStart = start + interval;
    if (start > current) await sleep(start - current);
  }

  async function readJson(response) {
    try {
      return await response.json();
    } catch {
      throw new Error('TMDB returned an unreadable response');
    }
  }

  async function request(path, params = {}) {
    const search = new URLSearchParams(params);
    if (!token) search.set('api_key', apiKey);
    const url = `${BASE_URL}${path}?${search}`;
    const headers = { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    for (let attempt = 0; ; attempt += 1) {
      await waitForSlot();
      let response = null;
      try {
        response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
      } catch {
        // A network error or timeout is handled like a server error below.
      }
      if (response?.ok) return readJson(response);
      const status = response?.status ?? 0;
      if (status === 401) {
        throw new TmdbAuthError('TMDB rejected the credential (401). The long "API Read Access Token" goes in TMDB_API_READ_ACCESS_TOKEN and the 32-character "API Key" in TMDB_API_KEY: check which one you pasted where in .env.');
      }
      if (status === 404) return null;
      const retryable = status === 0 || status === 429 || status >= 500;
      if (!retryable || attempt >= maxRetries) {
        throw new Error(`TMDB request to ${path} failed (${status === 0 ? 'network error' : `status ${status}`})`);
      }
      const retryAfter = Number(response?.headers?.get('retry-after'));
      const wait = retryAfter > 0 ? retryAfter * 1000 : Math.min(15_000, 500 * 2 ** attempt) * (0.75 + random() * 0.5);
      await sleep(wait);
    }
  }

  return {
    async searchMovie({ title, year }) {
      const params = { query: title, include_adult: 'false', language: 'en-US', page: '1' };
      if (year) params.primary_release_year = String(year);
      const body = await request('/search/movie', params);
      return body?.results ?? [];
    },
    movieDetails(id) {
      return request(`/movie/${id}`, { language: 'en-US', append_to_response: 'release_dates,videos' });
    },
  };
}
