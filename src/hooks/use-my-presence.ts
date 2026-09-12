import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { useDialpad } from '@/hooks/use-dialpad';

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
 * THIS FILE IS THE ONLY PLACE THE THREE STATES ARE NAMED. Four different
 * vocabularies for the same three states had grown up across the product - the
 * header chip printed the raw value ("online"), the header menu said "Online",
 * the People screens said "Available", and an unused constant here said
 * "On Queue". Somebody setting themselves Busy in one screen and reading it
 * back in another saw two different words for what they had just done.
 * Everything that names a presence state now imports from here.
 *
 * Not to be confused with the *live* state on Performance and the directory -
 * Available / On Call / Offline - which is derived from the socket and cannot
 * be set. That answers "what is this person doing now"; this answers "what has
 * this person declared". A person can be On Call while their declared state is
 * Available, and both readings are correct.
 */

export type PresenceStatus = 'online' | 'busy' | 'dnd';

const VALID: PresenceStatus[] = ['online', 'busy', 'dnd'];
const OVERRIDE_TIMEOUT_MS = 15000;
const OVERRIDE_QUERY_KEY = ['my-presence-override'];

/** What each state is called on screen. One name per state, everywhere. */
export const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  online: 'Available',
  busy: 'Busy',
  dnd: 'Do not disturb',
};

/**
 * What each state actually does to an incoming call, in the caller's terms.
 *
 * These are not decoration: Busy is the one people get wrong, because the word
 * suggests it stops everything and it does not. The switch reads presence off
 * the same `call_forwarding` record this menu writes, and holds back colleagues
 * only - a customer ringing one of your numbers still gets through. A screen
 * that just says "Busy" is claiming something the platform does not do.
 *
 * Do not disturb is the same trap one level up. It reads as "nothing reaches
 * me", and for calls addressed to you that is true. It is NOT true of queue
 * calls: the switch applies these rules in person_call_plan, which runs only
 * when a call is routed to a person's extension - direct, DID, internal or
 * transferred. Queue delivery goes through the call-centre path and never
 * consults presence, so a queue agent on Do not disturb still gets queue
 * calls. That is the same split the reference products draw, and it is
 * deliberate; the wording just has to say so rather than promise silence.
 */
export const PRESENCE_DESCRIPTION: Record<PresenceStatus, string> = {
  online: 'Calls ring you as normal.',
  busy: 'Colleagues go to your voicemail. Calls from outside still ring you.',
  dnd: 'Calls to you go to your voicemail, inside and outside. Queue calls still reach you.',
};

/** The three states in the order they are offered. */
export const PRESENCE_STATES: {
  value: PresenceStatus;
  label: string;
  description: string;
}[] = VALID.map((value) => ({
  value,
  label: PRESENCE_LABEL[value],
  description: PRESENCE_DESCRIPTION[value],
}));

/**
 * The colour a presence dot takes, in the four tones the directory tags
 * already use (`good` → pos, `busy` → neg, `warn` → warn, `idle` → neu).
 *
 * Three states are not enough to colour honestly, because two things that are
 * not a declared status still change what a colleague should expect:
 *
 *   on a call        - unavailable right now whatever they declared
 *   never signed in  - invited, no presence to report; not the same as free
 *
 * Reading a green dot for somebody mid-call, or for somebody who has never
 * logged in, is the failure this exists to stop.
 */
export type PresenceTone = 'good' | 'busy' | 'warn' | 'idle';

export const presenceTone = (
  status: PresenceStatus,
  opts?: { onCall?: boolean; signedIn?: boolean },
): PresenceTone => {
  if (opts?.signedIn === false) return 'idle';
  if (opts?.onCall) return 'busy';
  if (status === 'dnd') return 'busy';
  if (status === 'busy') return 'warn';
  return 'good';
};

/**
 * The written reason beside the dot. A colour alone cannot distinguish "on a
 * call" from "do not disturb" - both are unavailable and both read red - so
 * anything not plainly Available says why in words. Returns null when the
 * label already says everything.
 */
export const presenceQualifier = (
  status: PresenceStatus,
  opts?: { onCall?: boolean; signedIn?: boolean },
): string | null => {
  if (opts?.signedIn === false) return 'Has not signed in yet';
  if (opts?.onCall) return 'On a call';
  if (status === 'dnd') return PRESENCE_LABEL.dnd;
  if (status === 'busy') return PRESENCE_LABEL.busy;
  return null;
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

/**
 * Whether this browser currently has a live call.
 *
 * Presence broadcasts used to send a hard-coded `onCall: false` no matter what
 * the person was doing, so changing your status mid-call told every colleague
 * you were free. Six screens read that flag - messenger, departments and the
 * admin People list among them. Performance was the only one immune, because
 * it derives On Call from `activeQueueCalls` rather than trusting the
 * broadcast.
 *
 * A session exists from the moment a call is set up until it is torn down, so
 * this covers ringing, connected and held alike - which is what a colleague
 * looking at a presence dot wants to know.
 */
export const useIsOnCall = () => {
  const { sessions } = useDialpad();
  return Object.keys(sessions || {}).length > 0;
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

  return {
    status,
    label: PRESENCE_LABEL[status],
    description: PRESENCE_DESCRIPTION[status],
    isLive: Boolean(livePresence),
  };
};

export default useMyPresence;
