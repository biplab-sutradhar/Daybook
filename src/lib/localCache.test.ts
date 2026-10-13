import { afterEach, describe, expect, it } from 'vitest';

import type { WorkspaceData } from './db';
import { clearUserCache, purgeExpiredCaches, readCache, writeCache } from './localCache';

const empty: WorkspaceData = {
  profile: null,
  tasks: [],
  goals: [],
  notes: [],
  inbox: [],
  logs: [],
  reviews: [],
  topics: [],
  entries: [],
};

class MemoryStorage implements Storage {
  private items = new Map<string, string>();

  get length() {
    return this.items.size;
  }

  clear() {
    this.items.clear();
  }

  getItem(key: string) {
    return this.items.get(key) ?? null;
  }

  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.items.delete(key);
  }

  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

function useStorage(store: MemoryStorage) {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: store });
}

describe('local workspace cache', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('writes and reads a workspace until it expires', () => {
    useStorage(new MemoryStorage());
    const future = '2026-10-20T00:00:00.000Z';
    expect(writeCache('user-1', empty, future)).toBe(true);
    expect(readCache('user-1', Date.parse('2026-10-12T00:00:00.000Z'))?.data).toEqual(empty);

    purgeExpiredCaches(Date.parse('2026-10-21T00:00:00.000Z'));
    expect(readCache('user-1', Date.parse('2026-10-21T00:00:00.000Z'))).toBeNull();
  });

  it('clears one account without touching another', () => {
    useStorage(new MemoryStorage());
    writeCache('user-1', empty, '2026-10-20T00:00:00.000Z');
    writeCache('user-2', empty, '2026-10-20T00:00:00.000Z');
    clearUserCache('user-1');
    expect(readCache('user-1', Date.parse('2026-10-12T00:00:00.000Z'))).toBeNull();
    expect(readCache('user-2', Date.parse('2026-10-12T00:00:00.000Z'))).not.toBeNull();
  });

  it('keeps going when the browser refuses another write', () => {
    const store = new MemoryStorage();
    store.setItem = () => {
      throw new Error('quota');
    };
    useStorage(store);
    expect(writeCache('user-1', empty, '2026-10-20T00:00:00.000Z')).toBe(false);
  });
});
