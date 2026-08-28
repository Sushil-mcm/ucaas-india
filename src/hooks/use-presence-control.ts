import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMemberForwading, userUpdateStatus } from '@/services/api';
import { useUser } from '@/hooks/use-user';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { mergeCallForwarding } from '@/lib/call-forwarding-record';

/**
 * Availability — Available / Busy / DND.
 *
 * You set your own, and only your own. `POST /api/user/update-status` takes just
 * `{ socket_status }` with no target user, so self is the only thing it can
 * mean; and marking a colleague Busy is the wrong model regardless of plumbing.
 * Admin surfaces therefore show nothing at all on other people's rows.
 *
 * Two earlier attempts got this wrong and are worth not repeating. A control on
 * the user edit drawer called `update-status` while saving *someone else's* form,
 * so an admin silently changed their own presence. A later per-row selector wrote
 * `call_forwarding.status` through `/api/user/update/{uuid}` — that genuinely did
 * change other people's status, which is exactly why it was rejected.
 */

export const PRESENCE_LABELS: Record<string, string> = {
  online: 'Available',
  busy: 'Busy',
  dnd: 'DND',
};

export const PRESENCE_OPTIONS = [
  { value: 'online', label: 'Available' },
  { value: 'busy', label: 'Busy' },
  { value: 'dnd', label: 'DND' },
] as const;

/** Whatever the record reports, expressed as one of the three. */
export const presenceValueOf = (status?: string) => {
  const normalized = String(status || '')
    .trim()
    .toLowerCase();
  if (normalized === 'busy') return 'busy';
  if (['dnd', 'do_not_disturb', 'do-not-disturb'].includes(normalized)) return 'dnd';
  return 'online';
};

export const presenceLabelOf = (status?: string) => PRESENCE_LABELS[presenceValueOf(status)];

/**
 * Sets *your* availability, doing the same two things the header's avatar menu
 * does: write `call_forwarding.status` so call routing actually changes, then
 * broadcast so everyone else's presence dot updates.
 */
export const useMyPresenceControl = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { socketEventsManager } = useSocketEvents();

  const { mutate: updateMember } = useMutation({ mutationFn: updateMemberForwading });

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: userUpdateStatus,
    onSuccess: (_data, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['getUsersDetails'] });
      queryClient.invalidateQueries({ queryKey: ['directoryPeople'] });
      socketEventsManager?.emit(
        'user-presence-update',
        {
          doc: {
            userId: user?.user_info?.extension,
            domain: user?.sip_credentials?.domain,
            uuid: user?.uuid,
            status: variables?.socket_status,
            onCall: false,
            timeObj: { holiday_start_date: null, holiday_end_date: null },
          },
        },
        () => {},
      );
    },
  });

  const setMyPresence = (status: string) => {
    const userInfo: any = user?.user_info || {};
    const roleKey = userInfo?.custom_role_uuid ? 'custom_role_uuid' : 'role_uuid';

    /* The whole record goes back: `/api/user/update` treats a missing field as a
       cleared one, so forwarding rules, role and location all travel with it.
       
       Greetings and settings travel too, and they were missing. Presence changes
       are the most frequent write any person makes — every Busy, Away and back to
       Available — so leaving them out quietly erased somebody's voicemail
       greeting and personal settings the first time they marked themselves busy.
       Both are returned as an object or as JSON text depending on the call, so
       both are normalised before being sent back untouched. */
    const asStoredObject = (value: any) => {
      if (!value) return {};
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    };
    const storedGreetings = asStoredObject(
      (user as any)?.greetings ?? userInfo?.greetings,
    );
    const storedSettings = asStoredObject((user as any)?.settings ?? userInfo?.settings);

    updateMember({
      first_name: userInfo?.first_name || '',
      last_name: userInfo?.last_name || '',
      job_title: userInfo?.job_title || '',
      caller_id: userInfo?.caller_id || '',
      site_uuid: userInfo?.site_uuid || '',
      profile: userInfo?.profile || '',
      [roleKey]: userInfo?.custom_role_uuid || userInfo?.role_uuid || null,
      call_forwarding: mergeCallForwarding((user as any)?.call_forwarding, { status }),
      ...(Object.keys(storedGreetings).length ? { greetings: storedGreetings } : {}),
      ...(Object.keys(storedSettings).length ? { settings: storedSettings } : {}),
      uuid: user?.uuid,
      userID: user?.uuid,
    });

    updateStatus({ socket_status: status });
  };

  return { setMyPresence, isPending, myUuid: user?.uuid };
};
