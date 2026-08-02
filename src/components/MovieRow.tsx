import { useId, useRef } from 'react';
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

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (movies.length === 0) return null;

  return (
    <section className="movie-row my-8 relative group/row" aria-labelledby={headingId}>
      
      {/* Row Header */}
      <div className="flex items-end justify-between mb-4 px-1">
        <div>
          <h2 id={headingId} className="font-display font-black text-xl sm:text-2xl text-white tracking-tight flex items-center gap-2">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Scroll Buttons */}
        <div className="hidden sm:flex items-center gap-1.5 opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full bg-zinc-900/80 hover:bg-rose-600 text-white border border-zinc-800 backdrop-blur-md transition-all shadow-md"
            title="Scroll Left"
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full bg-zinc-900/80 hover:bg-rose-600 text-white border border-zinc-800 backdrop-blur-md transition-all shadow-md"
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
