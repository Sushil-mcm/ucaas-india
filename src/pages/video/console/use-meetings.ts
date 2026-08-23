import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { meetingList } from '@/services/api';
import { DEMO_ENABLED, demoMeetings, type MeetingState, type VideoMeeting } from './demo-data';
import { rowsOf, toVideoMeeting } from './meetings-adapter';

/**
 * The console's meeting book, from the platform.
 *
 * Reads the same four `meetingList` endpoints the old `/video` pages use, so
 * the console and the pages can never disagree about what is scheduled.
 *
 * Demo fallback follows the phone console's rule — real data always wins, and
 * demo values only fill a gap the API left empty. Concretely: if the API
 * answers with meetings, you see exactly those. If every list comes back empty
 * (a fresh tenant, or the endpoint is down) the console falls back to
 * `demo-data.ts` so the UI can still be judged, and every one of those rows is
 * flagged `isDemo` so the list draws a "Demo data" chip against it.
 *
 * Set `DEMO_ENABLED = false` in demo-data.ts and the fallback disappears —
 * an empty tenant then gets an honest empty state instead.
 */

const LISTS: { key: string; listType: string; state: MeetingState }[] = [
  { key: 'upcoming', listType: 'upcoming_owned', state: 'upcoming' },
  { key: 'invited', listType: 'invited', state: 'upcoming' },
  { key: 'ongoing', listType: 'ongoing', state: 'live' },
  { key: 'past', listType: 'past', state: 'past' },
];

export const useMeetings = (selfName: string, selfId?: string) => {
  const results = useQueries({
    queries: LISTS.map((list) => ({
      queryKey: ['video-console', 'meetings', list.listType],
      queryFn: () => meetingList({ listType: list.listType, page: 1, limit: 25 }),
      // Meeting times matter; a stale list shows a meeting as upcoming after
      // it has started. One minute is short enough to stay honest and long
      // enough that switching tabs does not re-fetch four lists.
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.every((r) => r.isError);

  const live = useMemo(() => {
    const seen = new Set<string>();
    const out: VideoMeeting[] = [];

    results.forEach((result, i) => {
      rowsOf(result.data).forEach((row) => {
        const mapped = toVideoMeeting(row, selfName, selfId);
        if (!mapped) return;
        // `upcoming_owned` and `invited` overlap for meetings you host and
        // were invited to — first list wins so a row cannot appear twice.
        if (seen.has(mapped.id)) return;
        seen.add(mapped.id);
        // The endpoint already decided which book this row belongs to; trust
        // it over our own clock, except where the row says it is finished.
        out.push(mapped.state === 'past' ? mapped : { ...mapped, state: LISTS[i].state });
      });
    });

    return out;
  }, [results.map((r) => r.dataUpdatedAt).join(','), selfName, selfId]);

  const usingDemo = !isLoading && live.length === 0 && DEMO_ENABLED;

  const meetings = useMemo(
    () => (usingDemo ? demoMeetings(selfName) : live),
    [usingDemo, live, selfName],
  );

  return { meetings, isLoading, isError, usingDemo };
};
