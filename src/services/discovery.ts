import type { Movie } from '../data/catalog';

export type DiscoveryMode = 'all' | 'family';
export type OccasionFilter = 'all' | 'date-night' | 'quick-watch';

export const DISCOVERY_MODE_OPTIONS = [
  {
    id: 'all' as const,
    label: 'Everything',
    description: 'Browse the full catalog.',
  },
  {
    id: 'family' as const,
    label: 'Family-friendly',
    description: 'PG-13 and below with high-risk themes excluded.',
  },
] as const;

export const OCCASION_OPTIONS = [
  {
    id: 'all' as const,
    label: 'Any occasion',
    description: 'No occasion filter.',
  },
  {
    id: 'date-night' as const,
    label: 'Date night',
    description: 'Romance and relationship-driven, conversation-friendly movies.',
  },
  {
    id: 'quick-watch' as const,
    label: 'Quick watch',
    description: 'Movies around 110 minutes or less.',
  },
] as const;

const HIGH_RISK_TAGS = new Set([
  '#ZombieOutbreak',
  '#Slasher',
  '#Vampires',
  '#HauntedHouse',
  '#BodyHorror',
  '#SerialKiller',
  '#FoundFootage',
  '#Psychological',
]);

const FAMILY_RATINGS = new Set(['G', 'PG', 'TV-G', 'TV-PG', 'E', 'E10+', 'PG-13']);
const DATE_NIGHT_RELATIONSHIP_TERMS = /\b(?:romance|romantic|love|relationship|couple|married|marriage|wedding|date|romcom|rom-com)\b/i;
const UNSAFE_TITLE_TERMS = /\b(?:predator|ballerina|sinners?|revenge|assassin|killer|serial\s+(?:killer|thrillers?)|vampires?|dracula|war|apocalypse|paranormal|scream|conjuring|slasher|murder|terror|festival|found footage|thrillers?|cult(?:ure)?|haunted|demon(?:ic)?)\b/i;
const UNSAFE_DESCRIPTION_TERMS = /\b(?:murder|killer|zombie|undead|slasher|demonic|possess(?:ed|ion)|gore|rape|serial killer|vampire|dracula|cult|bloodshed|homicidal|terror(?:ize|ized|izing)|weapon|combat|battle|violent|violence|assassin|revenge|war|apocalypse|threat|danger|fight(?:s|ing)?|kill(?:s|ed|ing)?)\b/i;

function parseDurationMinutes(duration: string) {
  const hours = Number(duration.match(/(\d+)h/)?.[1] ?? 0);
  const minutes = Number(duration.match(/(\d+)m/)?.[1] ?? 0);
  return hours * 60 + minutes;
}

export function isFamilyFriendly(movie: Movie) {
  const rating = movie.rating.trim().toUpperCase();
  const explicitlyFamilyRated = rating === 'NOT RATED' && movie.genre.includes('Family');
  if (!FAMILY_RATINGS.has(rating) && !explicitlyFamilyRated) return false;
  if (movie.genre.some((genre) => genre === 'Horror' || genre === 'Thriller')) return false;
  if (movie.genre.includes('Other')) return false;
  if (movie.tags.some((tag) => HIGH_RISK_TAGS.has(tag))) return false;
  if (UNSAFE_TITLE_TERMS.test(movie.title) || UNSAFE_DESCRIPTION_TERMS.test(movie.description)) return false;
  return true;
}

export function isDateNightFriendly(movie: Movie) {
  if (movie.rating.trim().toUpperCase() === 'R') return false;
  if (movie.genre.includes('Horror') || movie.genre.includes('Documentary') || movie.tags.some((tag) => HIGH_RISK_TAGS.has(tag))) return false;
  if (UNSAFE_TITLE_TERMS.test(movie.title) || UNSAFE_DESCRIPTION_TERMS.test(movie.description)) return false;

  // Avoid treating every comedy or drama as a date-night recommendation. A
  // recognizable relationship signal (or an explicit Romance genre) makes the
  // promise far more trustworthy than a broad genre match alone, and also
  // tolerates sparse or imperfect source genre metadata.
  const hasRelationshipSignal = DATE_NIGHT_RELATIONSHIP_TERMS.test(movie.description);
  return movie.genre.includes('Romance') || hasRelationshipSignal;
}

/**
 * Ranks clear romance and relationship signals above broad or incidental
 * matches. It is intentionally separate from eligibility so an honest but
 * sparse catalog can still return useful choices without putting a loosely
 * related title first.
 */
export function getDateNightPriority(movie: Movie) {
  const description = movie.description.toLowerCase();
  let priority = 0;

  if (movie.genre.includes('Romance')) priority += 4;
  if (/\b(?:romance|romantic|romcom|rom-com)\b/.test(description)) priority += 4;
  if (/\b(?:love|relationship|couple|married|marriage|wedding|date)\b/.test(description)) priority += 2;
  if (movie.genre.includes('Comedy') || movie.genre.includes('Drama')) priority += 1;

  return priority;
}

export function isQuickWatch(movie: Movie) {
  const minutes = parseDurationMinutes(movie.duration);
  return minutes > 0 && minutes <= 110;
}

export function matchesDiscoveryMode(movie: Movie, mode: DiscoveryMode) {
  return mode === 'all' || isFamilyFriendly(movie);
}

export function matchesOccasion(movie: Movie, occasion: OccasionFilter) {
  if (occasion === 'date-night') return isDateNightFriendly(movie);
  if (occasion === 'quick-watch') return isQuickWatch(movie);
  return true;
}

export function getSearchIntent(query: string): 'family' | 'date-night' | 'quick-watch' | null {
  const normalized = query.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (/\b(?:family|families|kids|children|child friendly|family night)\b/.test(normalized)) return 'family';
  if (/\b(?:date night|romance|romantic|love story|couples?)\b/.test(normalized)) return 'date-night';
  if (/\b(?:quick|short|under 2 hours|90 minute|100 minute|110 minute)\b/.test(normalized)) return 'quick-watch';
  return null;
}

export function getAudienceLabel(movie: Movie) {
  if (isFamilyFriendly(movie)) return 'Family-friendly';
  if (movie.rating.trim().toUpperCase() === 'R') return 'Adults';
  return 'Teen+ / check rating';
}

export function getContentWarnings(movie: Movie) {
  const warnings: string[] = [];
  if (movie.rating.trim().toUpperCase() === 'R') warnings.push('Rated R');
  if (movie.genre.includes('Horror') || movie.tags.some((tag) => HIGH_RISK_TAGS.has(tag))) warnings.push('Horror or intense themes');
  if (movie.genre.includes('Thriller') || movie.tags.includes('#SerialKiller')) warnings.push('Suspense and danger');
  return warnings;
}

export function getSearchReason(movie: Movie | undefined, query: string) {
  if (!movie) return null;
  const intent = getSearchIntent(query);
  if (intent === 'family' && isFamilyFriendly(movie)) return 'Family-friendly match';
  if (intent === 'date-night' && isDateNightFriendly(movie)) return 'Date-night match';
  if (intent === 'quick-watch' && isQuickWatch(movie)) return 'Quick-watch match';
  return null;
}
