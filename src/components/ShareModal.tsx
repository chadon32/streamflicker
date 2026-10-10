import { useRef, useState } from 'react';
import type { Movie } from '../data/movies';
import { X, Copy, Check, Share2, MessageSquare, Send, Globe, AlertCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { buildMovieShareText, getMovieShareHeadline, getShareEligibility } from '../services/shareText';

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
  const shareEligibility = getShareEligibility(movie);
  const shareUrlObject = new URL(window.location.href);
  shareUrlObject.search = '';
  shareUrlObject.hash = '';
  shareUrlObject.searchParams.set('movie', movie.id);
  const shareUrl = shareUrlObject.toString();
  const headline = getMovieShareHeadline(movie);
  const shareText = buildMovieShareText(movie, shareUrl);

  const handleCopy = async () => {
    if (!shareEligibility.shareable) return;
    try {
      if (!navigator.clipboard) throw new Error('Clipboard access is unavailable');
      await navigator.clipboard.writeText(shareText);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
      shareUrlInputRef.current?.focus();
      shareUrlInputRef.current?.select();
    }
  };

  const handleNativeShare = async () => {
    if (!shareEligibility.shareable) return;
    try {
      const canShare = await Share.canShare();
      if (!canShare.value) throw new Error('Native sharing is unavailable');
      await Share.share({
        title: `${movie.title} on StreamFlicker`,
        text: headline,
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
            <Share2 className="text-rose-500" size={20} aria-hidden="true" />
            <h2 id="share-dialog-title" className="font-display font-bold text-lg text-white">Share movie</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close share dialog" className="p-2.5 min-w-11 min-h-11 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>

        {!shareEligibility.shareable ? (
          <div className="space-y-2 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4" role="status">
            <h3 className="font-display text-lg font-bold text-white">This title can&apos;t be shared yet</h3>
            <p className="text-sm leading-relaxed text-amber-100/90">{shareEligibility.reason}</p>
          </div>
        ) : (
          <>
        {isNativeShare && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleNativeShare}
              className="btn btn-primary btn-lg w-full"
            >
              <Share2 size={18} aria-hidden="true" />
              Share with iPhone
            </button>
            <p className="text-center text-xs text-ink-3">Use the native share sheet for Messages, AirDrop, Mail, and more.</p>
            {nativeShareStatus === 'shared' && (
              <p role="status" aria-live="polite" className="text-center text-xs text-emerald-300">The iOS share sheet finished.</p>
            )}
            {nativeShareStatus === 'error' && (
              <p role="alert" aria-live="assertive" className="text-center text-xs text-rose-300">Native sharing is unavailable. Use the copy or social links below.</p>
            )}
          </div>
        )}

        {/* The message exactly as it will be sent: text only, no artwork. */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="eyebrow">What you&apos;ll share</h3>
          <p className="mt-2 break-words text-sm leading-relaxed text-zinc-200">{shareText}</p>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-4 gap-3">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(headline)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            <Globe size={20} aria-hidden="true" />
            <span className="text-xs font-bold text-zinc-300">X</span>
          </a>

          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            <Globe size={20} aria-hidden="true" />
            <span className="text-xs font-bold text-zinc-300">Facebook</span>
          </a>

          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            <MessageSquare size={20} aria-hidden="true" />
            <span className="text-xs font-bold text-zinc-300">WhatsApp</span>
          </a>

          <a
            href={`https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(headline)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            <Send size={20} aria-hidden="true" />
            <span className="text-xs font-bold text-zinc-300">Reddit</span>
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
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-primary shrink-0"
          >
            {copyStatus === 'copied' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            <span>{copyStatus === 'copied' ? 'Copied' : 'Copy message'}</span>
          </button>
        </div>

        {copyStatus === 'copied' && (
          <p role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-emerald-300">
            <Check size={14} aria-hidden="true" />
            Message copied to your clipboard.
          </p>
        )}

        {copyStatus === 'error' && (
          <p role="alert" aria-live="assertive" className="flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle size={14} aria-hidden="true" />
            Clipboard access failed. The link is selected. Press Ctrl+C (or Cmd+C) to copy it manually.
          </p>
        )}
          </>
        )}

      </div>
    </div>
  );
}
