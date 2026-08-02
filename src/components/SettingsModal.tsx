import { useState } from 'react';
import { X, Settings, Key, Tag, Check, RefreshCw } from 'lucide-react';
import { DEFAULT_AFFILIATE_CONFIG, type AffiliateConfig } from '../services/affiliate';
import { STREAMING_PROVIDERS } from '../data/catalog';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

interface SettingsModalProps {
  onClose: () => void;
  onSave: (tmdbKey: string, affiliate: AffiliateConfig) => void;
}

export function SettingsModal({ onClose, onSave }: SettingsModalProps) {
  const dialogRef = useAccessibleDialog(onClose);
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
  
  const [affiliate, setAffiliate] = useState<AffiliateConfig>(() => {
    try {
      const saved = localStorage.getItem('streamflicker_affiliate_config');
      return saved ? JSON.parse(saved) : DEFAULT_AFFILIATE_CONFIG;
    } catch {
      return DEFAULT_AFFILIATE_CONFIG;
    }
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tmdbKey.trim()) {
      localStorage.setItem('streamflicker_tmdb_key', tmdbKey.trim());
    } else {
      localStorage.removeItem('streamflicker_tmdb_key');
    }
    localStorage.setItem('streamflicker_affiliate_config', JSON.stringify(affiliate));
    localStorage.setItem('streamflicker_my_services', JSON.stringify(myServices));

    onSave(tmdbKey.trim(), affiliate);
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

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* TMDB API Key */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Key size={14} className="text-rose-400" /> Live search (optional)
            </label>
            <p className="text-xs text-zinc-400">
              Add a free key from <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="text-rose-400 underline">TMDB</a> if you want broader live movie search. Most people can leave this blank.
            </p>
            <p className="text-xs text-amber-300/90">
              This key stays in this browser and is visible to site scripts. Use a restricted client key only.
            </p>
            <input
              type="password"
              value={tmdbKey}
              onChange={(e) => setTmdbKey(e.target.value)}
              placeholder="e.g. 8a3f81b2c45d6e7f..."
              autoComplete="off"
              spellCheck="false"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-rose-500"
            />
          </div>

          {/* Affiliate IDs */}
          <div className="space-y-4 pt-2 border-t border-zinc-900">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Tag size={14} className="text-amber-400" /> Advanced link tracking
            </label>
            <p className="text-xs text-zinc-400">
              Optional IDs for site owners. Leave these fields blank if you are simply browsing movies.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Amazon Tag</label>
                <input
                  type="text"
                  value={affiliate.amazonTag}
                  onChange={(e) => setAffiliate({ ...affiliate, amazonTag: e.target.value })}
                  placeholder="streamflicker-20"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Apple TV Token</label>
                <input
                  type="text"
                  value={affiliate.appleAffiliateToken}
                  onChange={(e) => setAffiliate({ ...affiliate, appleAffiliateToken: e.target.value })}
                  placeholder="1000l33x"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Impact SubID (Hulu / Max)</label>
                <input
                  type="text"
                  value={affiliate.impactSubId}
                  onChange={(e) => setAffiliate({ ...affiliate, impactSubId: e.target.value })}
                  placeholder="streamflicker"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">eBay Campaign ID</label>
                <input
                  type="text"
                  value={affiliate.ebayCampId}
                  onChange={(e) => setAffiliate({ ...affiliate, ebayCampId: e.target.value })}
                  placeholder="5338123456"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none"
                />
              </div>
            </div>
          </div>

          {/* My Streaming Services */}
          <div className="space-y-4 pt-4 border-t border-zinc-900">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Check size={14} className="text-emerald-400" /> Your streaming services
            </label>
            <p className="text-xs text-zinc-400">
              Select the services you already use so the catalog can narrow to likely options. This preference stays in this browser.
            </p>

            <div className="flex flex-wrap gap-2">
              {STREAMING_PROVIDERS.map(provider => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => {
                    setMyServices(prev => 
                      prev.includes(provider.id) 
                        ? prev.filter(id => id !== provider.id)
                        : [...prev, provider.id]
                    );
                  }}
                  aria-pressed={myServices.includes(provider.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    myServices.includes(provider.id)
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {provider.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setTmdbKey('');
                setMyServices([]);
                setAffiliate(DEFAULT_AFFILIATE_CONFIG);
              }}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw size={12} /> Reset optional settings
            </button>

            <button
              type="submit"
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5"
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
