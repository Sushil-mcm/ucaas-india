import { useSyncExternalStore } from 'react';

/**
 * A list of strings kept in localStorage, shared by every component that reads it.
 *
 * Favourites and recently-used lists are per-person and per-device, and the
 * platform has no endpoint for either — so they live here rather than pretending
 * to be server state. React Query would be the wrong home for the same reason:
 * there is nothing to fetch or invalidate.
 *
 * Reads go through a module-level cache instead of component state because the
 * same list is rendered in several places at once — a star in a table row and
 * the list on another screen — and all of them must agree the moment one changes.
 * `useSyncExternalStore` compares snapshots by identity, so the cache must hand
 * back the *same array reference* until the list genuinely changes.
 */

const EMPTY: string[] = [];

const read = (key: string): string[] => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

const write = (key: string, value: string[]) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private browsing or a full quota — these lists are a convenience, so
       failing to persist one must never break the page. */
  }
};

const cache = new Map<string, string[]>();
const listeners = new Set<() => void>();

/* One `storage` listener for the whole module, not one per subscriber: the
   event is global, so binding it per component would re-notify N times. */
let storageBound = false;
const bindStorage = () => {
  if (storageBound || typeof window === 'undefined') return;
  storageBound = true;
  window.addEventListener('storage', (event) => {
    /* Another tab changed a list we hold — drop it so the next read re-reads. */
    if (!event.key || !cache.has(event.key)) return;
    cache.delete(event.key);
    listeners.forEach((listener) => listener());
  });
};

const subscribe = (listener: () => void) => {
  bindStorage();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export type LocalListStore = {
  get: () => string[];
  set: (next: string[]) => void;
  /** Adds when absent, removes when present. */
  toggle: (item: string) => void;
  /** Moves an item to the front, trimming to `limit`. */
  push: (item: string) => void;
  clear: () => void;
  /** Subscribes the calling component to this list. */
  use: () => string[];
};

export const createLocalListStore = (key: string, limit?: number): LocalListStore => {
  const get = () => {
    if (!cache.has(key)) cache.set(key, read(key));
    return cache.get(key) as string[];
  };

  const set = (next: string[]) => {
    const capped = limit ? next.slice(0, limit) : next;
    cache.set(key, capped);
    write(key, capped);
    listeners.forEach((listener) => listener());
  };

  return {
    get,
    set,
    toggle: (item: string) => {
      const previous = get();
      set(
        previous.includes(item)
          ? previous.filter((entry) => entry !== item)
          : [...previous, item],
      );
    },
    push: (item: string) => {
      const previous = get();
      /* Re-opening what is already at the front must not rewrite the list. */
      if (previous[0] === item) return;
      set([item, ...previous.filter((entry) => entry !== item)]);
    },
    clear: () => set([]),
    use: () =>
      useSyncExternalStore(
        subscribe,
        get,
        () => EMPTY,
      ),
  };
};
