import { renderToStaticMarkup } from 'react-dom/server';
import { Helmet } from 'react-helmet-async';
import { BusinessPage } from '../components/BusinessPage';
import { ContactPage, PrivacyPage, TermsPage } from '../components/LegalPages';
import { MovieNightGuide } from '../components/MovieNightGuide';
import { HOME_MOVIES } from '../data/homeCatalog';
import { getValidatedCatalog } from '../services/catalogQuality';
import { getPublicMonetizationConfig } from '../services/monetization';
import { getHeroImage, getSpotlightMovies } from '../services/spotlight';
import { PageSeo } from './PageSeo';
import { StaticHome } from './StaticHome';
import { SEO_PAGES, SITE_ORIGIN, type SeoPath } from './pages';

export { SEO_PAGES, SITE_ORIGIN };

// Build-time export, not a Fast Refresh component module.
// eslint-disable-next-line react-refresh/only-export-components
export function renderPage(path: SeoPath | '/404') {
  // The About page's imagery comes from the reviewed titles, in curation order.
  const showcase = getValidatedCatalog(HOME_MOVIES).slice(0, 8);
  const content = path === '/' ? <StaticHome />
    : path === '/about' ? <BusinessPage movies={showcase} sponsorInquiryUrl={getPublicMonetizationConfig().sponsorInquiryUrl} />
    : path === '/movie-night' ? <MovieNightGuide />
    : path === '/privacy' ? <PrivacyPage />
    : path === '/terms' ? <TermsPage />
    : path === '/contact' ? <ContactPage />
    : <main className="mx-auto max-w-3xl px-6 py-24"><h1 className="font-display text-4xl font-bold">Page not found</h1><p className="mt-6 text-zinc-300">This page is not part of StreamFlicker. Try movie discovery or our movie-night guide.</p><nav aria-label="Find your way" className="mt-8 flex flex-wrap gap-6"><a className="min-h-11 text-rose-300 underline" href="/">Find a movie</a><a className="min-h-11 text-rose-300 underline" href="/movie-night">Movie-night guide</a></nav></main>;
  // Helmet 3 on React 19 emits native metadata elements (no SSR context).
  const head = renderToStaticMarkup(path === '/404'
    ? <Helmet><title>Page not found | StreamFlicker</title><meta name="robots" content="noindex,follow" /></Helmet>
    : <PageSeo path={path} />).replace(/<(title|meta|link|script)\b/g, '<$1 data-seo-static="true"');
  // The hero backdrop is the home page's largest paint: preload the exact image set the hero will render. It is added
  // after the seeding marker on purpose, because main.tsx removes seeded tags when React boots.
  const [hero] = getSpotlightMovies(getValidatedCatalog(HOME_MOVIES));
  const heroImage = path === '/' && hero ? getHeroImage(hero) : undefined;
  const heroPreload = heroImage?.srcSet
    ? `<link rel="preload" as="image" href="${heroImage.src}" imagesrcset="${heroImage.srcSet}" imagesizes="${heroImage.sizes}" fetchpriority="high">`
    : '';
  return { html: renderToStaticMarkup(content), head: `${head}${heroPreload}` };
}
