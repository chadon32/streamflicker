const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

// These IDs were repeated across the imported catalog and do not identify a
// title-specific trailer. Treat them as missing rather than showing the same
// unrelated player for many movies.
export const KNOWN_PLACEHOLDER_TRAILER_IDS = new Set(['c7ynwAgQD-0', 'pyM3z73oMAk']);

/**
 * Return a YouTube video ID only when it has the shape accepted by the embed
 * player and is not one of the catalog's known shared placeholders.
 */
export function getValidatedYouTubeTrailerId(value: string | null | undefined): string {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return YOUTUBE_ID_PATTERN.test(candidate) && !KNOWN_PLACEHOLDER_TRAILER_IDS.has(candidate)
    ? candidate
    : '';
}
