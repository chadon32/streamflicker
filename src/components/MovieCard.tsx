import { useState } from 'react';
import type { Movie } from '../data/movies';
import { Play, Star, Plus, Check, Share2, Film, Bell } from 'lucide-react';
import { getReadableTextColor } from '../lib/color';
import { getAudienceLabel, getContentWarnings } from '../services/discovery';
import { getMicroTagLabel } from '../services/catalogClassification';
import { recordAffiliateClick } from '../services/affiliateAnalytics';

interface MovieCardProps {
  movie: Movie;
  onWatchTrailer: (movie: Movie) => void;
  isBookmarked: boolean;
  onToggleBookmark: (movie: Movie) => void;
  onShare: (movie: Movie) => void;
  onSetAlert?: (movie: Movie) => void;
}

export function MovieCard({
  movie,
  onWatchTrailer,
  isBookmarked,
  onToggleBookmark,
  onShare,
  onSetAlert,
}: MovieCardProps) {
  const [imgError, setImgError] = useState(false);
  const warnings = getContentWarnings(movie);

  return (
    <div className="movie-card-container group glass-card rounded-2xl overflow-hidden flex flex-col justify-between border border-zinc-800/80 bg-zinc-900/60 shadow-xl relative">
      <button
        type="button"
        className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950 cursor-pointer select-none"
        onClick={() => onWatchTrailer(movie)}
        aria-label={`Watch the trailer for ${movie.title}`}
      >
        {!imgError ? (
          <img
            src={movie.posterUrl}
            alt={`${movie.title} poster`}
            width="500"
            height="750"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-900 text-zinc-600">
            <Film size={40} className="mb-2 text-rose-500 opacity-60" />
            <span className="font-bold text-xs text-zinc-400">{movie.title}</span>
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 z-10">
          <span
            className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-zinc-950/85 backdrop-blur-md px-2 py-0.5 rounded-md border border-amber-400/30 shadow-md"
            aria-label={`Catalog score ${movie.score} out of 10`}
            title="Catalog score: StreamFlicker's curated match rating from 0 to 10."
          >
            <Star size={11} className="fill-amber-400 text-amber-400" /> {movie.score}
          </span>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
          <div className="transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-3">
            <div className="bg-rose-600 text-white rounded-full p-3 shadow-lg" aria-hidden="true">
              <Play fill="currentColor" size={20} />
            </div>
          </div>
          <p className="text-center text-xs font-semibold text-zinc-300 mt-4 tracking-wider uppercase">
            Play trailer
          </p>
        </div>
      </button>

      <div className="p-3.5 flex-1 flex flex-col justify-between bg-gradient-to-b from-zinc-900/40 to-zinc-950/90">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-display font-bold text-base text-zinc-100 group-hover:text-rose-400 transition-colors line-clamp-1 tracking-tight">
              <button type="button" onClick={() => onWatchTrailer(movie)} className="text-left hover:underline">
                {movie.title}
              </button>
            </h3>
            <span className="text-[11px] font-semibold text-zinc-500 shrink-0 mt-0.5">
              {movie.year}
            </span>
          </div>

          <div className="text-[11px] text-zinc-400 font-medium mb-1 truncate">
            {movie.genre.join(' · ')}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-zinc-500 mb-2.5">
            <span className="font-semibold text-zinc-300">{movie.rating}</span>
            <span aria-hidden="true">·</span>
            <span>{movie.duration}</span>
            <span aria-hidden="true">·</span>
            <span>{getAudienceLabel(movie)}</span>
          </div>

          {warnings.length > 0 && (
            <p className="text-[10px] text-amber-200/80 mb-2.5 truncate" title={warnings.join(', ')}>
              {warnings[0]}
            </p>
          )}

          <div className="flex flex-wrap gap-1 mb-3">
            {movie.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-semibold text-rose-300/90 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded"
              >
                {getMicroTagLabel(tag)}
              </span>
            ))}
          </div>
        </div>

        <div className="pt-2.5 border-t border-zinc-800/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {movie.streamingPlatforms.map((sp, idx) => (
              <a
                key={`${sp.id}-${idx}`}
                href={sp.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => recordAffiliateClick({ providerId: sp.id, movieId: movie.id })}
                title={`Open ${sp.name} in an external service. Availability can change.`}
                aria-label={`Check ${movie.title} on ${sp.name} (opens an external service; availability can change)`}
                className="inline-flex min-h-7 min-w-7 items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-bold shadow-sm transition-transform hover:scale-105 shrink-0"
                style={{ backgroundColor: sp.color, color: getReadableTextColor(sp.color) }}
              >
                {sp.logo}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onSetAlert && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSetAlert(movie);
                }}
                title="Save a local reminder"
                aria-label={`Save a local reminder for ${movie.title}`}
                className="inline-flex min-w-9 min-h-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-amber-400 transition-colors hover:bg-zinc-800 hover:text-amber-300"
              >
                <Bell size={13} />
              </button>
            )}

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onShare(movie);
              }}
              title="Share movie"
              aria-label={`Share ${movie.title}`}
              className="inline-flex min-w-9 min-h-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <Share2 size={13} />
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleBookmark(movie);
              }}
              title={isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}
              aria-label={isBookmarked ? `Remove ${movie.title} from Watchlist` : `Add ${movie.title} to Watchlist`}
              className={`inline-flex min-w-9 min-h-9 items-center justify-center rounded-lg border transition-all ${
                isBookmarked
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {isBookmarked ? <Check size={13} /> : <Plus size={13} />}
            </button>
          </div>
        </div>
        <p className="mt-1 text-[9px] leading-relaxed text-zinc-600">
          Some service links may earn StreamFlicker a commission at no extra cost.
        </p>
      </div>
    </div>
  );
}
