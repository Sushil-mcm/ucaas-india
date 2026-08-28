import { CloseIcon } from '@/assets/icons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';
import { useJitsi } from '@/hooks/use-jitsi';
import { useMeetingSessionId } from '@/hooks/use-meeting-session-id';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { removeEnvPrefix } from '@/lib/utils';
import { endMeeting, leaveMeeting } from '@/services/api';
import { useMutation } from '@tanstack/react-query';

const EndMeetingConfirmation = ({
  handleClose = () => null,
  meetState,
}: {
  handleClose: any;
  meetState: any;
}) => {
  const { endMeetingForSelf, isHost, endMeetingForAll, roomCode } = useJitsi();
  const sessionId = useMeetingSessionId();
  console.log(meetState, sessionId);

  const { user } = useUser();
  const meetingActorUuid = user?.uuid || user?.guest_info?.uuid;
  const { socketEventsManager, handleTerminateCall, handleMeetDecline } = useSocketEvents();

  const { mutate: endMeetingMutate, isPending } = useMutation({
    mutationKey: ['endMeeting'],
    mutationFn: endMeeting,
    onSuccess: () => {
      // Emit nats-meet-terminate — same as connect-web handleLeaveMeeting
      handleTerminateCall({
        chatId: roomCode || removeEnvPrefix(roomCode) || '',
        userID: meetingActorUuid,
      });
      if (user?.uuid) handleSocketEvent();
      endMeetingForAll();
    },
  });
  const handleLeaveMeeting = async () => {
    // Emit nats-meet-leave — same as connect-web handleLeaveMeeting
    handleMeetDecline({
      chatId: roomCode || removeEnvPrefix(roomCode) || '',
      userID: meetingActorUuid,
    });
    if (user?.uuid) handleSocketEvent();
    // Await so all tracks are disposed before navigating away
    await endMeetingForSelf(false);
    handleClose();
  };

  const handleEndMeeting = async () => {
    // Emit nats-meet-terminate — same as connect-web handleLeaveMeeting
    handleTerminateCall({
      chatId: roomCode,
      userID: meetingActorUuid,
    });
    if (user?.uuid) handleSocketEvent();
    // endMeetingForAll kicks all participants and disposes all local tracks
    await endMeetingForAll();
    handleClose();
  };

  const { mutate: leaveMeetingMutate } = useMutation({
    mutationKey: ['leaveMeeting'],
    mutationFn: leaveMeeting,
    onSuccess: () => {
      handleLeaveMeeting();
    },
  });
  console.log(sessionId, isHost, leaveMeetingMutate, endMeetingMutate);

  const handleSocketEvent = () => {
    socketEventsManager?.emit(
      'user-presence-update',
      {
        doc: {
          userId: user?.user_info?.extension,
          domain: user?.sip_credentials?.domain,
          uuid: user?.uuid,
          status: 'online',
          onCall: false,
          timeObj: {
            holiday_start_date: null,
            holiday_end_date: null,
          },
        },
      },
      (response: any) => {
        console.log('User-presence-update:', response);
      },
    );
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent
        className="w-full max-w-sm p-3"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-1.5  text-900/80">
          <div className="font-semibold truncate text-md flex items-center justify-between">
            Please confirm
            <div
              onClick={() => handleClose()}
              className="cursor-pointer text-gray-500 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            >
              <CloseIcon className="w-3 h-3" />
            </div>
          </div>
        </div>

        <DialogDescription>
          <p className="text-md">Are you sure you want to end this meeting?</p>
        </DialogDescription>

        <div className="flex justify-end  w-full gap-2">
          <Button
            variant={'transparent'}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleLeaveMeeting();
              // leaveMeetingMutate({ meetingId: roomCode, sessionId: sessionId, type: isHost ? 'host' : user?.uuid ? 'user' : 'guest' });
            }}
          >
            {isPending ? 'Please wait...' : 'Leave Meeting'}
          </Button>
          {isHost && (
            <Button
              variant={'primary'}
              type="submit"
              onClick={(e) => {
                e.stopPropagation();
                handleEndMeeting();
                // leaveMeetingMutate({ meetingId: roomCode, sessionId: sessionId, type: isHost ? 'host' : user?.uuid ? 'user' : 'guest' });
              }}
              // onClick={() => {
              //   endMeetingMutate({ meetingId: meetState?.meetUniqueKey });
              // }}
            >
              {isPending ? 'Please wait...' : 'End for all'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EndMeetingConfirmation;
