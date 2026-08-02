import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Mail, Lock, Film, AlertCircle } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

interface AuthModalProps {
  onClose: () => void;
  onAuthSuccess: () => void;
}

export function AuthModal({ onClose, onAuthSuccess }: AuthModalProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setFieldErrors({});

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      setFieldErrors({ email: 'Enter a valid email address.' });
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError('Your password must be at least 8 characters.');
      setFieldErrors({ password: 'Use at least 8 characters.' });
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
        onAuthSuccess();
      } else {
        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
        setMessage('Check your email for the confirmation link.');
      }
    } catch {
      setError(
        isLogin
          ? 'Unable to sign in with those credentials.'
          : 'Unable to create the account. Check the form and try again.',
      );
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
        aria-labelledby="auth-dialog-title"
        aria-describedby="auth-dialog-description"
        tabIndex={-1}
        className="glass-modal w-full max-w-md rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden relative"
      >
        <button
          onClick={onClose}
          aria-label="Close authentication"
          className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 p-2 rounded-full transition-colors z-10"
        >
          <X size={18} />
        </button>

        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Film size={24} className="text-white" />
            </div>
          </div>
          
          <h2 id="auth-dialog-title" className="text-2xl font-display font-bold text-center text-white mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p id="auth-dialog-description" className="text-center text-zinc-400 text-sm mb-8">
            {isLogin 
              ? 'Sign in to access your Watchlist and Alerts' 
              : 'Sign up to track price drops and stream availability'}
          </p>

          {error && (
            <div role="alert" className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-red-400 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div role="status" className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2 text-emerald-400 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4" noValidate>
            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-zinc-400 mb-1.5 ml-1 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  id="auth-email"
                  required
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((current) => ({ ...current, email: undefined }));
                    setError(null);
                  }}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>
              {fieldErrors.email && <p id="auth-email-error" className="mt-1.5 px-1 text-xs text-rose-300">{fieldErrors.email}</p>}
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-semibold text-zinc-400 mb-1.5 ml-1 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  id="auth-password"
                  required
                  minLength={8}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'auth-password-error' : undefined}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((current) => ({ ...current, password: undefined }));
                    setError(null);
                  }}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              {fieldErrors.password && <p id="auth-password-error" className="mt-1.5 px-1 text-xs text-rose-300">{fieldErrors.password}</p>}
            </div>

            <button
              type="submit"
              name="auth-submit"
              aria-label={loading ? (isLogin ? 'Signing in' : 'Creating account') : (isLogin ? 'Sign in' : 'Create account')}
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setMessage(null);
                setFieldErrors({});
              }}
              className="text-rose-400 hover:text-rose-300 font-semibold hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
