import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';

/**
 * The signed-in user's own presence, resolved once.
 *
 * Live socket presence wins; the value stored on the profile is the fallback
 * for the window before the first presence frame arrives. The header chip and
 * the avatar menu both read this, so they cannot show different states at the
 * same moment.
 *
 * Picking a status in the avatar menu used to just fire the update mutations
 * and close the popover — nothing here ever reflected the choice, so the
 * indicator only changed once a socket presence frame happened to arrive
 * (never, without a live socket — e.g. in demo mode). setMyPresenceOverride
 * lets the caller show the pick immediately; it is cleared once a live frame
 * confirms it, or after OVERRIDE_TIMEOUT_MS as a safety net so a status that
 * never gets confirmed does not stick forever.
 */

export type PresenceStatus = 'online' | 'busy' | 'dnd';

const VALID: PresenceStatus[] = ['online', 'busy', 'dnd'];
const OVERRIDE_TIMEOUT_MS = 15000;
const OVERRIDE_QUERY_KEY = ['my-presence-override'];

/** What each state is called on screen. "On Queue" is the console's word for available. */
export const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  online: 'On Queue',
  busy: 'Busy',
  dnd: 'Do Not Disturb',
};

const normalize = (value: unknown): PresenceStatus | null => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return (VALID as string[]).includes(normalized) ? (normalized as PresenceStatus) : null;
};

/** Called from the avatar menu the instant a status is picked. */
export const setMyPresenceOverride = (
  queryClient: ReturnType<typeof useQueryClient>,
  status: PresenceStatus,
) => {
  queryClient.setQueryData(OVERRIDE_QUERY_KEY, status);
  window.setTimeout(() => {
    if (queryClient.getQueryData(OVERRIDE_QUERY_KEY) === status) {
      queryClient.setQueryData(OVERRIDE_QUERY_KEY, null);
    }
  }, OVERRIDE_TIMEOUT_MS);
};

export const useMyPresence = () => {
  const { user } = useUser();
  const { usersOnlineStatus } = useSocketEvents();
  const queryClient = useQueryClient();
  const extension = user?.user_info?.extension;

  const livePresence = useMemo(
    () => usersOnlineStatus?.find((item: any) => String(item?.userId) === String(extension)),
    [usersOnlineStatus, extension],
  );

  const { data: override } = useQuery<PresenceStatus | null>({
    queryKey: OVERRIDE_QUERY_KEY,
    queryFn: () => null,
    enabled: false,
    initialData: null,
    staleTime: Infinity,
  });

  // A confirmed live frame is the real source of truth — drop the guess.
  useEffect(() => {
    if (override && normalize(livePresence?.status) === override) {
      queryClient.setQueryData(OVERRIDE_QUERY_KEY, null);
    }
  }, [override, livePresence?.status, queryClient]);

  const status: PresenceStatus =
    normalize(override) ||
    normalize(livePresence?.status) ||
    normalize(user?.socket_status) ||
    'online';

  return { status, label: PRESENCE_LABEL[status], isLive: Boolean(livePresence) };
};

export default useMyPresence;
