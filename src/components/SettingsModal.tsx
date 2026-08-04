import { useEffect, useState } from 'react';
import { X, Settings, Key, Tag, Check, RefreshCw } from 'lucide-react';
import { getAffiliateConfig, type AffiliateConfig } from '../services/affiliate';
import { STREAMING_PROVIDERS } from '../data/catalog';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

interface SettingsModalProps {
  onClose: () => void;
  onSave: (tmdbKey: string, affiliate: AffiliateConfig) => void;
}

export function SettingsModal({ onClose, onSave }: SettingsModalProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  );
  const [tmdbKey, setTmdbKey] = useState(
    localStorage.getItem('streamflicker_tmdb_key') || ''
  );
  
  const [myServices, setMyServices] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('streamflicker_my_services');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [affiliate, setAffiliate] = useState<AffiliateConfig>(getAffiliateConfig);

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleViewportChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };

    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleViewportChange);
    return () => mediaQuery.removeEventListener('change', handleViewportChange);
  }, []);

  // Keep configuration-only controls out of public/mobile builds; production uses deployment config.
  const showSiteOwnerOptions = import.meta.env.DEV && !isMobileViewport;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tmdbKey.trim()) {
      localStorage.setItem('streamflicker_tmdb_key', tmdbKey.trim());
    } else {
      localStorage.removeItem('streamflicker_tmdb_key');
    }
    if (showSiteOwnerOptions) {
      localStorage.setItem('streamflicker_affiliate_config', JSON.stringify(affiliate));
    } else {
      localStorage.removeItem('streamflicker_affiliate_config');
    }
    localStorage.setItem('streamflicker_my_services', JSON.stringify(myServices));

    onSave(tmdbKey.trim(), showSiteOwnerOptions ? affiliate : getAffiliateConfig());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
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
        aria-labelledby="settings-dialog-title"
        tabIndex={-1}
        className="glass-modal w-full max-w-xl rounded-3xl p-6 shadow-2xl border border-zinc-800 space-y-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <Settings className="text-rose-500" size={20} />
            <h2 id="settings-dialog-title" className="font-display font-bold text-lg text-white">Preferences & integrations</h2>
          </div>
          <button onClick={onClose} aria-label="Close settings" className="p-2.5 min-w-11 min-h-11 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="space-y-4" aria-labelledby="streaming-services-heading">
            <div>
              <h3 id="streaming-services-heading" className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Check size={14} className="text-emerald-400" /> Your streaming services
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Select the services you already use. Choose <strong className="font-semibold text-zinc-300">My services</strong> in Filters to see likely options first. These choices stay on this device.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {STREAMING_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => {
                    setMyServices((previous) =>
                      previous.includes(provider.id)
                        ? previous.filter((id) => id !== provider.id)
                        : [...previous, provider.id],
                    );
                  }}
                  aria-pressed={myServices.includes(provider.id)}
                  className={`min-h-10 rounded-full border px-3.5 py-2 text-xs font-bold transition-all ${
                    myServices.includes(provider.id)
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {provider.name}
                </button>
              ))}
            </div>
          </section>

          {showSiteOwnerOptions && <details className="group rounded-2xl border border-zinc-800 bg-zinc-950/35 p-4">
            <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-wider text-zinc-300 marker:hidden">
              <span className="flex items-center gap-1.5">
                <Tag size={14} className="text-amber-400" /> Advanced site-owner options
              </span>
            </summary>
            <p className="mt-3 text-xs leading-relaxed text-zinc-400">
              These optional fields are for people who manage StreamFlicker or use their own discovery keys. They are never needed to find a movie.
            </p>

            <div className="mt-5 space-y-5 border-t border-zinc-800 pt-5">
              <div className="space-y-2">
                <label htmlFor="tmdb-key" className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Key size={14} className="text-rose-400" /> Live search key (optional)
                </label>
                <p className="text-xs leading-relaxed text-zinc-400">
                  Add a restricted client key from <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="text-rose-400 underline">TMDB</a> only if you need broader live movie search.
                </p>
                <p className="text-xs text-amber-300/90">
                  This key stays in this browser and is visible to site scripts. Do not enter a secret server key.
                </p>
                <input
                  id="tmdb-key"
                  type="password"
                  value={tmdbKey}
                  onChange={(e) => setTmdbKey(e.target.value)}
                  placeholder="e.g. 8a3f81b2c45d6e7f..."
                  autoComplete="off"
                  spellCheck="false"
                  className="w-full min-h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-300">Affiliate link identifiers</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="amazon-tag" className="mb-1 block text-[11px] font-semibold text-zinc-400">Amazon Tag</label>
                    <input id="amazon-tag" type="text" value={affiliate.amazonTag} onChange={(e) => setAffiliate({ ...affiliate, amazonTag: e.target.value })} placeholder="your-approved-amazon-tag" className="w-full min-h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label htmlFor="apple-token" className="mb-1 block text-[11px] font-semibold text-zinc-400">Apple TV Token</label>
                    <input id="apple-token" type="text" value={affiliate.appleAffiliateToken} onChange={(e) => setAffiliate({ ...affiliate, appleAffiliateToken: e.target.value })} placeholder="your-approved-apple-token" className="w-full min-h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label htmlFor="impact-sub-id" className="mb-1 block text-[11px] font-semibold text-zinc-400">Impact SubID (Hulu / Max)</label>
                    <input id="impact-sub-id" type="text" value={affiliate.impactSubId} onChange={(e) => setAffiliate({ ...affiliate, impactSubId: e.target.value })} placeholder="your-approved-sub-id" className="w-full min-h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label htmlFor="ebay-campaign-id" className="mb-1 block text-[11px] font-semibold text-zinc-400">eBay Campaign ID</label>
                    <input id="ebay-campaign-id" type="text" value={affiliate.ebayCampId} onChange={(e) => setAffiliate({ ...affiliate, ebayCampId: e.target.value })} placeholder="your-approved-campaign-id" className="w-full min-h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-rose-500" />
                  </div>
                </div>
              </div>
            </div>
          </details>}

          <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                setTmdbKey('');
                setMyServices([]);
                setAffiliate(getAffiliateConfig());
              }}
              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl px-2 text-xs text-zinc-400 transition-colors hover:text-white"
            >
              <RefreshCw size={12} /> Reset local preferences
            </button>

            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-rose-500"
            >
              {savedSuccess ? <Check size={14} /> : null}
              <span>{savedSuccess ? 'Saved!' : 'Save preferences'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
