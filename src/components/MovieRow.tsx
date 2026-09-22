import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Movie } from '../data/movies';
import { MovieCard } from './MovieCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MovieRowProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  movies: Movie[];
  onWatchTrailer: (movie: Movie) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (movie: Movie) => void;
  onShare: (movie: Movie) => void;
  onSetAlert?: (movie: Movie) => void;
}

export function MovieRow({
  title,
  subtitle,
  icon,
  movies,
  onWatchTrailer,
  isBookmarked,
  onToggleBookmark,
  onShare,
  onSetAlert,
}: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;

    const maximumScrollLeft = row.scrollWidth - row.clientWidth;
    setCanScrollLeft(row.scrollLeft > 1);
    setCanScrollRight(row.scrollLeft < maximumScrollLeft - 1);
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    updateScrollState();

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(row);
    Array.from(row.children).forEach((child) => resizeObserver.observe(child));
    window.addEventListener('resize', updateScrollState);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [movies, updateScrollState]);

  const scroll = (direction: 'left' | 'right') => {
    const row = rowRef.current;
    if (!row) return;

    const scrollAmount = row.clientWidth * 0.75;
    const maximumScrollLeft = row.scrollWidth - row.clientWidth;
    const target = direction === 'left'
      ? Math.max(0, row.scrollLeft - scrollAmount)
      : Math.min(maximumScrollLeft, row.scrollLeft + scrollAmount);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    row.scrollTo({ left: target, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.currentTarget !== event.target) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scroll('left');
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      scroll('right');
    }
  };

  if (movies.length === 0) return null;

  return (
    <section className="movie-row my-8 relative group/row" aria-labelledby={headingId}>
      
      {/* Row Header */}
      <div className="flex items-end justify-between gap-3 mb-4 px-1">
        <div className="min-w-0">
          <h2 id={headingId} className="font-display font-black text-xl sm:text-2xl text-white tracking-tight flex items-center gap-2">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Scroll Buttons */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/80 text-white shadow-md backdrop-blur-md transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-zinc-900/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
            title="Scroll Left"
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/80 text-white shadow-md backdrop-blur-md transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-zinc-900/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
            title="Scroll Right"
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Row */}
      <div
        ref={rowRef}
        tabIndex={0}
        aria-label={`${title} horizontal movie list`}
        onScroll={updateScrollState}
        onKeyDown={handleKeyDown}
        className="flex items-stretch gap-5 overflow-x-auto scrollbar-none pb-4 pt-1 snap-x snap-mandatory"
      >
        {movies.map((movie) => (
          <div key={movie.id} className="w-[240px] sm:w-[260px] shrink-0 snap-start">
            <MovieCard
              movie={movie}
              onWatchTrailer={onWatchTrailer}
              isBookmarked={isBookmarked(movie.id)}
              onToggleBookmark={onToggleBookmark}
              onShare={onShare}
              onSetAlert={onSetAlert}
            />
          </div>
        ))}
      </div>

    </section>
  );
}
