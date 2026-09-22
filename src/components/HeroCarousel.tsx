import { useEffect, useState } from 'react';
import type { Movie } from '../data/movies';
import { Play, Star, Plus, Check, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { getContentWarnings } from '../services/discovery';
import { getMicroTagLabel } from '../services/catalogClassification';
import { AvailabilityLinks } from './AvailabilityLinks';
import { getTMDBImageSrcSet } from '../services/images';

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

  const mobileContext = getContentWarnings(movie)[0] ?? movie.genre.slice(0, 2).join(' · ');

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured movies"
      className="relative w-full overflow-hidden rounded-3xl border border-zinc-800/80 shadow-2xl my-6"
    >
      
      {/* Backdrop Image */}
      <img
        src={movie.backdropUrl}
        srcSet={getTMDBImageSrcSet(movie.backdropUrl, [500, 780, 1280])}
        sizes="100vw"
        alt=""
        width="1280"
        height="720"
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-center scale-105 brightness-75 transition-transform duration-700 motion-reduce:transform-none motion-reduce:transition-none"
      />

      {/* Dark Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent w-full lg:w-3/4" />

      {/* Carousel Controls */}
      {movieCount > 1 && (
        <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-4 sm:top-4">
          <span className="rounded-full border border-zinc-700 bg-zinc-950/75 px-3 py-2 text-xs font-semibold tabular-nums text-zinc-100 backdrop-blur-md" aria-live="polite" aria-atomic="true">
            <span className="sr-only">{movie.title}, featured movie </span>{safeCurrentIndex + 1} / {movieCount}
          </span>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + movieCount) % movieCount)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/75 text-white backdrop-blur-md transition-colors hover:bg-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
            title="Previous Spotlight Movie"
            aria-label="Previous Spotlight Movie"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % movieCount)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/75 text-white backdrop-blur-md transition-colors hover:bg-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
            title="Next Spotlight Movie"
            aria-label="Next Spotlight Movie"
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
        className="relative z-10 mx-auto flex min-h-[400px] max-w-7xl flex-col justify-end px-6 pb-7 pt-24 sm:min-h-[460px] sm:px-10 sm:pb-12 sm:pt-28 lg:min-h-[500px]"
      >
        
        {/* Featured Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-3 backdrop-blur-md w-fit">
          <Sparkles size={13} />
          Featured movie
        </div>

        {/* Title */}
        <h2 className="font-display text-2xl min-[375px]:text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05] mb-3 drop-shadow-md max-w-3xl">
          {movie.title}
        </h2>

        {/* Metadata Badges */}
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-zinc-300 mb-4 font-medium">
          <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20" title="Catalog score: StreamFlicker's curated match rating from 0 to 10.">
            <Star size={14} className="fill-current" /> {movie.score} Catalog score
          </span>
          <span className="px-2 py-1 bg-zinc-800/80 rounded-md border border-zinc-700 text-zinc-300 font-semibold">
            {movie.rating}
          </span>
          <span>{movie.year}</span>
          <span>•</span>
          <span>{movie.duration}</span>
        </div>

        <p className="sm:hidden mb-4 text-xs font-medium text-zinc-300">
          {mobileContext}
        </p>

        {/* Description */}
        <p className="hidden sm:line-clamp-2 text-zinc-300 text-sm sm:text-base max-w-2xl mb-5 leading-relaxed">
          {movie.description}
        </p>

        {/* Tags */}
        <div className="hidden sm:flex flex-wrap gap-2 mb-6">
          {movie.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium text-zinc-300 bg-zinc-900/90 px-3 py-1 rounded-full border border-zinc-800"
            >
              {getMicroTagLabel(tag)}
            </span>
          ))}
        </div>

        {/* Actions & Streaming Provider Links */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
          <button
            onClick={() => onWatchTrailer(movie)}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold px-7 py-3.5 rounded-2xl text-base shadow-lg shadow-rose-950/40 transition-colors duration-200 motion-reduce:transition-none"
          >
            <Play size={20} className="fill-white" />
            Watch Trailer
          </button>

          <button
            onClick={() => onToggleBookmark(movie)}
            aria-label={isBookmarked(movie.id) ? `Remove ${movie.title} from Watchlist` : `Add ${movie.title} to Watchlist`}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-semibold border backdrop-blur-md transition-all ${
              isBookmarked(movie.id)
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {isBookmarked(movie.id) ? <Check size={18} /> : <Plus size={18} />}
            {isBookmarked(movie.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
          </button>

          <AvailabilityLinks movie={movie} variant="hero" />
        </div>

      </div>
    </section>
  );
}
