export interface StreamingPlatform {
  id: string;
  name: string;
  logo: string;
  color: string;
  type: 'subscription' | 'rent' | 'buy' | 'free';
  price?: string;
  affiliateUrl: string;
  availabilityStatus?: 'verified' | 'discovery';
  source?: 'tmdb';
  region?: string;
  checkedAt?: string;
  tmdbProviderId?: number;
}

export interface MovieAvailability {
  status: 'verified' | 'not-found' | 'unavailable' | 'discovery';
  source: 'tmdb' | 'bundled';
  region?: string;
  checkedAt?: string;
  link?: string;
}

export interface Movie {
  id: string;
  title: string;
  year: number;
  rating: string;
  score: number;
  matchPercentage: number;
  duration: string;
  genre: string[];
  tags: string[];
  director: string;
  cast: string[];
  description: string;
  posterUrl: string;
  backdropUrl: string;
  youtubeTrailerId: string;
  streamingPlatforms: StreamingPlatform[];
  availability?: MovieAvailability;
  /** TMDB franchise context, present for live collection-expanded results. */
  collectionId?: number;
  collectionName?: string;
  collectionPartPosition?: number;
  collectionPartCount?: number;
  searchAliases?: string[];
  featured?: boolean;
  trending?: boolean;
}

export function getVerifiedStreamingPlatforms(movie: Movie): StreamingPlatform[] {
  if (movie.availability?.status !== 'verified') return [];
  return movie.streamingPlatforms.filter((platform) => platform.availabilityStatus === 'verified');
}

export function getAvailabilityUrl(movie: Movie): string {
  if (movie.availability?.link) {
    try {
      const parsed = new URL(movie.availability.link);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.toString();
    } catch {
      // Fall through to the public title search below.
    }
  }

  const region = movie.availability?.region?.toUpperCase() ?? 'US';
  const justWatchLocale = region === 'GB' ? 'uk' : region.toLowerCase();
  return `https://www.justwatch.com/${justWatchLocale}/search?q=${encodeURIComponent(`${movie.title} ${movie.year}`)}`;
}

export const STREAMING_PROVIDERS = [
  { id: 'netflix', name: 'Netflix', color: '#E50914', logo: 'N' },
  { id: 'prime', name: 'Prime Video', color: '#00A8E1', logo: 'PRIME' },
  { id: 'hulu', name: 'Hulu', color: '#1CE783', logo: 'HULU' },
  { id: 'appletv', name: 'Apple TV', color: '#FFFFFF', logo: 'APPLE TV' },
  { id: 'max', name: 'Max', color: '#002BE7', logo: 'MAX' },
  { id: 'shudder', name: 'Shudder', color: '#FF2A2A', logo: 'SHUDDER' },
  { id: 'tubi', name: 'Tubi (Free)', color: '#FF5500', logo: 'TUBI' },
  { id: 'paramount', name: 'Paramount+', color: '#0064FF', logo: 'P+' },
  { id: 'peacock', name: 'Peacock', color: '#00A3E0', logo: 'PEACOCK' },
] as const;
