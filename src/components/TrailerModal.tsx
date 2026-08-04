import { useEffect, useState } from 'react';
import type { Movie } from '../data/movies';
import { X, Star, ExternalLink, SkipForward, Plus, Check, Film, Tv, Play } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { getReadableTextColor } from '../lib/color';
import { getContentWarnings } from '../services/discovery';
import { getMicroTagLabel } from '../services/catalogClassification';
import { recordAffiliateClick } from '../services/affiliateAnalytics';

interface TrailerModalProps {
  movie: Movie;
  onClose: () => void;
  onNextTrailer: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (movie: Movie) => void;
}

export function TrailerModal({
  movie,
  onClose,
  onNextTrailer,
  isBookmarked,
  onToggleBookmark,
}: TrailerModalProps) {
  const [trailerRequested, setTrailerRequested] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const dialogRef = useAccessibleDialog(onClose);

  // Reset video loaded state when active movie changes
  useEffect(() => {
    setTrailerRequested(false);
    setVideoLoaded(false);
  }, [movie.id]);

  const youtubeWatchUrl = `https://www.youtube.com/watch?v=${movie.youtubeTrailerId}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${movie.youtubeTrailerId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1`;
  const hasDirector = movie.director.trim().length > 0 && !/director|studio release/i.test(movie.director);
  const visibleCast = movie.cast.filter((name) => name.trim().length > 0 && !/cast/i.test(name));
  const contentWarnings = getContentWarnings(movie);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-zinc-950/90 backdrop-blur-xl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      
      {/* Modal Shell */}
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trailer-dialog-title"
        aria-describedby="trailer-accessibility-note"
        tabIndex={-1}
        className="glass-modal w-full max-w-5xl max-h-[92vh] rounded-3xl overflow-y-auto shadow-[0_0_50px_rgba(225,29,72,0.25)] border border-zinc-800 flex flex-col"
      >
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/80 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-bold shadow-sm">
              <Film size={16} />
            </div>
            <div>
              <h2 id="trailer-dialog-title" className="font-display font-bold text-base sm:text-lg text-white leading-tight">
                {movie.title} ({movie.year})
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                Trailer and service links
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Watch on YouTube direct fallback button */}
            <a
              href={youtubeWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            >
              <span>Watch on YouTube</span>
              <ExternalLink size={13} />
            </a>

            {/* Play Next Trailer Button */}
            <button
              onClick={onNextTrailer}
              className="hidden min-[430px]:flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/30"
              title="Skip to the next movie trailer"
            >
              <span>Next Trailer</span>
              <SkipForward size={14} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2.5 min-w-11 min-h-11 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Close trailer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Video Trailer Player Area (16:9 Ratio) */}
        <div className="relative w-full aspect-video bg-zinc-950 shadow-inner group">
          {!trailerRequested ? (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <img
                src={movie.backdropUrl}
                alt=""
                width="1280"
                height="720"
                className="absolute inset-0 h-full w-full object-cover opacity-55"
              />
              <div className="absolute inset-0 bg-zinc-950/45" />
              <button
                onClick={() => setTrailerRequested(true)}
                className="relative z-10 flex min-h-12 items-center gap-2 rounded-2xl bg-rose-600 px-6 py-3 font-bold text-white shadow-xl hover:bg-rose-500 active:scale-[0.98]"
              >
                <Play size={19} className="fill-current" />
                Load trailer from YouTube
              </button>
              <p className="absolute bottom-3 left-3 right-3 z-10 text-center text-[11px] text-zinc-300">
                Loads YouTube&apos;s privacy-enhanced player only after you choose to play.
              </p>
            </div>
          ) : (
            <>
          {!videoLoaded && (
            <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center z-10">
              <img
                src={movie.posterUrl}
                alt=""
                width="500"
                height="750"
                className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-sm"
              />
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                <span className="text-xs font-bold text-zinc-300">Loading Official HD Trailer...</span>
              </div>
            </div>
          )}

          <iframe
            src={embedUrl}
            title={`${movie.title} Official Trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            onLoad={() => setVideoLoaded(true)}
            className="w-full h-full relative z-0"
          />
            </>
          )}
        </div>

        {/* Details & Streaming Options */}
        <div className="p-6 sm:p-8 space-y-6 bg-zinc-950">

          <div id="trailer-accessibility-note" className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4" role="note" aria-label="Accessibility and content notes">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-zinc-200">
              <span>Accessibility and content notes</span>
              {contentWarnings.map((warning) => (
                <span key={warning} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">
                  {warning}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
              YouTube captions are available only when the source supplies them. StreamFlicker does not have a separate transcript for this catalog entry, so the written overview below is the accessible summary.
            </p>
          </div>
          
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-400/10 px-3 py-1 rounded-xl border border-amber-400/20" title="Catalog score: StreamFlicker's curated match rating from 0 to 10.">
                <Star size={15} className="fill-current text-amber-400" /> {movie.score} Catalog score
              </span>
              <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 font-semibold text-xs">
                {movie.rating}
              </span>
              <span className="text-zinc-400 font-medium">{movie.duration}</span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400 font-medium">{movie.genre.join(', ')}</span>
            </div>

            {/* Bookmark button */}
            <button
              onClick={() => onToggleBookmark(movie)}
              aria-label={isBookmarked ? `Remove ${movie.title} from Watchlist` : `Add ${movie.title} to Watchlist`}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                isBookmarked
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {isBookmarked ? <Check size={16} /> : <Plus size={16} />}
              {isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}
            </button>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Overview</h4>
            <p className="text-zinc-200 text-sm sm:text-base leading-relaxed">
              {movie.description}
            </p>
          </div>

          {/* Cast & Director */}
          {(hasDirector || visibleCast.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {hasDirector && <div>
              <span className="text-xs font-semibold text-zinc-500 block mb-1">Director</span>
              <span className="text-sm font-medium text-zinc-200">{movie.director}</span>
            </div>}
            {visibleCast.length > 0 && <div>
              <span className="text-xs font-semibold text-zinc-500 block mb-1">Starring</span>
              <span className="text-sm font-medium text-zinc-200">{visibleCast.join(', ')}</span>
            </div>}
            </div>
          )}

          {/* Micro-Tags */}
          <div className="flex flex-wrap gap-2">
            {movie.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full"
              >
                {getMicroTagLabel(tag)}
              </span>
            ))}
          </div>

          {/* Streaming Platform Affiliate Links Banner */}
          <div className="pt-4 border-t border-zinc-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Tv size={18} className="text-rose-500" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Check availability on these services
                </h4>
              </div>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-zinc-500">
              Some service links may earn StreamFlicker a commission at no extra cost to you.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {movie.streamingPlatforms.map((sp) => (
                <a
                  key={sp.id}
                  href={sp.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => recordAffiliateClick({ providerId: sp.id, movieId: movie.id })}
                  title={`Open ${sp.name} in an external service. Availability can change.`}
                  aria-label={`Check ${movie.title} on ${sp.name} (opens an external service; availability can change)`}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-sm"
                      style={{ backgroundColor: sp.color, color: getReadableTextColor(sp.color) }}
                    >
                      {sp.logo}
                    </span>
                    <div>
                      <span className="block font-bold text-sm text-zinc-100 group-hover:text-rose-400 transition-colors">
                        {sp.name}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {sp.type === 'free' ? 'Free with ads' : sp.price ?? 'Discovery link'}
                      </span>
                    </div>
                  </div>
                  <ExternalLink size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                </a>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Availability and pricing are discovery-only, vary by region, and can change. Confirm the title on the service before subscribing or renting.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
