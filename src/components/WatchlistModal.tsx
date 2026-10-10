import { useState } from 'react';
import type { Movie } from '../data/movies';
import { X, Bookmark, Check, Copy, Play, Trash2 } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { AvailabilityLinks } from './AvailabilityLinks';

interface WatchlistModalProps {
  watchlist: Movie[];
  legacyWatchlistCount: number;
  onImportLegacyWatchlist: () => void;
  onClose: () => void;
  onWatchTrailer: (movie: Movie) => void;
  onRemove: (movie: Movie) => void;
  /** The empty state's way forward: close the dialog and open the catalog. */
  onBrowse?: () => void;
}

export function WatchlistModal({
  watchlist,
  legacyWatchlistCount,
  onImportLegacyWatchlist,
  onClose,
  onWatchTrailer,
  onRemove,
  onBrowse,
}: WatchlistModalProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleCopyShortlist = async () => {
    if (watchlist.length === 0) return;
    const shortlist = watchlist
      .map((movie) => `${movie.title} (${movie.year}) - ${window.location.origin}/?movie=${encodeURIComponent(movie.id)}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(`My StreamFlicker shortlist\n${shortlist}`);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="watchlist-dialog-title"
        tabIndex={-1}
        className="glass-modal w-full max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-2">
            <Bookmark className="text-rose-500" size={20} />
            <h2 id="watchlist-dialog-title" className="font-display font-bold text-lg text-white">Your watchlist ({watchlist.length})</h2>
          </div>
          <div className="flex items-center gap-2">
            {watchlist.length > 0 && (
              <button type="button" onClick={handleCopyShortlist} className="btn btn-secondary">
                {copyStatus === 'copied' ? <Check size={14} /> : <Copy size={14} />}
                {copyStatus === 'copied' ? 'Copied' : 'Copy shortlist'}
              </button>
            )}
            <button onClick={onClose} aria-label="Close watchlist" className="p-2.5 min-w-11 min-h-11 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* List Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <p className="notice">
            Your saved movies stay in this browser. Account sync is not enabled yet, so copy your shortlist or share a title before switching devices.
          </p>
          {legacyWatchlistCount > 0 && (
            <div className="notice notice-warn space-y-2">
              <p>
                An older watchlist with {legacyWatchlistCount} movie{legacyWatchlistCount === 1 ? '' : 's'} was found on this device. Its original owner cannot be determined.
              </p>
              <button type="button" onClick={onImportLegacyWatchlist} className="btn btn-secondary">
                Import older saved movies here
              </button>
            </div>
          )}
          {copyStatus === 'error' && (
            <p role="alert" className="text-xs text-rose-300">Clipboard access failed. Open a title and share it from there instead.</p>
          )}
          {copyStatus === 'copied' && (
            <p role="status" aria-live="polite" className="text-xs text-emerald-300">Shortlist copied to the clipboard.</p>
          )}
          {watchlist.length === 0 ? (
            <div className="py-10 text-center">
              <Bookmark size={40} className="mx-auto mb-3 text-ink-3" aria-hidden="true" />
              <p className="font-display text-lg font-bold text-white">Your watchlist is empty</p>
              <p className="mt-1 text-sm text-ink-2">Add movies while you browse and they will be here for movie night.</p>
              {onBrowse && (
                <button type="button" onClick={onBrowse} className="btn btn-primary mt-5">
                  Browse movies
                </button>
              )}
            </div>
          ) : (
            watchlist.map((movie) => (
              <div
                key={movie.id}
                className="flex items-center gap-4 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all"
              >
                <img
                  src={movie.posterUrl}
                  alt={`${movie.title} poster`}
                  width="64"
                  height="80"
                  className="w-16 h-20 object-cover rounded-xl shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-base truncate">{movie.title}</h3>
                  <div className="text-xs text-ink-2 font-medium mb-1">
                    {movie.year} • {movie.genre.join(', ')}
                  </div>
                  <AvailabilityLinks movie={movie} variant="watchlist" />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      onWatchTrailer(movie);
                    }}
                    className="btn btn-primary size-11 p-0"
                    title="Watch trailer"
                    aria-label={`Watch the trailer for ${movie.title}`}
                  >
                    <Play size={16} className="fill-white" />
                  </button>

                  <button
                    onClick={() => onRemove(movie)}
                    className="btn btn-secondary size-11 p-0"
                    title="Remove from watchlist"
                    aria-label={`Remove from watchlist: ${movie.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
