import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Recently used and favourite Admin screens.
 *
 * Both are lists of route paths held in localStorage. There is no server-side
 * store for either, and inventing one would mean a backend change for something
 * that is genuinely per-person and per-device — so this is deliberately local,
 * not a stand-in for an API that exists.
 */

const RECENT_KEY = 'mcm-admin-recent';
const FAVOURITES_KEY = 'mcm-admin-favourites';
const RECENT_LIMIT = 8;

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
    /* Private browsing or a full quota — the lists are a convenience, so
       failing to persist them must never break the page. */
  }
};

export const useAdminShortcuts = () => {
  const { pathname } = useLocation();
  const [recent, setRecent] = useState<string[]>(() => read(RECENT_KEY));
  const [favourites, setFavourites] = useState<string[]>(() => read(FAVOURITES_KEY));

  /* Record any admin screen that is not this landing page itself. */
  useEffect(() => {
    if (!pathname.startsWith('/admin-settings') || pathname === '/admin-settings') return;
    setRecent((previous) => {
      const next = [pathname, ...previous.filter((item) => item !== pathname)].slice(
        0,
        RECENT_LIMIT,
      );
      write(RECENT_KEY, next);
      return next;
    });
  }, [pathname]);

  const toggleFavourite = useCallback((path: string) => {
    setFavourites((previous) => {
      const next = previous.includes(path)
        ? previous.filter((item) => item !== path)
        : [...previous, path];
      write(FAVOURITES_KEY, next);
      return next;
    });
  }, []);

  const isFavourite = useCallback((path: string) => favourites.includes(path), [favourites]);

  return { recent, favourites, toggleFavourite, isFavourite };
};
