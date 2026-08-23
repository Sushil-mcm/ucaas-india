import { useMemo } from 'react';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';

/**
 * The signed-in user's own presence, resolved once.
 *
 * Live socket presence wins; the value stored on the profile is the fallback
 * for the window before the first presence frame arrives. The header chip and
 * the avatar menu both read this, so they cannot show different states at the
 * same moment.
 */

export type PresenceStatus = 'online' | 'busy' | 'dnd';

const VALID: PresenceStatus[] = ['online', 'busy', 'dnd'];

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

export const useMyPresence = () => {
  const { user } = useUser();
  const { usersOnlineStatus } = useSocketEvents();
  const extension = user?.user_info?.extension;

  const livePresence = useMemo(
    () => usersOnlineStatus?.find((item: any) => String(item?.userId) === String(extension)),
    [usersOnlineStatus, extension],
  );

  const status: PresenceStatus = useMemo(
    () => normalize(livePresence?.status) || normalize(user?.socket_status) || 'online',
    [livePresence?.status, user?.socket_status],
  );

  return { status, label: PRESENCE_LABEL[status], isLive: Boolean(livePresence) };
};

export default useMyPresence;
