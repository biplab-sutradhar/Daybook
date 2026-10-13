import type { WorkspaceData } from './db';

export const CACHE_PREFIX = 'myspace-cache:';

export interface CachedWorkspace {
  expiresAt: string;
  savedAt: string;
  data: WorkspaceData;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

function storage(): StorageLike | null {
  const candidate = globalThis.localStorage;
  if (!candidate) return null;
  return candidate;
}

export function cacheKey(userId: string) {
  return `${CACHE_PREFIX}${userId}`;
}

function readEntry(raw: string | null, now: number): CachedWorkspace | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedWorkspace;
    if (!parsed?.expiresAt || !parsed.data) return null;
    if (new Date(parsed.expiresAt).getTime() <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function purgeExpiredCaches(now = Date.now()) {
  const store = storage();
  if (!store) return;
  const expired: string[] = [];
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index);
    if (!key?.startsWith(CACHE_PREFIX)) continue;
    const entry = readEntry(store.getItem(key), now);
    if (!entry) expired.push(key);
  }
  expired.forEach((key) => store.removeItem(key));
}

export function readCache(userId: string, now = Date.now()): CachedWorkspace | null {
  const store = storage();
  if (!store) return null;
  const key = cacheKey(userId);
  const entry = readEntry(store.getItem(key), now);
  if (!entry) store.removeItem(key);
  return entry;
}

export function writeCache(userId: string, data: WorkspaceData, expiresAt: string) {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(cacheKey(userId), JSON.stringify({
      expiresAt,
      savedAt: new Date().toISOString(),
      data,
    } satisfies CachedWorkspace));
    return true;
  } catch {
    return false;
  }
}

export function clearUserCache(userId: string) {
  storage()?.removeItem(cacheKey(userId));
}
