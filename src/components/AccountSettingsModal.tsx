import { useState } from 'react';
import { AlertTriangle, Shield, UserRound, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

interface AccountSettingsModalProps {
  user: User;
  onClose: () => void;
  onDeleteAccount: () => Promise<void>;
}

export function AccountSettingsModal({ user, onClose, onDeleteAccount }: AccountSettingsModalProps) {
  const dialogRef = useAccessibleDialog(onClose);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmation.trim().toUpperCase() === 'DELETE';

  const handleDelete = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canDelete || isDeleting) return;

    setIsDeleting(true);
    setError(null);
    try {
      await onDeleteAccount();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'We could not delete your account. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-settings-dialog-title"
        tabIndex={-1}
        className="glass-modal w-full max-w-lg space-y-6 rounded-3xl border border-zinc-800 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <UserRound className="text-rose-400" size={20} />
            <h2 id="account-settings-dialog-title" className="font-display text-lg font-bold text-white">
              Account settings
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close account settings"
            className="min-h-11 min-w-11 rounded-full p-2.5 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <>
            <section className="space-y-3" aria-labelledby="account-identity-heading">
              <div className="flex items-center gap-2">
                <Shield className="text-emerald-400" size={17} />
                <h3 id="account-identity-heading" className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Signed-in account
                </h3>
              </div>
              <p className="break-all rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-200">
                {user.email ?? 'Authenticated StreamFlicker account'}
              </p>
              <p className="text-xs leading-relaxed text-zinc-500">
                Your watchlist and preferences are stored on this device and are not synced to this account.
              </p>
            </section>

            <section className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4" aria-labelledby="delete-account-heading">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 shrink-0 text-rose-300" size={18} />
                <div className="space-y-2">
                  <h3 id="delete-account-heading" className="font-bold text-white">Delete account</h3>
                  <p className="text-sm leading-relaxed text-zinc-300">
                    Permanently delete your StreamFlicker account and associated account data. This action cannot be undone.
                  </p>
                  {!isConfirmingDelete ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsConfirmingDelete(true);
                        setError(null);
                      }}
                      className="mt-2 min-h-11 rounded-xl border border-rose-500/50 px-4 py-2.5 text-sm font-bold text-rose-200 hover:bg-rose-500/10"
                    >
                      Delete account
                    </button>
                  ) : (
                    <form onSubmit={handleDelete} className="mt-4 space-y-3">
                      <label htmlFor="delete-account-confirmation" className="block text-xs font-bold uppercase tracking-wider text-rose-200">
                        Type DELETE to confirm
                      </label>
                      <input
                        id="delete-account-confirmation"
                        value={confirmation}
                        onChange={(event) => setConfirmation(event.target.value)}
                        autoComplete="off"
                        disabled={isDeleting}
                        className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      {error && <p role="alert" className="text-xs text-rose-200">{error}</p>}
                      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setIsConfirmingDelete(false);
                            setConfirmation('');
                            setError(null);
                          }}
                          disabled={isDeleting}
                          className="min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!canDelete || isDeleting}
                          className="min-h-11 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting…' : 'Permanently delete'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </section>
        </>
      </div>
    </div>
  );
}
