import type { Movie } from '../data/catalog';

export const WATCHLIST_STORAGE_KEY = 'streamflicker_watchlist';
export const LEGACY_WATCHLIST_STORAGE_KEY = 'streamflicker_watchlist:legacy:v1';
export const GUEST_ID_STORAGE_KEY = 'streamflicker_guest_id';
export const WATCHLIST_STORAGE_PREFIX = 'streamflicker_watchlist:v2:';

export interface WatchlistStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface MigrationStorage extends WatchlistStorage {
  removeItem?(key: string): void;
}

let memoryGuestId: string | null = null;

function browserStorage(): MigrationStorage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function createGuestId(): string {
  const randomUuid = globalThis.crypto?.randomUUID;
  if (randomUuid) return randomUuid.call(globalThis.crypto);
  return `guest_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function getGuestId(storage: WatchlistStorage | null = browserStorage()): string {
  if (storage) {
    const existing = storage.getItem(GUEST_ID_STORAGE_KEY)?.trim();
    if (existing) return existing;
    const created = createGuestId();
    storage.setItem(GUEST_ID_STORAGE_KEY, created);
    return created;
  }
  memoryGuestId ??= createGuestId();
  return memoryGuestId;
}

export function getWatchlistStorageKey(
  userId: string | null | undefined,
  storage: WatchlistStorage | null = browserStorage(),
): string {
  const normalizedUserId = userId?.trim();
  if (normalizedUserId) return `${WATCHLIST_STORAGE_PREFIX}user:${encodeURIComponent(normalizedUserId)}`;
  return `${WATCHLIST_STORAGE_PREFIX}guest:${encodeURIComponent(getGuestId(storage))}`;
}

export function parseStoredWatchlist(value: string | null): Movie[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is Movie =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Movie).id === 'string' &&
        typeof (item as Movie).title === 'string' &&
        Array.isArray((item as Movie).streamingPlatforms),
    ).map((movie) => ({
      ...movie,
      streamingPlatforms: movie.availability?.status === 'verified'
        ? movie.streamingPlatforms.filter((platform) => platform.availabilityStatus === 'verified')
        : [],
      availability: movie.availability ?? {
        status: 'discovery',
        source: 'bundled',
        region: 'US',
      },
    }));
  } catch {
    return [];
  }
}

/**
 * Preserve the pre-namespace global list in a separate migration key. Its
 * owner cannot be determined, so it is never assigned to a guest or account
 * namespace automatically.
 */
export function migrateLegacyWatchlist(storage: MigrationStorage | null = browserStorage()): void {
  if (!storage) return;
  const legacy = storage.getItem(WATCHLIST_STORAGE_KEY);
  if (legacy === null) return;

  if (storage.getItem(LEGACY_WATCHLIST_STORAGE_KEY) === null) {
    storage.setItem(LEGACY_WATCHLIST_STORAGE_KEY, legacy);
  }
}

export function loadWatchlistForUser(
  userId: string | null | undefined,
  storage: MigrationStorage | null = browserStorage(),
): Movie[] {
  migrateLegacyWatchlist(storage);
  if (!storage) return [];
  return parseStoredWatchlist(storage.getItem(getWatchlistStorageKey(userId, storage)));
}

export function saveWatchlistForUser(
  userId: string | null | undefined,
  watchlist: Movie[],
  storage: WatchlistStorage | null = browserStorage(),
): void {
  if (!storage) return;
  storage.setItem(getWatchlistStorageKey(userId, storage), JSON.stringify(watchlist));
}

export function getLegacyWatchlist(storage: MigrationStorage | null = browserStorage()): Movie[] {
  migrateLegacyWatchlist(storage);
  return storage ? parseStoredWatchlist(storage.getItem(LEGACY_WATCHLIST_STORAGE_KEY)) : [];
}

/**
 * Importing a pre-account list into a signed-in namespace is deliberately an
 * explicit operation. The legacy backup remains available for recovery.
 */
export function importLegacyWatchlistToUser(
  userId: string,
  storage: MigrationStorage | null = browserStorage(),
): Movie[] {
  if (!userId.trim()) throw new Error('A signed-in user is required to import a watchlist.');
  const legacy = getLegacyWatchlist(storage);
  const existing = loadWatchlistForUser(userId, storage);
  const byId = new Map(existing.map((movie) => [movie.id, movie]));
  for (const movie of legacy) byId.set(movie.id, movie);
  const merged = [...byId.values()];
  saveWatchlistForUser(userId, merged, storage);
  return merged;
}

/**
 * Importing into the guest namespace is also deliberate because the legacy
 * list may have belonged to a previous signed-in user on this device.
 */
export function importLegacyWatchlistToGuest(
  storage: MigrationStorage | null = browserStorage(),
): Movie[] {
  const legacy = getLegacyWatchlist(storage);
  const existing = loadWatchlistForUser(null, storage);
  const byId = new Map(existing.map((movie) => [movie.id, movie]));
  for (const movie of legacy) byId.set(movie.id, movie);
  const merged = [...byId.values()];
  saveWatchlistForUser(null, merged, storage);
  return merged;
}
