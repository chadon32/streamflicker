import { useState } from 'react';
import { X, ShieldCheck, FileText, Lock, AlertCircle } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

export type LegalTab = 'terms' | 'privacy' | 'affiliate' | 'dmca';

interface LegalModalProps {
  initialTab?: LegalTab;
  onClose: () => void;
}

export function LegalModal({ initialTab = 'affiliate', onClose }: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const dialogRef = useAccessibleDialog(onClose);

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
        aria-label="Legal information"
        tabIndex={-1}
        className="glass-modal w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col max-h-[85vh]"
      >
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-2 overflow-x-auto" role="tablist" aria-label="Legal topics">
            <button
              onClick={() => setActiveTab('affiliate')}
              role="tab"
              aria-selected={activeTab === 'affiliate'}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'affiliate'
                  ? 'bg-rose-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <AlertCircle size={14} /> Affiliate Disclosure
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              role="tab"
              aria-selected={activeTab === 'privacy'}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'privacy'
                  ? 'bg-rose-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Lock size={14} /> Privacy Policy
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              role="tab"
              aria-selected={activeTab === 'terms'}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'terms'
                  ? 'bg-rose-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <FileText size={14} /> Terms of Service
            </button>
            <button
              onClick={() => setActiveTab('dmca')}
              role="tab"
              aria-selected={activeTab === 'dmca'}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'dmca'
                  ? 'bg-rose-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <ShieldCheck size={14} /> DMCA
            </button>
          </div>
          <button onClick={onClose} aria-label="Close legal information" className="p-2.5 min-w-11 min-h-11 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>

        {/* Modal Content Area */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 text-sm text-zinc-300 space-y-4 leading-relaxed">
          
          {activeTab === 'affiliate' && (
            <div className="space-y-4">
              <h3 className="font-display text-xl font-bold text-white">FTC Affiliate Disclosure</h3>
              <p>
                StreamFlicker may participate in affiliate marketing programs, which means we may earn a commission when you use certain editorially chosen links to retailer or streaming sites.
              </p>
              <p>
                When configured and approved, links to services such as Amazon Prime Video, Apple TV, Hulu, Max, Shudder, or other providers may earn StreamFlicker a commission if you make a purchase or sign up for a trial. This is at no additional cost to you.
              </p>
              <p>
                Our recommendations are strictly independent and designed to help users find where content is legally available.
              </p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h3 className="font-display text-xl font-bold text-white">Privacy Policy</h3>
              <p>
                StreamFlicker is committed to protecting your privacy. We do not require account registration to search for movies or watch trailers.
              </p>
              <h4 className="font-bold text-white text-base">Data Storage & Local State</h4>
              <p>
                Your saved Watchlist preferences and filter settings are stored strictly in your browser&apos;s local storage (`localStorage`). No personal identifying information is sold to third parties.
              </p>
              <h4 className="font-bold text-white text-base">Third-Party Services</h4>
              <p>
                We utilize third-party embeds (such as YouTube for video trailers) and APIs (The Movie Database TMDB). Interaction with these components is subject to their respective privacy policies.
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4">
              <h3 className="font-display text-xl font-bold text-white">Terms of Service</h3>
              <p>
                By accessing StreamFlicker, you agree to comply with these terms. StreamFlicker provides a search engine and trailer directory for discovering films and legitimate streaming options.
              </p>
              <p>
                StreamFlicker does not host, upload, or stream video files. All video trailers are embedded directly from official platforms (such as YouTube).
              </p>
            </div>
          )}

          {activeTab === 'dmca' && (
            <div className="space-y-4">
              <h3 className="font-display text-xl font-bold text-white">DMCA & Copyright Policy</h3>
              <p>
                StreamFlicker respects the intellectual property rights of others. We do not host any copyrighted media content on our servers.
              </p>
              <p>
                All movie titles, images, and poster artwork are properties of their respective studios and rights holders. If you believe your copyrighted work is used inappropriately, please contact us with a formal takedown request.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
