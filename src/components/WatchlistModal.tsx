import { useState } from 'react';
import type { Movie } from '../data/movies';
import { X, Bookmark, Check, Copy, Play, Trash2 } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

interface WatchlistModalProps {
  watchlist: Movie[];
  onClose: () => void;
  onWatchTrailer: (movie: Movie) => void;
  onRemove: (movie: Movie) => void;
}

export function WatchlistModal({
  watchlist,
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
            <h2 id="watchlist-dialog-title" className="font-display font-bold text-lg text-white">Your Saved Watchlist ({watchlist.length})</h2>
          </div>
          <div className="flex items-center gap-2">
            {watchlist.length > 0 && (
              <button
                type="button"
                onClick={handleCopyShortlist}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800"
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
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
            Your saved movies stay in this browser. Account sync is not enabled yet, so export or share a title before switching devices.
          </p>
          {copyStatus === 'error' && (
            <p role="alert" className="text-xs text-rose-300">Clipboard access failed. Open a title and use its share link instead.</p>
          )}
          {copyStatus === 'copied' && (
            <p role="status" aria-live="polite" className="text-xs text-emerald-300">Shortlist copied to the clipboard.</p>
          )}
          {watchlist.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Bookmark size={40} className="mx-auto mb-3 text-zinc-700 opacity-60" />
              <p className="text-base font-semibold text-zinc-400">Your watchlist is empty</p>
              <p className="text-xs text-zinc-600 mt-1">Bookmark movies while browsing to save them for movie night!</p>
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
                  <h4 className="font-bold text-white text-base truncate">{movie.title}</h4>
                  <div className="text-xs text-zinc-400 font-medium mb-1">
                    {movie.year} • {movie.genre.join(', ')}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {movie.streamingPlatforms.map((sp) => (
                      <span key={sp.id} className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">
                        {sp.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      onWatchTrailer(movie);
                    }}
                    className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md"
                    title="Watch Trailer"
                    aria-label={`Watch trailer for ${movie.title}`}
                  >
                    <Play size={16} className="fill-white" />
                  </button>

                  <button
                    onClick={() => onRemove(movie)}
                    className="p-2.5 rounded-xl bg-zinc-800 hover:bg-rose-950 hover:text-rose-400 text-zinc-400"
                    title="Remove from Watchlist"
                    aria-label={`Remove ${movie.title} from Watchlist`}
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
