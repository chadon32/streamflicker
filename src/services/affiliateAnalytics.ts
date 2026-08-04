const LOCAL_CLICK_COUNTS_KEY = 'streamflicker_affiliate_click_counts';

interface AffiliateClick {
  providerId: string;
  movieId: string;
}

interface StoredClickCounts {
  date: string;
  providers: Record<string, number>;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readLocalCounts(): StoredClickCounts {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_CLICK_COUNTS_KEY) || 'null') as StoredClickCounts | null;
    if (saved?.date === todayKey() && saved.providers && typeof saved.providers === 'object') {
      return saved;
    }
  } catch {
    // Ignore malformed local diagnostics and start a fresh counter.
  }

  return { date: todayKey(), providers: {} };
}

/**
 * Record an outbound provider click without collecting identity data. If a
 * first-party endpoint is configured, the same minimal event can be sent for
 * conversion reporting; otherwise the browser keeps only a daily local count.
 */
export function recordAffiliateClick({ providerId, movieId }: AffiliateClick) {
  const normalizedProvider = providerId.trim().toLowerCase();
  if (!normalizedProvider || !movieId.trim() || typeof window === 'undefined') return;

  const counts = readLocalCounts();
  counts.providers[normalizedProvider] = (counts.providers[normalizedProvider] || 0) + 1;
  try {
    localStorage.setItem(LOCAL_CLICK_COUNTS_KEY, JSON.stringify(counts));
  } catch {
    // Storage may be unavailable in private browsing; the click can continue.
  }

  const payload = JSON.stringify({
    event: 'affiliate_click',
    providerId: normalizedProvider,
    movieId: movieId.trim(),
    occurredAt: new Date().toISOString(),
  });

  window.dispatchEvent(new CustomEvent('streamflicker:affiliate-click', {
    detail: { providerId: normalizedProvider, movieId: movieId.trim() },
  }));

  const endpoint = (import.meta.env as Record<string, string | undefined>).VITE_AFFILIATE_CLICK_ENDPOINT?.trim();
  if (!endpoint) return;

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }));
      return;
    }

    void fetch(endpoint, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });
  } catch {
    // Outbound navigation should never be blocked by optional measurement.
  }
}
