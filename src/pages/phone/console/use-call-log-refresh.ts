import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDialpad } from '@/hooks/use-dialpad';
import { isTerminalSession } from './use-console-call';

/**
 * Refreshes the call list when a call ends.
 *
 * The list is an infinite query keyed on `console-call-list`, and nothing was
 * telling it a call had happened. It refetched on mount, on window refocus, or
 * when someone pressed the refresh button — so a call placed from this very
 * page did not appear afterwards, and looked like the log was simply slow.
 *
 * The delays are the point. The CDR is written server-side *after* the switch
 * tears the call down, so invalidating the instant the session ends usually
 * refetches a moment too early and shows the same stale list. Rather than pick
 * one delay and hope, it retries on a short schedule and stops as soon as the
 * call shows up.
 */

/* First attempt is quick because most CDRs land almost immediately; the later
   ones cover a slow write without making the common case wait for them. */
const RETRY_DELAYS_MS = [1200, 4000, 10000];

export const useCallLogRefresh = () => {
  const queryClient = useQueryClient();
  const { sessions } = useDialpad();

  /* Which sessions have already triggered a refresh, so a session sitting in
     'ended' across re-renders does not schedule the timers again. */
  const handledRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const all = Object.values(sessions || {});

    /* Forget sessions the dialpad has dropped, so the set cannot grow for the
       lifetime of the tab. */
    const liveIds = new Set(all.map((session: any) => String(session?.id || '')));
    handledRef.current.forEach((id) => {
      if (!liveIds.has(id)) handledRef.current.delete(id);
    });

    all.forEach((session: any) => {
      const id = String(session?.id || '');
      if (!id || handledRef.current.has(id)) return;
      if (!isTerminalSession(session)) return;

      handledRef.current.add(id);

      RETRY_DELAYS_MS.forEach((delay) => {
        const timer = window.setTimeout(() => {
          /* Predicate rather than an exact key: the list is keyed by source,
             direction and date range, so the tab the person is looking at is
             only one of several cached variants. Refreshing the lot means the
             call is there whichever filter they switch to next. */
          queryClient.invalidateQueries({
            predicate: (query) => query.queryKey?.[0] === 'console-call-list',
          });
        }, delay);
        timersRef.current.push(timer);
      });
    });
  }, [sessions, queryClient]);

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    },
    [],
  );
};

export default useCallLogRefresh;
