import { useState } from 'react';
import { X, Bell, DollarSign, MonitorPlay, Check, AlertCircle } from 'lucide-react';
import type { Movie } from '../data/movies';
import type { User } from '@supabase/supabase-js';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

interface AlertsModalProps {
  movie: Movie;
  user: User | null;
  onClose: () => void;
  onOpenAuth: () => void;
}

interface StoredAlertPreference {
  userId: string;
  movieId: string;
  type: 'price' | 'stream';
  targetPrice?: number;
  savedAt: string;
}

const ALERT_PREFERENCES_KEY = 'streamflicker_alert_preferences';

export function AlertsModal({ movie, user, onClose, onOpenAuth }: AlertsModalProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const [activeTab, setActiveTab] = useState<'price' | 'stream'>('price');
  const [targetPrice, setTargetPrice] = useState('4.99');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  if (!user) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="alerts-auth-title"
          tabIndex={-1}
          className="glass-modal w-full max-w-md rounded-2xl border border-zinc-800 shadow-2xl p-8 text-center relative"
        >
          <button onClick={onClose} aria-label="Close alert preference" className="absolute top-4 right-4 p-2.5 min-w-11 min-h-11 text-zinc-400 hover:text-white">
            <X size={18} />
          </button>
          <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-4 border border-zinc-800">
            <Bell size={28} className="text-zinc-500" />
          </div>
          <h2 id="alerts-auth-title" className="text-xl font-bold text-white mb-2">Sign In Required</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Sign in to save an alert preference for {movie.title} on this device.
          </p>
          <button
            onClick={() => {
              onClose();
              onOpenAuth();
            }}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
          >
            Sign In / Create Account
          </button>
        </div>
      </div>
    );
  }

  const handleSetAlert = async () => {
    setLoading(true);
    setError(null);

    try {
      const price = Number.parseFloat(targetPrice);
      if (activeTab === 'price' && (!Number.isFinite(price) || price <= 0 || price > 1000)) {
        setError('Enter a target price between $0.01 and $1,000.');
        return;
      }

      const savedValue = localStorage.getItem(ALERT_PREFERENCES_KEY);
      const parsed: unknown = savedValue ? JSON.parse(savedValue) : [];
      const existing = Array.isArray(parsed)
        ? parsed.filter((item): item is StoredAlertPreference => typeof item === 'object' && item !== null)
        : [];
      const withoutDuplicate = existing.filter(
        (item) => !(item.userId === user.id && item.movieId === movie.id && item.type === activeTab),
      );
      const nextPreference: StoredAlertPreference = {
        userId: user.id,
        movieId: movie.id,
        type: activeTab,
        ...(activeTab === 'price' ? { targetPrice: price } : {}),
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(
        ALERT_PREFERENCES_KEY,
        JSON.stringify([...withoutDuplicate, nextPreference]),
      );
      setSuccess(true);
    } catch {
      setError('The preference could not be saved in this browser.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="alerts-dialog-title"
        tabIndex={-1}
        className="glass-modal w-full max-w-md rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
          <div id="alerts-dialog-title" className="flex items-center gap-2 text-white font-bold">
            <Bell size={18} className="text-amber-500" />
            <span>Set Alert</span>
          </div>
          <button onClick={onClose} aria-label="Close alert preference" className="text-zinc-400 hover:text-white p-2.5 min-w-11 min-h-11 rounded-full bg-zinc-800/50 hover:bg-zinc-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          <div className="flex items-center gap-4 mb-6">
            <img src={movie.posterUrl} alt={`${movie.title} poster`} width="64" height="96" className="w-16 h-24 object-cover rounded-md shadow-lg" />
            <div>
              <h3 className="font-bold text-white text-lg leading-tight mb-1">{movie.title}</h3>
              <p className="text-sm text-zinc-400">{movie.year}</p>
            </div>
          </div>

          <div className="flex bg-zinc-900/80 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('price')}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${
                activeTab === 'price' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <DollarSign size={14} /> Price Drop
            </button>
            <button
              onClick={() => setActiveTab('stream')}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all flex items-center justify-center gap-2 ${
                activeTab === 'stream' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <MonitorPlay size={14} /> Streaming
            </button>
          </div>

          {activeTab === 'price' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                <AlertCircle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-400/90 leading-relaxed">
                  This local build saves your target on this device. Email delivery requires a notification backend and is not active yet.
                </p>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Target Price (USD)</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="1000"
                    required
                    inputMode="decimal"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stream' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
                <AlertCircle size={16} className="text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-400/90 leading-relaxed">
                  This local build saves your service preference on this device. Automatic availability notifications are not active yet.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/50">
          {error && <p role="alert" className="mb-3 text-xs text-rose-300">{error}</p>}
          <button
            onClick={handleSetAlert}
            disabled={loading || success}
            className={`w-full font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-80
              ${success 
                ? 'bg-emerald-600 text-white shadow-emerald-600/20' 
                : 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white'
              }
            `}
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : success ? (
              <>
                <Check size={18} /> Preference Saved
              </>
            ) : (
              'Save Preference'
            )}
          </button>
          {success && (
            <p role="status" className="mt-3 text-center text-xs text-zinc-400">
              Saved on this device. No email or notification was sent.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
