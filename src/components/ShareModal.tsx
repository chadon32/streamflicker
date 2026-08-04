import { useRef, useState } from 'react';
import type { Movie } from '../data/movies';
import { X, Copy, Check, Share2, MessageSquare, Send, Globe, AlertCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

interface ShareModalProps {
  movie: Movie;
  onClose: () => void;
}

export function ShareModal({ movie, onClose }: ShareModalProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [nativeShareStatus, setNativeShareStatus] = useState<'idle' | 'shared' | 'error'>('idle');
  const shareUrlInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useAccessibleDialog(onClose);
  const isNativeShare = Capacitor.isNativePlatform();
  const shareUrlObject = new URL(window.location.href);
  shareUrlObject.search = '';
  shareUrlObject.hash = '';
  shareUrlObject.searchParams.set('movie', movie.id);
  const shareUrl = shareUrlObject.toString();
  const shareText = `Check out "${movie.title}" (${movie.year}) on StreamFlicker. Watch the trailer and check service availability:`;

  const handleCopy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard access is unavailable');
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
      shareUrlInputRef.current?.focus();
      shareUrlInputRef.current?.select();
    }
  };

  const handleNativeShare = async () => {
    try {
      const canShare = await Share.canShare();
      if (!canShare.value) throw new Error('Native sharing is unavailable');
      await Share.share({
        title: `${movie.title} on StreamFlicker`,
        text: shareText,
        url: shareUrl,
        dialogTitle: 'Share movie',
      });
      setNativeShareStatus('shared');
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (message.includes('cancel')) return;
      setNativeShareStatus('error');
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
        aria-labelledby="share-dialog-title"
        tabIndex={-1}
        className="glass-modal w-full max-w-md rounded-3xl p-6 shadow-2xl border border-zinc-800 space-y-6"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <Share2 className="text-rose-500" size={20} />
            <h2 id="share-dialog-title" className="font-display font-bold text-lg text-white">Share Movie</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close share dialog" className="p-2.5 min-w-11 min-h-11 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>

        {isNativeShare && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/25 transition-colors hover:bg-rose-500"
            >
              <Share2 size={18} />
              Share with iPhone
            </button>
            <p className="text-center text-[11px] text-zinc-500">Use the native share sheet for Messages, AirDrop, Mail, and more.</p>
            {nativeShareStatus === 'shared' && (
              <p role="status" aria-live="polite" className="text-center text-xs text-emerald-300">The iOS share sheet finished.</p>
            )}
            {nativeShareStatus === 'error' && (
              <p role="alert" aria-live="assertive" className="text-center text-xs text-rose-300">Native sharing is unavailable. Use the copy or social links below.</p>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 p-3 bg-zinc-900/80 rounded-2xl border border-zinc-800">
          <img src={movie.posterUrl} alt={`${movie.title} poster`} width="48" height="64" className="w-12 h-16 object-cover rounded-xl shrink-0" />
          <div className="min-w-0">
            <h4 className="font-bold text-white text-sm truncate">{movie.title}</h4>
            <p className="text-xs text-zinc-400">{movie.year} • {movie.genre.join(', ')}</p>
          </div>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-4 gap-3">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sky-400 transition-colors"
          >
            <Globe size={20} />
            <span className="text-[10px] font-bold text-zinc-300">X / Twitter</span>
          </a>

          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-blue-500 transition-colors"
          >
            <Globe size={20} />
            <span className="text-[10px] font-bold text-zinc-300">Facebook</span>
          </a>

          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-emerald-400 transition-colors"
          >
            <MessageSquare size={20} />
            <span className="text-[10px] font-bold text-zinc-300">WhatsApp</span>
          </a>

          <a
            href={`https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-orange-500 transition-colors"
          >
            <Send size={20} />
            <span className="text-[10px] font-bold text-zinc-300">Reddit</span>
          </a>
        </div>

        {/* Copy Link Input */}
        <div className="flex items-center gap-2">
          <input
            ref={shareUrlInputRef}
            type="text"
            readOnly
            value={shareUrl}
            aria-label="Shareable movie link"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-400 outline-none"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md shrink-0"
          >
            {copyStatus === 'copied' ? <Check size={14} /> : <Copy size={14} />}
            <span>{copyStatus === 'copied' ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>

        {copyStatus === 'copied' && (
          <p role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-emerald-300">
            <Check size={14} />
            Link copied to your clipboard.
          </p>
        )}

        {copyStatus === 'error' && (
          <p role="alert" aria-live="assertive" className="flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle size={14} />
            Clipboard access failed. The link is selected. Press Ctrl+C (or Cmd+C) to copy it manually.
          </p>
        )}

      </div>
    </div>
  );
}
