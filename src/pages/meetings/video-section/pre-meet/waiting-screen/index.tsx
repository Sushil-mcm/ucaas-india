import { Button } from '@/components/ui/button';
import { useJitsi } from '@/hooks/use-jitsi';
import { useMeetingSessionId } from '@/hooks/use-meeting-session-id';
import { useUser } from '@/hooks/use-user';
import { handleAlert } from '@/lib/utils';
import { validateMeet } from '@/services/api';
import { useMutation } from '@tanstack/react-query';

const WaitingScreen = () => {
  const { roomCode, joinMeetHandler, roomInstance, waitingRoomJoined } = useJitsi();
  const { user } = useUser();
  const sessionId = useMeetingSessionId();

  const { mutateAsync: validateMeetingAgain, isPending: isValidatingMeeting } = useMutation({
    mutationFn: validateMeet,
    mutationKey: ['validateMeetFromWaitingScreen'],
  });

  const handleTryAgain = async () => {
    const meetingId = String(roomCode || '').trim();
    if (!meetingId) {
      handleAlert({ text: 'Meeting ID is missing.', type: 'error' });
      return;
    }

    try {
      const response: any = await validateMeetingAgain({
        meetingId,
        token: user?.token ? user?.token : undefined,
        sessionId,
        confirm: false,
      });

      const result = response?.data?.data?.result || {};
      const isHostJoined = Boolean(result?.isHostJoined);

      if (!isHostJoined) {
        handleAlert({
          text: 'Host has not joined yet. Please try again in a moment.',
          type: 'info',
        });
        return;
      }

      if (waitingRoomJoined && roomInstance?.isJoined?.()) {
        await roomInstance.leave().catch(() => null);
      }

      await joinMeetHandler(result?.name || 'Meeting');
    } catch (error: any) {
      const text = error?.response?.data?.error?.message || 'Unable to validate meeting right now.';
      handleAlert({ text, type: 'error' });
    }
  };

  return (
    <div className="w-full flex sm:flex-row xs:flex-col overflow-hidden h-full m-auto">
      <div className="w-full  flex flex-col items-center justify-center gap-2">
        <h5 className="text-center">Host not joined yet. Please try again after some time.</h5>
        <Button onClick={handleTryAgain} disabled={isValidatingMeeting}>
          {isValidatingMeeting ? 'Checking...' : 'Try Again'}
        </Button>
      </div>
    </div>
  );
};

export default WaitingScreen;
