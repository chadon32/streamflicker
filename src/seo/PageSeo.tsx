import { Helmet } from 'react-helmet-async';
import {
  pageSchema,
  SEO_PAGES,
  serializeSchema,
  SITE_ORIGIN,
  SOCIAL_IMAGE_ALT,
  SOCIAL_IMAGE_URL,
  type SeoPath,
} from './pages';

export function PageSeo({ path, noindex = false, title }: {
  path: SeoPath; noindex?: boolean; title?: string;
}) {
  const page = SEO_PAGES[path];
  // Defined by Vite for both browser and static renders. Preview builds must
  // remain noindex after the interactive app replaces the initial HTML.
  const robots = noindex || import.meta.env.VITE_DEPLOY_NOINDEX === 'true'
    ? 'noindex,follow' : 'index,follow';
  const resolvedTitle = title || page.title;
  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      <meta name="description" content={page.description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={SITE_ORIGIN + path} />
      <meta property="og:site_name" content="StreamFlicker" />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={page.description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={SITE_ORIGIN + path} />
      <meta property="og:image" content={SOCIAL_IMAGE_URL} />
      <meta property="og:image:secure_url" content={SOCIAL_IMAGE_URL} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={SOCIAL_IMAGE_ALT} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={page.description} />
      <meta name="twitter:image" content={SOCIAL_IMAGE_URL} />
      <meta name="twitter:image:alt" content={SOCIAL_IMAGE_ALT} />
      <script id="site-schema" type="application/ld+json">{serializeSchema(pageSchema(path))}</script>
    </Helmet>
  );
}
