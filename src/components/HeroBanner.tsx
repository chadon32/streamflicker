import type { Movie } from '../data/movies';
import { Play, Star, Plus, Check, Sparkles, ExternalLink } from 'lucide-react';
import { getReadableTextColor } from '../lib/color';
import { getMicroTagLabel } from '../services/catalogClassification';
import { recordAffiliateClick } from '../services/affiliateAnalytics';

interface HeroBannerProps {
  movie: Movie;
  onWatchTrailer: (movie: Movie) => void;
  isBookmarked: boolean;
  onToggleBookmark: (movie: Movie) => void;
}

export function HeroBanner({
  movie,
  onWatchTrailer,
  isBookmarked,
  onToggleBookmark,
}: HeroBannerProps) {
  return (
    <div className="relative w-full h-[520px] sm:h-[600px] overflow-hidden rounded-3xl border border-zinc-800/80 shadow-2xl my-6">
      
      {/* Backdrop Image */}
      <img
        src={movie.backdropUrl}
        alt={`${movie.title} backdrop`}
        width="1280"
        height="720"
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover object-center scale-105 filter brightness-75 transition-all duration-700 hover:scale-100"
      />

      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent w-full lg:w-3/4" />

      {/* Content Container */}
      <div className="relative h-full max-w-7xl mx-auto px-6 sm:px-10 flex flex-col justify-end pb-10 sm:pb-14 z-10">
        
        {/* Featured Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-3 backdrop-blur-md w-fit">
          <Sparkles size={13} />
          Spotlight Release
        </div>

        {/* Title */}
        <h1 className="font-display text-4xl sm:text-6xl font-black text-white tracking-tight leading-none mb-3 drop-shadow-md">
          {movie.title}
        </h1>

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

        {/* Description */}
        <p className="text-zinc-300 text-sm sm:text-base max-w-2xl line-clamp-3 mb-6 leading-relaxed">
          {movie.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {movie.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium text-zinc-400 bg-zinc-900/90 px-3 py-1 rounded-full border border-zinc-800"
            >
              {getMicroTagLabel(tag)}
            </span>
          ))}
        </div>

        {/* Actions & Streaming Provider Links */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => onWatchTrailer(movie)}
            className="flex items-center gap-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold px-7 py-3.5 rounded-2xl text-base shadow-xl shadow-rose-600/40 hover:shadow-rose-600/60 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Play size={20} className="fill-white" />
            Watch Trailer
          </button>

          <button
            onClick={() => onToggleBookmark(movie)}
            aria-label={isBookmarked ? `Remove ${movie.title} from Watchlist` : `Add ${movie.title} to Watchlist`}
            className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-semibold border backdrop-blur-md transition-all ${
              isBookmarked
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {isBookmarked ? <Check size={18} /> : <Plus size={18} />}
            {isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}
          </button>

          {/* Streaming badges */}
          <div className="hidden lg:flex items-center gap-2 ml-auto bg-zinc-900/70 border border-zinc-800/80 p-2 rounded-2xl backdrop-blur-md">
            <span className="text-xs font-semibold text-zinc-400 px-2">Check availability:</span>
            {movie.streamingPlatforms.map((sp) => (
              <a
                key={sp.id}
                href={sp.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => recordAffiliateClick({ providerId: sp.id, movieId: movie.id })}
                title={`Open ${sp.name} in an external service. Availability can change.`}
                aria-label={`Check ${movie.title} on ${sp.name} (opens an external service; availability can change)`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105 shadow-sm"
                style={{ backgroundColor: sp.color, color: getReadableTextColor(sp.color) }}
              >
                {sp.name} <ExternalLink size={11} />
              </a>
            ))}
            <span className="text-[10px] text-zinc-500 px-2">Some links may earn a commission.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
