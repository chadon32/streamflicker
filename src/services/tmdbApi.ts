import type { Movie } from '../data/catalog';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Genre ID mapping for TMDB
export const TMDB_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

export function getTMDBApiKey(): string | null {
  return import.meta.env.VITE_TMDB_API_KEY || localStorage.getItem('streamflicker_tmdb_key') || null;
}

export function formatTMDBMovie(item: any, videoId?: string, providers?: any[]): Movie {
  const genres = item.genre_ids
    ? item.genre_ids.map((id: number) => TMDB_GENRES[id]).filter(Boolean)
    : item.genres
    ? item.genres.map((g: any) => g.name)
    : [];

  const poster = item.poster_path
    ? `${TMDB_IMAGE_BASE}/w500${item.poster_path}`
    : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80';

  const backdrop = item.backdrop_path
    ? `${TMDB_IMAGE_BASE}/w1280${item.backdrop_path}`
    : 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80';

  const year = item.release_date ? new Date(item.release_date).getFullYear() : new Date().getFullYear();
  const score = item.vote_average ? Number(item.vote_average.toFixed(1)) : 0;
  const match = Math.max(0, Math.min(100, Math.round(score * 10)));

  return {
    id: `tmdb-${item.id}`,
    title: item.title || item.original_title || 'Untitled Movie',
    year,
    rating: item.adult ? 'Adult' : 'Not rated',
    score,
    matchPercentage: match,
    duration: 'Runtime unavailable',
    genre: genres,
    tags: [],
    director: '',
    cast: [],
    description: item.overview || 'No synopsis available for this title.',
    posterUrl: poster,
    backdropUrl: backdrop,
    youtubeTrailerId: videoId || 'pyM3z73oMAk',
    streamingPlatforms: providers ?? [],
    featured: false,
    trending: item.popularity > 50,
  };
}

export async function searchTMDB(query: string, signal?: AbortSignal): Promise<Movie[]> {
  const apiKey = getTMDBApiKey();
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
      { signal },
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || []).slice(0, 12).map((item: any) => formatTMDBMovie(item));
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return [];
    console.error('TMDB Search Error:', err);
    return [];
  }
}
