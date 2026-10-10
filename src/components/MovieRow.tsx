import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Movie } from '../data/movies';
import { MovieCard } from './MovieCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** A rail with fewer cards than this reads as a mistake, so it is not shown. */
const MIN_RAIL_ITEMS = 3;

interface MovieRowProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  movies: Movie[];
  onWatchTrailer: (movie: Movie) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (movie: Movie) => void;
}

export function MovieRow({
  title,
  subtitle,
  icon,
  movies,
  onWatchTrailer,
  isBookmarked,
  onToggleBookmark,
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

  if (movies.length < MIN_RAIL_ITEMS) return null;

  return (
    <section className="movie-row my-8 relative" aria-labelledby={headingId}>

      {/* Row Header */}
      <div className="flex items-end justify-between gap-3 mb-4 px-1">
        <div className="min-w-0">
          <h2 id={headingId} className="font-display font-black text-xl sm:text-2xl text-white tracking-tight flex items-center gap-2">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
        </div>

        {/* Scroll Buttons: a pointer convenience; on touch screens the row itself scrolls. */}
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="icon-btn"
            title="Scroll left"
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="icon-btn"
            title="Scroll right"
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Row: a labelled region so screen readers announce what it is. */}
      <div
        ref={rowRef}
        role="region"
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
            />
          </div>
        ))}
      </div>

    </section>
  );
}
