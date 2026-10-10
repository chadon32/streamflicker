import {
  ArrowRight,
  Check,
  Filter,
  Film,
  Play,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type { Movie } from '../data/catalog';
import { getTMDBImageSrcSet, getTMDBImageUrl } from '../services/images';
import { SiteFooter, SiteHeader } from './SiteChrome';

interface BusinessPageProps {
  movies: Movie[];
  sponsorInquiryUrl: string;
}

const FALLBACK_BACKDROP =
  'https://image.tmdb.org/t/p/w1280/3eUyLEF5M0ky3h6KJsWiWzaakB8.jpg';

export function BusinessPage({ movies, sponsorInquiryUrl }: BusinessPageProps) {
  const showcaseMovies = movies.filter((movie) => movie.posterUrl).slice(0, 3);
  const heroBackdrop = movies[0]?.backdropUrl || FALLBACK_BACKDROP;

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#070709] text-zinc-100 selection:bg-rose-600 selection:text-white">
      <a href="#about-content" className="sr-only focus:not-sr-only focus:block focus:p-4 focus:text-rose-300">Skip to About StreamFlicker</a>

      <SiteHeader current="about" />

      <main id="about-content">
        <section className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8 lg:py-16">
          <div className="max-w-xl">
            <p className="eyebrow eyebrow-brand mb-5">
              A better way to choose tonight&apos;s movie
            </p>
            <h1 className="font-display text-5xl font-black leading-[0.98] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
              Find your next movie before the scrolling gets old.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-zinc-300 sm:text-lg">
              StreamFlicker brings search, focused filters, trailers, and provider discovery into one calmer place to decide what to watch.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="/"
                className="btn btn-primary btn-lg"
              >
                Start exploring
                <ArrowRight size={17} aria-hidden="true" />
              </a>
              <a
                href="#how"
                className="btn btn-secondary btn-lg"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-white/[0.1] bg-zinc-950 shadow-2xl shadow-black/30 sm:min-h-[560px]">
            <img
              src={getTMDBImageUrl(heroBackdrop, 780)}
              srcSet={getTMDBImageSrcSet(heroBackdrop, [500, 780, 1280])}
              sizes="(min-width: 1024px) 50vw, 100vw"
              alt=""
              width="1280"
              height="720"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/25 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/70 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 max-w-sm p-6 sm:p-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-950/60 px-3 py-1.5 text-xs font-bold text-rose-200 backdrop-blur-md">
                <Film size={14} aria-hidden="true" />
                Discovery, not noise
              </div>
              <p className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Start with a feeling. Leave with a title.
              </p>
            </div>
          </div>
        </section>

        <section id="why" className="border-y border-white/[0.08] bg-zinc-950/70">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="max-w-2xl">
              <h2 className="font-display text-4xl font-black tracking-[-0.03em] text-white sm:text-5xl">
                Turn browsing into a decision.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-zinc-400 sm:text-lg">
                StreamFlicker is built for the moment when you want a good movie, not another hour of tabs, trailers, and half-finished lists.
              </p>
            </div>

            <div className="mt-14 grid gap-0 border-y border-white/[0.08] md:grid-cols-3 md:divide-x md:divide-white/[0.08]">
              <article className="py-8 md:px-8 md:py-10 md:first:pl-0 md:last:pr-0">
                <Search className="text-rose-400" size={24} aria-hidden="true" />
                <h3 className="mt-6 font-display text-2xl font-bold text-white">Search by intent</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  Look for a title, actor, theme, mood, occasion, or a quick watch when you know the kind of night you want.
                </p>
              </article>
              <article className="border-t border-white/[0.08] py-8 md:border-t-0 md:px-8 md:py-10">
                <Filter className="text-rose-400" size={24} aria-hidden="true" />
                <h3 className="mt-6 font-display text-2xl font-bold text-white">Filter with purpose</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  Narrow the catalog by era, genre, service, rating, date night, and focused movie themes.
                </p>
              </article>
              <article className="border-t border-white/[0.08] py-8 md:border-t-0 md:px-8 md:py-10 md:first:pl-0 md:last:pr-0">
                <Play className="text-rose-400" size={24} aria-hidden="true" />
                <h3 className="mt-6 font-display text-2xl font-bold text-white">Take the next step</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  Watch a trailer, save a shortlist, share a title, or check a provider link when you are ready to continue.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-24 lg:px-8 lg:py-28">
          <div>
            <h2 className="font-display text-4xl font-black tracking-[-0.03em] text-white sm:text-5xl">
              Made for the moment before play.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              The product keeps the useful parts of movie discovery close together, so your next move is always clear.
            </p>

            <ol className="mt-10 space-y-7">
              <li className="flex gap-4 border-t border-white/[0.08] pt-5">
                <span className="font-display text-xl font-bold text-rose-400">01</span>
                <div>
                  <h3 className="font-semibold text-white">Tell it what you want</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-3">Use plain-language search or start with a focused collection.</p>
                </div>
              </li>
              <li className="flex gap-4 border-t border-white/[0.08] pt-5">
                <span className="font-display text-xl font-bold text-rose-400">02</span>
                <div>
                  <h3 className="font-semibold text-white">Narrow the field</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-3">Use filters that match the night, not a wall of settings.</p>
                </div>
              </li>
              <li className="flex gap-4 border-t border-white/[0.08] pt-5">
                <span className="font-display text-xl font-bold text-rose-400">03</span>
                <div>
                  <h3 className="font-semibold text-white">Choose your next step</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-3">Open the trailer, save the title, or check where to continue.</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="grid grid-cols-[1.05fr_0.8fr_0.95fr] items-end gap-3 sm:gap-5">
            {showcaseMovies.length > 0 ? (
              showcaseMovies.map((movie, index) => (
                <div
                  key={movie.id}
                  className={`overflow-hidden rounded-2xl border border-white/[0.12] bg-zinc-900 shadow-2xl ${index === 1 ? 'mb-10 sm:mb-16' : ''}`}
                >
                  <img
                    src={getTMDBImageUrl(movie.posterUrl, 342)}
                    srcSet={getTMDBImageSrcSet(movie.posterUrl, [185, 342, 500])}
                    sizes="(min-width: 1024px) 18vw, 30vw"
                    alt={`${movie.title} poster`}
                    width="500"
                    height="750"
                    loading="lazy"
                    decoding="async"
                    className="aspect-[2/3] w-full object-cover"
                  />
                  <div className="p-3 sm:p-4">
                    <p className="truncate text-xs font-bold text-white sm:text-sm">{movie.title}</p>
                    <p className="mt-1 text-xs text-ink-3">{movie.year}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 h-96 rounded-2xl border border-white/[0.08] bg-zinc-900" aria-hidden="true" />
            )}
          </div>
        </section>

        <section className="border-y border-white/[0.08] bg-zinc-950/70">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-24">
            <div>
              <h2 className="font-display text-4xl font-black tracking-[-0.03em] text-white sm:text-5xl">
                Clear about the edges.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
                StreamFlicker is a discovery layer. It does not host movies, promise live availability, or replace the service you choose to watch on.
              </p>
            </div>
            <ul className="space-y-4 text-sm text-zinc-300">
              <li className="flex items-start gap-3 border-t border-white/[0.08] pt-4">
                <Check className="mt-0.5 shrink-0 text-rose-400" size={18} aria-hidden="true" />
                Browse without an account.
              </li>
              <li className="flex items-start gap-3 border-t border-white/[0.08] pt-4">
                <Check className="mt-0.5 shrink-0 text-rose-400" size={18} aria-hidden="true" />
                Save a local watchlist and share a title link.
              </li>
              <li className="flex items-start gap-3 border-t border-white/[0.08] pt-4">
                <ShieldCheck className="mt-0.5 shrink-0 text-rose-400" size={18} aria-hidden="true" />
                Provider links and sponsorships stay clearly labeled.
              </li>
            </ul>
          </div>
        </section>

        {sponsorInquiryUrl && (
          <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="flex flex-col justify-between gap-8 rounded-[2rem] border border-rose-500/25 bg-rose-950/20 p-7 sm:p-10 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <p className="eyebrow eyebrow-brand">For partners</p>
                <h2 className="mt-4 font-display text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
                  Reach people planning their next movie night.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-zinc-300 sm:text-base">
                  StreamFlicker can host clearly labeled sponsor placements for brands that belong in the movie-night conversation.
                </p>
              </div>
              <a
                href={sponsorInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-lg shrink-0"
              >
                Start a partner conversation
                <ArrowRight size={17} aria-hidden="true" />
              </a>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
