import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { createLocalListStore } from '@/lib/local-list-store';

/**
 * Recently used Admin screens.
 *
 * A list of route paths. There is no server-side store for it, and inventing
 * one would mean a backend change for something that is genuinely per-person
 * and per-device — so this is local, not a stand-in for an API.
 *
 * The recorder lives in `useAdminVisitRecorder`, mounted by the Admin layout so
 * it sees every screen. It used to sit inside the read hook, which only the
 * landing page called — and the landing page is the one path the recorder skips,
 * so the list could never fill up.
 *
 * Admin had a favourites list alongside this one; it was removed at the user's
 * request. Directory keeps its own, unrelated favourites in
 * `pages/directory/use-directory-favourites`.
 */

/* Detail routes ("…/users/extension/42") get recorded too but resolve to no nav
   entry, so the landing page drops them. Storing well beyond the eight shown
   means a run of those cannot crowd out the real screens behind them. */
const recentStore = createLocalListStore('mcm-admin-recent', 24);

/**
 * Records the current Admin screen. Mount once, in the Admin layout — every
 * screen renders inside it, so every screen gets recorded.
 */
export const useAdminVisitRecorder = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!pathname.startsWith('/admin-settings') || pathname === '/admin-settings') return;
    recentStore.push(pathname);
  }, [pathname]);
};

export const useAdminShortcuts = () => {
  const recent = recentStore.use();
  const clearRecent = useCallback(() => recentStore.clear(), []);

  return { recent, clearRecent };
};
