import { supabase } from '../lib/supabase';

/**
 * Permanently deletes the currently authenticated Supabase account.
 *
 * The actual deletion runs in a Supabase Edge Function so the service-role
 * key never reaches the browser bundle. The function authorizes the request
 * from the user's access token and deletes only that user's auth record.
 */
export async function deleteCurrentAccount(): Promise<void> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error('We could not verify your account session. Please sign in again.');
  }

  if (!session?.access_token) {
    throw new Error('Please sign in before deleting your account.');
  }

  const { error: deleteError } = await supabase.functions.invoke('delete-account', {
    body: {},
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (deleteError) {
    throw new Error(deleteError.message || 'We could not delete your account. Please try again.');
  }

  // The server-side deletion succeeds before this call. Sign out locally so
  // the UI cannot keep rendering a deleted session if token cleanup fails.
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    console.warn('The account was deleted, but local sign-out needs attention.', signOutError);
  }
}
