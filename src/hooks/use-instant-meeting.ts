import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import moment from 'moment';
import { createMeeting } from '@/services/api';
import { handleAlert } from '@/lib/utils';

/**
 * Start a video call with someone, right now.
 *
 * The messenger's own video button runs through `handleAVCall`, which is tied
 * to that component's media checks and local state and cannot be called from
 * anywhere else. This is the other path the platform already has: create an
 * INSTANT meeting and open it — the same call `Video Meetings ▸ Instant
 * meeting` makes — with the person added as a member so they are invited
 * rather than left to find the room.
 *
 * Timezone note: the platform rejects the legacy `Asia/Calcutta` spelling that
 * some browsers still report, so it is normalised the way the meetings page
 * does it.
 */

export type MeetingInvitee = {
  user_uuid: string;
  name?: string;
  email?: string;
};

const browserTimezone = () => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return tz === 'Asia/Calcutta' ? 'Asia/Kolkata' : tz;
};

export const useInstantMeeting = () => {
  const { mutate, isPending } = useMutation({
    mutationFn: createMeeting,
    onSuccess: (response: any) => {
      const meetingId = response?.data?.data?.result?.meetingId;
      if (!meetingId) {
        handleAlert({ type: 'error', text: 'The meeting was created but returned no room code.' });
        return;
      }
      window.open(`/video-meet?meetCode=${meetingId}`, '_blank', 'noopener');
    },
    onError: ({ response }: any) => {
      handleAlert({
        type: 'error',
        text: response?.data?.error?.message || 'Could not start the video call.',
      });
    },
  });

  /** `invitee` omitted starts a room with nobody else in it. */
  const startVideoCall = useCallback(
    (invitee?: MeetingInvitee, name?: string) => {
      if (isPending) return;

      mutate({
        name: name || '',
        startTime: moment().format('YYYY-MM-DD HH:mm:ss'),
        allowHost: 'Y',
        timezone: browserTimezone(),
        meetingType: 'INSTANT',
        mode: 'VIDEO',
        duration: 0,
        ...(invitee?.user_uuid
          ? {
              members: [
                {
                  user_uuid: invitee.user_uuid,
                  name: invitee.name,
                  email: invitee.email,
                  invitation_sent: false,
                },
              ],
            }
          : {}),
      });
    },
    [mutate, isPending],
  );

  return { startVideoCall, isStarting: isPending };
};

export default useInstantMeeting;
