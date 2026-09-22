import { renderToStaticMarkup } from 'react-dom/server';
import { Helmet } from 'react-helmet-async';
import { BusinessPage } from '../components/BusinessPage';
import { MovieNightGuide } from '../components/MovieNightGuide';
import { SAMPLE_MOVIES } from '../data/generatedMovies';
import { getPublicMonetizationConfig } from '../services/monetization';
import { PageSeo } from './PageSeo';
import { StaticHome } from './StaticHome';
import { SEO_PAGES, SITE_ORIGIN, type SeoPath } from './pages';

export { SEO_PAGES, SITE_ORIGIN };

// Build-time export, not a Fast Refresh component module.
// eslint-disable-next-line react-refresh/only-export-components
export function renderPage(path: SeoPath | '/404') {
  const content = path === '/' ? <StaticHome />
    : path === '/about' ? <BusinessPage movies={SAMPLE_MOVIES.slice(0, 3)} sponsorInquiryUrl={getPublicMonetizationConfig().sponsorInquiryUrl} />
    : path === '/movie-night' ? <MovieNightGuide />
    : <main className="mx-auto max-w-3xl px-6 py-24"><h1 className="font-display text-4xl font-bold">Page not found</h1><p className="mt-6 text-zinc-300">This page is not part of StreamFlicker. Try movie discovery or our movie-night guide.</p><nav aria-label="Find your way" className="mt-8 flex flex-wrap gap-6"><a className="min-h-11 text-rose-300 underline" href="/">Find a movie</a><a className="min-h-11 text-rose-300 underline" href="/movie-night">Movie-night guide</a></nav></main>;
  // Helmet 3 on React 19 emits native metadata elements (no SSR context).
  const head = renderToStaticMarkup(path === '/404'
    ? <Helmet><title>Page not found | StreamFlicker</title><meta name="robots" content="noindex,follow" /></Helmet>
    : <PageSeo path={path} />).replace(/<(title|meta|link|script)\b/g, '<$1 data-seo-static="true"');
  return { html: renderToStaticMarkup(content), head };
}
