export const SITE_ORIGIN = 'https://streamflicker.com';
export const SOCIAL_IMAGE_PATH = '/streamflicker-social-preview.png';
export const SOCIAL_IMAGE_URL = SITE_ORIGIN + SOCIAL_IMAGE_PATH;
export const SOCIAL_IMAGE_ALT = 'StreamFlicker movie discovery on a dark cinema background';
export const PRIVATE_QUERY_KEYS = ['q', 'movie', 'plan'] as const;

export const SEO_PAGES = {
  '/': {
    title: 'What to Watch Tonight | StreamFlicker Movie Picker',
    description: 'Pick a movie for tonight with mood and theme searches, family and date-night filters, trailers, and a local watchlist. Check current streaming availability.',
    label: 'Movie discovery',
  },
  '/about': {
    title: 'About StreamFlicker | Movie Discovery Without the Scroll',
    description: 'Learn how StreamFlicker helps you choose a movie, watch trailers, save a local shortlist, and check availability. Browse without an account.',
    label: 'About StreamFlicker',
  },
  '/movie-night': {
    title: 'How to Pick a Movie for Tonight | StreamFlicker',
    description: 'Plan a family, date, or solo movie night. Narrow your choices by occasion, runtime, and theme, watch a trailer, then check current streaming availability.',
    label: 'Movie-night guide',
  },
} as const;

export type SeoPath = keyof typeof SEO_PAGES;

export function hasPrivateQuery(search: string): boolean {
  const params = new URLSearchParams(search);
  return PRIVATE_QUERY_KEYS.some((key) => params.has(key));
}

export function serializeSchema(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function pageSchema(path: SeoPath) {
  const page = SEO_PAGES[path];
  const url = SITE_ORIGIN + path;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite', '@id': `${SITE_ORIGIN}/#website`,
        url: `${SITE_ORIGIN}/`, name: 'StreamFlicker', inLanguage: 'en',
        image: { '@type': 'ImageObject', url: SOCIAL_IMAGE_URL, width: 1200, height: 630, caption: SOCIAL_IMAGE_ALT },
      },
      {
        '@type': path === '/about' ? 'AboutPage' : 'WebPage',
        '@id': `${url}#webpage`, url, name: page.title, description: page.description,
        isPartOf: { '@id': `${SITE_ORIGIN}/#website` }, inLanguage: 'en',
        image: SOCIAL_IMAGE_URL,
      },
      ...(path === '/movie-night' ? [{
        '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Movie discovery', item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: page.label, item: url },
        ],
      }] : []),
    ],
  };
}
