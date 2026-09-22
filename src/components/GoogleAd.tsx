import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

interface GoogleAdProps {
  clientId: string;
  slot: string;
  placement: 'home' | 'results';
}

const ADSENSE_SCRIPT_ID = 'streamflicker-adsense-script';

function ensureAdSenseScript(clientId: string): Promise<void> {
  const existing = document.getElementById(ADSENSE_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing?.dataset.loaded === 'true') return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement('script');
    const handleLoad = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    const handleError = () => reject(new Error('AdSense script could not be loaded'));

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existing) {
      script.id = ADSENSE_SCRIPT_ID;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
      document.head.appendChild(script);
    }
  });
}

export function GoogleAd({ clientId, slot, placement }: GoogleAdProps) {
  const pushed = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!clientId || !slot || pushed.current) return;

    ensureAdSenseScript(clientId)
      .then(() => {
        if (cancelled || pushed.current) return;
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        pushed.current = true;
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, slot]);

  if (failed) return null;

  return (
    <section
      aria-label="Advertisement"
      data-placement={placement}
      className="my-8 min-h-28 rounded-2xl border border-zinc-900 bg-zinc-950/60 px-3 py-4 text-center"
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">Advertisement</p>
      <ins
        className="adsbygoogle block min-h-20 w-full"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </section>
  );
}
