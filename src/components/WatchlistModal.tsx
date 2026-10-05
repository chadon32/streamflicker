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
}

export function WatchlistModal({
  watchlist,
  legacyWatchlistCount,
  onImportLegacyWatchlist,
  onClose,
  onWatchTrailer,
  onRemove,
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
              <button
                type="button"
                onClick={handleCopyShortlist}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800"
              >
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
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs leading-relaxed text-ink-3">
            Your saved movies stay in this browser. Account sync is not enabled yet, so export or share a title before switching devices.
          </p>
          {legacyWatchlistCount > 0 && (
            <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-3">
              <p className="text-xs leading-relaxed text-amber-100">
                An older watchlist with {legacyWatchlistCount} movie{legacyWatchlistCount === 1 ? '' : 's'} was found on this device. Its original owner cannot be determined.
              </p>
              <button
                type="button"
                onClick={onImportLegacyWatchlist}
                className="min-h-10 rounded-lg border border-amber-400/40 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-500/10"
              >
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
            <div className="text-center py-12">
              <Bookmark size={40} className="mx-auto mb-3 text-ink-3 opacity-60" aria-hidden="true" />
              <p className="text-base font-semibold text-zinc-300">Your watchlist is empty</p>
              <p className="text-xs text-ink-3 mt-1">Add movies while you browse and they will be here for movie night.</p>
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
                    className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md"
                    title="Watch trailer"
                    aria-label={`Watch the trailer for ${movie.title}`}
                  >
                    <Play size={16} className="fill-white" />
                  </button>

                  <button
                    onClick={() => onRemove(movie)}
                    className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-zinc-800 hover:bg-rose-950 hover:text-rose-400 text-zinc-400"
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
