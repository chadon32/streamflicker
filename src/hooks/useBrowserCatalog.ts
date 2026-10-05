import { useCallback, useEffect, useState } from 'react';
import type { Movie } from '../data/catalog';

export type BrowserCatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

const IDLE_TIMEOUT_MS = 4000;
const IDLE_FALLBACK_DELAY_MS = 2500;

/**
 * Loads the full 1,799-record catalog off the critical path. The home page runs
 * on the 17 reviewed titles that ship with the app; the rest arrives once the
 * page has settled (so search, browse and filters feel instant), or immediately
 * when something needs it (`needed`).
 */
export function useBrowserCatalog(needed: boolean) {
  const [catalog, setCatalog] = useState<Movie[] | null>(null);
  const [status, setStatus] = useState<BrowserCatalogStatus>('idle');
  const [requested, setRequested] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (needed) setRequested(true);
  }, [needed]);

  // Warm the catalog after the page has finished loading, without competing with
  // the hero image and poster requests.
  useEffect(() => {
    if (requested) return;
    let cancel: (() => void) | undefined;
    const request = () => setRequested(true);
    const schedule = () => {
      if (typeof window.requestIdleCallback === 'function') {
        const handle = window.requestIdleCallback(request, { timeout: IDLE_TIMEOUT_MS });
        cancel = () => window.cancelIdleCallback(handle);
      } else {
        const handle = window.setTimeout(request, IDLE_FALLBACK_DELAY_MS);
        cancel = () => window.clearTimeout(handle);
      }
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
    return () => {
      window.removeEventListener('load', schedule);
      cancel?.();
    };
  }, [requested]);

  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    setStatus('loading');
    import('../data/generatedMovies')
      .then(({ SAMPLE_MOVIES }) => {
        if (cancelled) return;
        setCatalog(SAMPLE_MOVIES);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [requested, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { catalog, status, retry };
}
