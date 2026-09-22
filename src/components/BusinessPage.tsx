import { Helmet } from 'react-helmet-async';
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
      <Helmet>
        <title>About StreamFlicker | Movie Discovery Without the Scroll</title>
        <meta
          name="description"
          content="Learn how StreamFlicker helps movie viewers search by mood, filter with purpose, watch trailers, and check where to continue."
        />
        <meta property="og:title" content="About StreamFlicker" />
        <meta
          property="og:description"
          content="A calmer way to decide what to watch next."
        />
        <meta property="og:type" content="website" />
      </Helmet>

      <header className="border-b border-white/[0.08] bg-[#070709]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-3" aria-label="StreamFlicker home">
            <img
              src="/streamflicker-logo.svg"
              alt=""
              aria-hidden="true"
              className="h-10 w-10 rounded-xl shadow-lg shadow-rose-600/25"
            />
            <span className="font-display text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              Stream<span className="text-rose-500">Flicker</span>
            </span>
          </a>

          <nav className="flex items-center gap-3 text-sm font-semibold text-zinc-400 sm:gap-6">
            <a className="hidden transition-colors hover:text-white sm:inline" href="#why">
              Why it exists
            </a>
            <a className="hidden transition-colors hover:text-white sm:inline" href="#how">
              How it works
            </a>
            <a
              href="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-white transition-colors hover:bg-rose-500 active:scale-[0.98]"
            >
              Open the app
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8 lg:py-16">
          <div className="max-w-xl">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-rose-300">
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
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-rose-950/40 transition-all hover:bg-rose-500 active:scale-[0.98]"
              >
                Start exploring
                <ArrowRight size={17} aria-hidden="true" />
              </a>
              <a
                href="#how"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900/70 px-6 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-white/[0.1] bg-zinc-950 shadow-2xl shadow-black/30 sm:min-h-[560px]">
            <img
              src={heroBackdrop}
              alt="A featured movie backdrop from the StreamFlicker catalog"
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
                  Narrow the catalog by era, genre, service, family-friendly mode, date night, and focused movie themes.
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
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">Use plain-language search or start with a focused collection.</p>
                </div>
              </li>
              <li className="flex gap-4 border-t border-white/[0.08] pt-5">
                <span className="font-display text-xl font-bold text-rose-400">02</span>
                <div>
                  <h3 className="font-semibold text-white">Narrow the field</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">Use filters that match the night, not a wall of settings.</p>
                </div>
              </li>
              <li className="flex gap-4 border-t border-white/[0.08] pt-5">
                <span className="font-display text-xl font-bold text-rose-400">03</span>
                <div>
                  <h3 className="font-semibold text-white">Choose your next step</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">Open the trailer, save the title, or check where to continue.</p>
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
                    src={movie.posterUrl}
                    alt={`${movie.title} poster`}
                    width="500"
                    height="750"
                    loading="lazy"
                    decoding="async"
                    className="aspect-[2/3] w-full object-cover"
                  />
                  <div className="p-3 sm:p-4">
                    <p className="truncate text-xs font-bold text-white sm:text-sm">{movie.title}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">{movie.year}</p>
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
                <Check className="mt-0.5 shrink-0 text-emerald-400" size={18} aria-hidden="true" />
                Browse without an account.
              </li>
              <li className="flex items-start gap-3 border-t border-white/[0.08] pt-4">
                <Check className="mt-0.5 shrink-0 text-emerald-400" size={18} aria-hidden="true" />
                Save a local watchlist and share a title link.
              </li>
              <li className="flex items-start gap-3 border-t border-white/[0.08] pt-4">
                <ShieldCheck className="mt-0.5 shrink-0 text-emerald-400" size={18} aria-hidden="true" />
                Provider links and sponsorships stay clearly labeled.
              </li>
            </ul>
          </div>
        </section>

        {sponsorInquiryUrl && (
          <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="flex flex-col justify-between gap-8 rounded-[2rem] border border-rose-500/25 bg-rose-950/20 p-7 sm:p-10 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-300">For partners</p>
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
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-rose-500 active:scale-[0.98]"
              >
                Start a partner conversation
                <ArrowRight size={17} aria-hidden="true" />
              </a>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-white/[0.08] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} StreamFlicker.</p>
          <div className="flex flex-wrap items-center gap-5">
            <a className="transition-colors hover:text-white" href="#why">Why it exists</a>
            <a className="transition-colors hover:text-white" href="#how">How it works</a>
            <a className="inline-flex items-center gap-2 font-semibold text-zinc-300 transition-colors hover:text-white" href="/">
              Open movie discovery
              <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
