import { useEffect, useState } from 'react';
import type { Movie } from '../data/movies';
import { X, ExternalLink, SkipForward, Plus, Check, Film, Play, Search, Share2 } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { getContentWarnings, hasVerifiedRatingAndRuntime } from '../services/discovery';
import { getMicroTagLabel } from '../services/catalogClassification';
import { getValidatedYouTubeTrailerId } from '../services/trailer';
import { getShareEligibility } from '../services/shareText';
import { AvailabilityLinks } from './AvailabilityLinks';
import { Capacitor } from '@capacitor/core';
import { openExternalUrl } from '../services/native';

interface TrailerModalProps {
  movie: Movie;
  onClose: () => void;
  onNextTrailer: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (movie: Movie) => void;
  /** Offered only for titles that can be shared honestly (see getShareEligibility). */
  onShare?: (movie: Movie) => void;
}

export function TrailerModal({
  movie,
  onClose,
  onNextTrailer,
  isBookmarked,
  onToggleBookmark,
  onShare,
}: TrailerModalProps) {
  const [trailerRequested, setTrailerRequested] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const dialogRef = useAccessibleDialog(onClose);
  const isNativeApp = Capacitor.isNativePlatform();

  // Reset video loaded state when active movie changes
  useEffect(() => {
    setTrailerRequested(false);
    setVideoLoaded(false);
    setVideoFailed(false);
  }, [movie.id]);

  const trailerId = getValidatedYouTubeTrailerId(movie.youtubeTrailerId);
  const hasTrailer = trailerId.length > 0;
  const youtubeWatchUrl = hasTrailer
    ? `https://www.youtube.com/watch?v=${trailerId}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.title} ${movie.year} official trailer`)}`;
  // YouTube's privacy-enhanced mode: no cookies are set until the viewer presses play.
  const embedUrl = `https://www.youtube-nocookie.com/embed/${trailerId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;
  const hasDirector = movie.director.trim().length > 0 && !/director|studio release/i.test(movie.director);
  const visibleCast = movie.cast.filter((name) => name.trim().length > 0 && !/cast/i.test(name));
  const contentWarnings = getContentWarnings(movie);
  const showFacts = hasVerifiedRatingAndRuntime(movie);
  const canShare = Boolean(onShare) && getShareEligibility(movie).shareable;

  const handleOpenTrailer = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isNativeApp) return;
    event.preventDefault();
    void openExternalUrl(youtubeWatchUrl).catch(() => {
      // Keep the normal anchor as a last-resort fallback if Safari cannot be
      // presented (for example while another native sheet is already open).
      window.location.assign(youtubeWatchUrl);
    });
  };

  // WKWebView can report a successful iframe navigation even when YouTube's
  // player cannot render the video. A bounded timeout keeps the modal from
  // spinning forever and gives the user a reliable external fallback.
  useEffect(() => {
    if (!trailerRequested || videoLoaded || isNativeApp || videoFailed) return;
    const timeout = window.setTimeout(() => setVideoFailed(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [isNativeApp, trailerRequested, videoFailed, videoLoaded]);

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
        aria-describedby="trailer-overview"
        tabIndex={-1}
        className="glass-modal w-full max-w-5xl max-h-[92vh] rounded-3xl overflow-y-auto shadow-[0_0_50px_rgba(225,29,72,0.25)] border border-zinc-800 flex flex-col"
      >

        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/80 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-bold shadow-sm">
              <Film size={16} aria-hidden="true" />
            </div>
            <div>
              <h2 id="trailer-dialog-title" className="font-display font-bold text-base sm:text-lg text-white leading-tight">
                {movie.title} ({movie.year})
              </h2>
              <p className="text-xs text-ink-2 font-medium">
                Trailer and where to watch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Watch on YouTube direct fallback button */}
            <a
              href={youtubeWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenTrailer}
              className="hidden min-h-11 items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-800 sm:flex"
            >
              <span>{hasTrailer ? 'Watch on YouTube' : 'Find trailer on YouTube'}</span>
              <ExternalLink size={13} aria-hidden="true" />
            </a>

            {/* Play Next Trailer Button */}
            <button
              onClick={onNextTrailer}
              className="hidden min-h-11 items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/30 transition-all hover:bg-rose-700 min-[430px]:flex"
              title="Skip to the next movie trailer"
            >
              <span>Next trailer</span>
              <SkipForward size={14} aria-hidden="true" />
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
          {!hasTrailer ? (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <img
                src={movie.backdropUrl}
                alt=""
                width="1280"
                height="720"
                className="absolute inset-0 h-full w-full object-cover opacity-45"
              />
              <div className="absolute inset-0 bg-zinc-950/55" />
              <div className="relative z-10 flex max-w-md flex-col items-center gap-3 px-6 text-center">
                <p className="text-sm font-semibold text-zinc-200">We don&apos;t have a verified trailer for this title yet.</p>
                <a
                  href={youtubeWatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleOpenTrailer}
                  className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-rose-600 px-6 py-3 font-bold text-white shadow-xl hover:bg-rose-700"
                >
                  <Search size={18} aria-hidden="true" /> Find the official trailer
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </div>
            </div>
          ) : !trailerRequested ? (
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
                className="relative z-10 flex min-h-12 items-center gap-2 rounded-2xl bg-rose-600 px-6 py-3 font-bold text-white shadow-xl hover:bg-rose-700 active:scale-[0.98]"
              >
                <Play size={19} className="fill-current" aria-hidden="true" />
                Load trailer from YouTube
              </button>
              <p className="absolute bottom-3 left-3 right-3 z-10 text-center text-xs text-zinc-300">
                Loads YouTube&apos;s privacy-enhanced player only after you choose to play.
              </p>
            </div>
          ) : (
            <>
          {!videoLoaded && !videoFailed && !isNativeApp && (
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
                <span className="text-xs font-bold text-zinc-300">Loading the trailer…</span>
              </div>
            </div>
          )}

          {isNativeApp || videoFailed ? (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <img
                src={movie.backdropUrl}
                alt=""
                width="1280"
                height="720"
                className="absolute inset-0 h-full w-full object-cover opacity-35"
              />
              <div className="absolute inset-0 bg-zinc-950/65" />
              <div className="relative z-10 flex max-w-md flex-col items-center gap-3 px-6 text-center">
                <p className="text-sm font-semibold text-zinc-100">
                  {isNativeApp
                    ? 'Open the official trailer in YouTube to watch it securely.'
                    : "YouTube couldn't load this trailer in the embedded player."}
                </p>
                <a
                  href={youtubeWatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleOpenTrailer}
                  className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-rose-600 px-6 py-3 font-bold text-white shadow-xl hover:bg-rose-700"
                >
                  <ExternalLink size={17} aria-hidden="true" /> Watch on YouTube
                </a>
                {!isNativeApp && (
                  <button
                    type="button"
                    onClick={() => {
                      setVideoFailed(false);
                      setVideoLoaded(false);
                      setTrailerRequested(false);
                    }}
                    className="min-h-11 text-xs font-semibold text-zinc-300 underline underline-offset-4 hover:text-white"
                  >
                    Try loading again
                  </button>
                )}
              </div>
            </div>
          ) : (
            <iframe
              src={embedUrl}
              title={`${movie.title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              onLoad={() => setVideoLoaded(true)}
              onError={() => {
                setVideoLoaded(false);
                setVideoFailed(true);
              }}
              className="w-full h-full relative z-0"
            />
          )}
            </>
          )}
        </div>

        {/* Details: facts first, caveats last. */}
        <div className="p-6 sm:p-8 space-y-6 bg-zinc-950">

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">

            <div className="flex flex-wrap items-center gap-3 text-sm">
              {showFacts && (
                <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 font-semibold text-xs">
                  {movie.rating}
                </span>
              )}
              {showFacts && <span className="text-ink-2 font-medium">{movie.duration}</span>}
              {showFacts && <span className="text-ink-3" aria-hidden="true">•</span>}
              <span className="text-ink-2 font-medium">{movie.genre.join(', ')}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canShare && onShare && (
                <button
                  onClick={() => onShare(movie)}
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 transition-all hover:bg-zinc-800"
                >
                  <Share2 size={16} aria-hidden="true" />
                  Share
                </button>
              )}
              <button
                onClick={() => onToggleBookmark(movie)}
                aria-label={isBookmarked ? `Remove from watchlist: ${movie.title}` : `Add to watchlist: ${movie.title}`}
                className={`flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
                  isBookmarked
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {isBookmarked ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                {isBookmarked ? 'Remove from watchlist' : 'Add to watchlist'}
              </button>
            </div>
          </div>

          {contentWarnings.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Content notes">
              {contentWarnings.map((warning) => (
                <li key={warning} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
                  {warning}
                </li>
              ))}
            </ul>
          )}

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-2">Overview</h3>
            <p id="trailer-overview" className="text-zinc-200 text-sm sm:text-base leading-relaxed">
              {movie.description}
            </p>
          </div>

          {/* Cast & Director */}
          {(hasDirector || visibleCast.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {hasDirector && <div>
              <span className="text-xs font-semibold text-ink-3 block mb-1">Director</span>
              <span className="text-sm font-medium text-zinc-200">{movie.director}</span>
            </div>}
            {visibleCast.length > 0 && <div>
              <span className="text-xs font-semibold text-ink-3 block mb-1">Starring</span>
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

          <AvailabilityLinks movie={movie} variant="detail" />

          <p className="text-xs leading-relaxed text-ink-3">
            Captions appear only when YouTube has them for this trailer. We don&apos;t have a transcript, so the overview above is the written summary.
          </p>

        </div>

      </div>
    </div>
  );
}
