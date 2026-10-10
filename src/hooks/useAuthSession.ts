import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { mayHaveSupabaseSession } from '../lib/authHint';

const NO_STORAGE: Pick<Storage, 'length' | 'key'> = { length: 0, key: () => null };

function pageMayHaveSession(): boolean {
  let storage = NO_STORAGE;
  try {
    storage = window.localStorage;
  } catch {
    // Reading localStorage can throw when storage is blocked.
  }
  return mayHaveSupabaseSession(storage, window.location);
}

/**
 * Optional account session. Native builds use an offline-first guest mode, so a
 * release build never exposes a sign-in path that cannot work without a reachable
 * Supabase project. On the web the SDK (52 KB) is only loaded when the visitor
 * might be signed in, or asks to sign in (`wantSdk`); everyone else is simply a
 * guest from the first render.
 */
export function useAuthSession(authEnabled: boolean) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!authEnabled);
  const [sdkWanted, setSdkWanted] = useState(() => authEnabled && pageMayHaveSession());

  useEffect(() => {
    if (!authEnabled) return;
    if (!sdkWanted) {
      setAuthReady(true);
      return;
    }

    let disposed = false;
    let subscription: { unsubscribe: () => void } | null = null;

    void import('../lib/supabase').then(({ supabase }) => {
      if (disposed) return;

      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!disposed) {
          setUser(user);
          setAuthReady(true);
        }
      }).catch(() => {
        if (!disposed) {
          setUser(null);
          setAuthReady(true);
        }
      });

      const authState = supabase.auth.onAuthStateChange((event, session) => {
        if (!disposed) {
          setUser(session?.user ?? null);
          if (event !== 'INITIAL_SESSION') setAuthReady(true);
        }
      });
      subscription = authState.data.subscription;
    }).catch(() => {
      if (!disposed) {
        setUser(null);
        setAuthReady(true);
      }
    });

    return () => {
      disposed = true;
      subscription?.unsubscribe();
    };
  }, [authEnabled, sdkWanted]);

  const wantSdk = useCallback(() => setSdkWanted(true), []);
  return { user, authReady, wantSdk };
}
