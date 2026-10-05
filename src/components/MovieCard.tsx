import { useState } from 'react';
import type { Movie } from '../data/movies';
import { getAvailabilityUrl } from '../data/catalog';
import { hasVerifiedRatingAndRuntime } from '../services/discovery';
import { getTMDBImageSrcSet } from '../services/images';
import { Check, ExternalLink, Film, Plus } from 'lucide-react';

interface MovieCardProps {
  movie: Movie;
  onWatchTrailer: (movie: Movie) => void;
  isBookmarked: boolean;
  onToggleBookmark: (movie: Movie) => void;
}

/**
 * Poster first. The whole card opens the trailer (one tab stop through the
 * stretched title button); the bookmark sits on the poster and "Where to watch"
 * stays one tap away. Runtime only appears for titles whose runtime is real.
 */
export function MovieCard({ movie, onWatchTrailer, isBookmarked, onToggleBookmark }: MovieCardProps) {
  const [imgError, setImgError] = useState(false);
  const meta = [movie.year, hasVerifiedRatingAndRuntime(movie) ? movie.duration : null, movie.genre[0]]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="movie-card-container group relative flex h-full flex-col overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-white/10 hover:ring-rose-400/50">
      <div className="relative aspect-[2/3] bg-zinc-950">
        {!imgError ? (
          <img
            src={movie.posterUrl}
            srcSet={getTMDBImageSrcSet(movie.posterUrl, [185, 342, 500])}
            sizes="(min-width: 1280px) 224px, (min-width: 640px) 25vw, 45vw"
            alt=""
            width="500"
            height="750"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center p-4 text-center text-sm font-semibold text-zinc-300">
            <span>
              <Film className="mx-auto mb-2 text-rose-400" size={32} aria-hidden="true" />
              {movie.title}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => onToggleBookmark(movie)}
          aria-label={isBookmarked ? `Remove from watchlist: ${movie.title}` : `Add to watchlist: ${movie.title}`}
          className={`absolute right-2 top-2 z-10 grid size-11 place-items-center rounded-full text-white backdrop-blur-sm ${
            isBookmarked ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-zinc-950/75 hover:bg-zinc-950'
          }`}
        >
          {isBookmarked ? <Check size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 font-display text-[15px] font-bold leading-5 text-zinc-50">
          {/* Stretched button: the whole card opens the trailer with one tab stop. */}
          <button
            type="button"
            onClick={() => onWatchTrailer(movie)}
            aria-haspopup="dialog"
            className="text-left after:absolute after:inset-0"
          >
            {movie.title}
          </button>
        </h3>
        <p className="mt-1 text-xs text-ink-2">{meta}</p>
        <a
          href={getAvailabilityUrl(movie)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Where to watch ${movie.title} (opens in a new tab)`}
          className="relative z-10 mt-auto inline-flex min-h-11 items-center gap-1 pt-1 text-xs font-semibold text-rose-300 hover:text-rose-200"
        >
          Where to watch <ExternalLink size={12} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}
