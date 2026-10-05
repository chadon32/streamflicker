import { useEffect, useState } from 'react';
import type { Movie } from '../data/movies';
import { Play, Plus, Check, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { getContentWarnings, hasVerifiedRatingAndRuntime } from '../services/discovery';
import { getMicroTagLabel } from '../services/catalogClassification';
import { AvailabilityLinks } from './AvailabilityLinks';
import { getHeroImage } from '../services/spotlight';

interface HeroCarouselProps {
  movies: Movie[];
  onWatchTrailer: (movie: Movie) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (movie: Movie) => void;
}

export function HeroCarousel({
  movies,
  onWatchTrailer,
  isBookmarked,
  onToggleBookmark,
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const movieCount = movies.length;
  const safeCurrentIndex = movieCount > 0 ? ((currentIndex % movieCount) + movieCount) % movieCount : 0;

  useEffect(() => {
    if (currentIndex !== safeCurrentIndex) {
      setCurrentIndex(safeCurrentIndex);
    }
  }, [currentIndex, safeCurrentIndex]);

  const movie = movies[safeCurrentIndex];
  if (!movie) return null;

  // The rating badge above already says "R", so the line only carries a warning that adds something.
  const mobileContext = getContentWarnings(movie).find((warning) => !warning.startsWith('Rated ')) ?? movie.genre.slice(0, 2).join(' · ');
  const showFacts = hasVerifiedRatingAndRuntime(movie);
  const saved = isBookmarked(movie.id);
  const heroImage = getHeroImage(movie);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured movies"
      className="relative isolate my-6 w-full overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-950 shadow-2xl"
    >

      {/* Backdrop: above the text on phones so the film is the first thing you see, behind it from sm up. */}
      <div className="relative aspect-video sm:absolute sm:inset-0 sm:aspect-auto">
        <img
          src={heroImage.src}
          srcSet={heroImage.srcSet}
          sizes={heroImage.sizes}
          alt=""
          width="1280"
          height="720"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* Phones: only the bottom edge fades into the text block. */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent sm:hidden" />
        {/* sm and up: the text sits bottom-left, so darken just that side and the floor. */}
        <div className="absolute inset-0 hidden bg-gradient-to-t from-zinc-950 via-zinc-950/25 to-transparent sm:block" />
        <div className="absolute inset-y-0 left-0 hidden w-full bg-gradient-to-r from-zinc-950/90 via-zinc-950/45 to-transparent sm:block lg:w-3/4" />
      </div>

      {/* Carousel Controls */}
      {movieCount > 1 && (
        <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-4 sm:top-4">
          <span className="rounded-full border border-zinc-700 bg-zinc-950/75 px-3 py-2 text-xs font-semibold tabular-nums text-zinc-100 backdrop-blur-md" aria-live="polite" aria-atomic="true">
            <span className="sr-only">{movie.title}, featured movie </span>{safeCurrentIndex + 1} / {movieCount}
          </span>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + movieCount) % movieCount)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/75 text-white backdrop-blur-md transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
            title="Previous featured movie"
            aria-label="Previous featured movie"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % movieCount)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/75 text-white backdrop-blur-md transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
            title="Next featured movie"
            aria-label="Next featured movie"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      )}

      {/* Content Container */}
      <div
        role="group"
        aria-roledescription="slide"
        aria-label={`${movie.title}, slide ${safeCurrentIndex + 1} of ${movieCount}`}
        className="relative z-10 mx-auto flex max-w-7xl flex-col px-5 pb-6 pt-1 sm:min-h-[460px] sm:justify-end sm:px-10 sm:pb-12 sm:pt-28 lg:min-h-[500px]"
      >

        {/* Featured Tag */}
        <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-300 backdrop-blur-md">
          <Sparkles size={13} aria-hidden="true" />
          Featured movie
        </div>

        {/* Title */}
        <h2 className="mb-3 max-w-3xl font-display text-2xl font-black leading-[1.05] tracking-tight text-white drop-shadow-md min-[375px]:text-3xl sm:text-5xl lg:text-6xl">
          {movie.title}
        </h2>

        {/* Metadata */}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-medium text-zinc-300 sm:text-sm">
          {showFacts && (
            <span className="rounded-md border border-zinc-700 bg-zinc-800/80 px-2 py-1 font-semibold text-zinc-300">
              {movie.rating}
            </span>
          )}
          <span>{movie.year}</span>
          {showFacts && (
            <>
              <span aria-hidden="true">•</span>
              <span>{movie.duration}</span>
            </>
          )}
        </div>

        <p className="mb-4 text-xs font-medium text-zinc-300 sm:hidden">
          {mobileContext}
        </p>

        {/* Description */}
        <p className="mb-5 hidden max-w-2xl text-sm leading-relaxed text-zinc-300 sm:line-clamp-2 sm:text-base">
          {movie.description}
        </p>

        {/* Tags */}
        <div className="mb-6 hidden flex-wrap gap-2 sm:flex">
          {movie.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-zinc-800 bg-zinc-900/90 px-3 py-1 text-xs font-medium text-zinc-300"
            >
              {getMicroTagLabel(tag)}
            </span>
          ))}
        </div>

        {/* Actions & where to watch */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <button
            onClick={() => onWatchTrailer(movie)}
            className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-rose-600 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-rose-950/40 transition-colors duration-200 hover:bg-rose-700 motion-reduce:transition-none sm:w-auto"
          >
            <Play size={20} className="fill-white" aria-hidden="true" />
            Watch trailer
          </button>

          <button
            onClick={() => onToggleBookmark(movie)}
            aria-label={saved ? `Remove from watchlist: ${movie.title}` : `Add to watchlist: ${movie.title}`}
            className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3.5 text-sm font-semibold backdrop-blur-md transition-all sm:w-auto ${
              saved
                ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {saved ? <Check size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
            {saved ? 'Remove from watchlist' : 'Add to watchlist'}
          </button>

          <AvailabilityLinks movie={movie} variant="hero" />
        </div>

      </div>
    </section>
  );
}
