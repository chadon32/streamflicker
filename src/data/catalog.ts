export interface StreamingPlatform {
  id: string;
  name: string;
  logo: string;
  color: string;
  type: 'subscription' | 'rent' | 'free';
  price?: string;
  affiliateUrl: string;
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
  featured?: boolean;
  trending?: boolean;
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
