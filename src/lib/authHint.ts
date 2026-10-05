const STORED_SESSION_KEY = /^sb-.+-auth-token(?:[.-].+)?$/;
const AUTH_REDIRECT_HASH = /[#&](?:access_token|refresh_token|error_description)=/;
const AUTH_REDIRECT_QUERY = /[?&]code=/;

/**
 * Whether this page load could involve a Supabase session: a stored session (or
 * pending PKCE exchange), or an auth redirect such as an email-confirmation link.
 * When it cannot, the 52 KB auth SDK stays out of the page entirely.
 *
 * Storage and location are injected so the check is testable and so a blocked
 * `localStorage` (private windows, strict settings) simply reads as "no session".
 */
export function mayHaveSupabaseSession(
  storage: Pick<Storage, 'length' | 'key'>,
  location: Pick<Location, 'hash' | 'search'>,
): boolean {
  if (AUTH_REDIRECT_HASH.test(location.hash) || AUTH_REDIRECT_QUERY.test(location.search)) return true;
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && STORED_SESSION_KEY.test(key)) return true;
    }
  } catch {
    // Blocked storage cannot hold a session we could restore.
  }
  return false;
}
