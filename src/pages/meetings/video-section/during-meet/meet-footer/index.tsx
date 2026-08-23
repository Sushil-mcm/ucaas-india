import {} from // RecordCircle,
// TranscriptLineIcon,
'@/assets/icons';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { useJitsi } from '@/hooks/use-jitsi';
import {
  Camera,
  Check,
  ChevronUp,
  InfoIcon,
  LucideCircleDot,
  LucideGrid2X2Plus,
  LucideMessageSquareMore,
  LucideMic,
  LucideMicOff,
  LucideSmilePlus,
  LucideVideo,
  LucideVideoOff,
  Mic,
  PhoneIcon,
  ScreenShare,
  ScreenShareOff,
  Users,
  Volume2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import MeetingInfo from './widgets/MeetingInfo';
import InviteParticipants from './widgets/InviteParticipants';
import ParticipantChat from './widgets/participant-chat';
import EmojiReaction from './widgets/EmojiReaction';
import MoreOptions from './widgets/MoreOptions';
import EndMeetingConfirmation from './widgets/EndMeetingConfirmation';
import VirtualBackgroundModal from './widgets/VirtualBackgroundModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMeetingDetails, startStopRecording } from '@/services/api';
import { secondsToHHMMSS } from '@/lib/utils';
import Loader from '@/components/custom/loader';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';

let recordingInterval: any = null;

const MeetFooter = ({
  apiMeetingData,
  meetState,
  widgetType,
  setWidgetType,
  setViewType,
  viewType,
}: {
  apiMeetingData: any;
  meetState: any;
  widgetType: any;
  setWidgetType: any;
  setViewType: any;
  viewType: string;
}) => {
  const {
    isHost,
    isLocalAudioMuted,
    isLocalVideoMuted,
    isScreenShareEnabled,
    muteLocalAudioTrack,
    muteLocalVideoTrack,
    disableScreenShare,
    enableScreenShare,
    emojiReactions,
    isActiveRecording,
    stopRecording,
    startRecording,
    roomAccessRequests,
    devices,
    cameraDeviceId,
    micDeviceId,
    speakerDeviceId,
    setCameraDeviceId,
    setMicDeviceId,
    setSpeakerDeviceId,
    roomCode,
    recordingLoader,
    currentActiveScreenShareId,
    whiteBoardState,
    participantsListing,
  } = useJitsi();
  const { allChats, handleUnread } = useSocketEvents();
  const { user } = useUser();
  const meetingActorUuid = user?.uuid || user?.guest_info?.uuid;
  const currentChat = allChats?.find((chat: any) => chat?.chatId === roomCode);
  const myData = currentChat?.users?.find((chatUser: any) => chatUser?.uuid === meetingActorUuid);
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0);
  const [showVirtualBackgroundModal, setShowVirtualModal] = useState(false);
  const [localRecordingStartTime, setLocalRecordingStartTime] = useState<string | null>(null);
  const [fallbackRecordingStartTime, setFallbackRecordingStartTime] = useState<string | null>(null);
  const prevIsActiveRecording = useRef(isActiveRecording);
  const recordingJustStoppedRef = useRef(false);
  const unreadMsgCount = myData?.unreadMsg || 0;
  const queryClient = useQueryClient();
  const { data: meetingDetails } = useQuery({
    queryKey: ['meetingDetails', roomCode, isActiveRecording],
    queryFn: () => getMeetingDetails({ meetingId: roomCode }),
    enabled: !!roomCode && isActiveRecording,
    select: (data) => data?.data?.data?.result?.[0] || {},
  });

  const recordingStartUtc = meetingDetails?.recordingStartUtc;
  // Prefer fallback over API when set (avoids stale recordingStartUtc after stop→start). Host uses localRecordingStartTime.
  const timerStartTime = localRecordingStartTime || fallbackRecordingStartTime || recordingStartUtc;

  const { mutate: startStopRecordingMutate } = useMutation({
    mutationKey: ['startStopRecording'],
    mutationFn: startStopRecording,
    onSuccess: () => {
      if (isActiveRecording) {
        queryClient.invalidateQueries({ queryKey: ['meetingDetails', roomCode, true] });
        queryClient.removeQueries({ queryKey: ['meetingDetails', roomCode] });
      }
    },
    onError: (error) => {
      console.log('error', error);
    },
  });

  // When recording stops: clear cache and mark that we saw a stop (so next start is a "restart"). When recording starts after a stop: set fallback so guest timer uses fresh start, not stale API.
  useEffect(() => {
    const wasRecording = prevIsActiveRecording.current;
    prevIsActiveRecording.current = isActiveRecording;

    if (wasRecording && !isActiveRecording) {
      queryClient.removeQueries({ queryKey: ['meetingDetails', roomCode] });
      setFallbackRecordingStartTime(null);
      recordingJustStoppedRef.current = true;
    } else if (!wasRecording && isActiveRecording) {
      queryClient.removeQueries({ queryKey: ['meetingDetails', roomCode] });
      if (recordingJustStoppedRef.current) {
        setFallbackRecordingStartTime(new Date().toISOString());
        recordingJustStoppedRef.current = false;
      }
    }
  }, [isActiveRecording, queryClient, roomCode]);

  // Recording timer: use local start time when we just started (avoids stale API data), else API's recordingStartUtc
  useEffect(() => {
    if (!isActiveRecording || !timerStartTime) {
      setRecordingElapsedSeconds(0);
      return;
    }
    const updateElapsed = () => {
      const start = new Date(timerStartTime).getTime();
      setRecordingElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isActiveRecording, timerStartTime]);

  const handleRecordingToggle = async () => {
    if (isActiveRecording) {
      stopRecording();
      setLocalRecordingStartTime(null);
      startStopRecordingHandler();
      clearInterval(recordingInterval);
      recordingInterval = null;
    } else {
      startRecording();
    }
  };

  const toggleScreenShare = () => {
    if (isScreenShareEnabled) {
      disableScreenShare();
      return;
    }
    if (isScreenShareDisabled) return;
    enableScreenShare();
  };

  const isWhiteboardActive = Boolean(whiteBoardState?.isWhiteBoardopen);
  const isAnotherUserSharingScreen = Boolean(
    currentActiveScreenShareId && currentActiveScreenShareId !== '',
  );

  const screenSharingParticipant = participantsListing?.find(
    (p: any) => p?._id === currentActiveScreenShareId,
  );
  const screenSharingName = screenSharingParticipant?._displayName || 'Another participant';

  const isScreenShareDisabled =
    isWhiteboardActive || (isAnotherUserSharingScreen && !isScreenShareEnabled);
  const canInviteParticipants = Boolean(
    isHost && apiMeetingData?.videoFeatures?.access?.TEAM_INVITE,
  );

  let screenShareTooltip = isScreenShareEnabled ? 'Stop Share' : 'Screen Share';
  if (isWhiteboardActive) {
    screenShareTooltip = `Screen share disabled while whiteboard is active (shared by ${whiteBoardState?.startedByName || 'someone'})`;
  } else if (isAnotherUserSharingScreen && !isScreenShareEnabled) {
    screenShareTooltip = `${screenSharingName} is sharing screen`;
  }

  const startStopRecordingHandler = () => {
    const startTime = new Date().toISOString();
    const payload = {
      meetingId: roomCode,
      recordingStartTime: startTime,
      ...(isActiveRecording ? { recordingEndTime: startTime } : {}),
    };
    if (!isActiveRecording) {
      setLocalRecordingStartTime(startTime);
    }
    startStopRecordingMutate(payload);
  };

  const micOptions =
    devices?.micDevices?.map((item: any) => ({
      id: item.deviceId,
      label: item.label || 'Unknown Microphone',
      value: item.deviceId,
    })) || [];

  const speakerOptions =
    devices?.speakerDevices?.map((item: any) => ({
      id: item.deviceId,
      label: item.label || 'Unknown Speaker',
      value: item.deviceId,
    })) || [];
  const cameraOptions =
    devices?.cameraDevices?.map((item: any) => ({
      id: item.deviceId,
      label: item.label || 'Unknown Camera',
      value: item.deviceId,
    })) || [];

  useEffect(() => {
    if (isActiveRecording && isHost) {
      startStopRecordingHandler();
    }
  }, [isActiveRecording]);

  useEffect(() => {
    if (widgetType === 'chat' && unreadMsgCount > 0 && currentChat?.chatId) {
      handleUnread({ chatId: currentChat.chatId, type: 'read' }, true);
    }
  }, [widgetType, unreadMsgCount, currentChat?.chatId]);

  return (
    <div className="flex items-center justify-center px-8 h-20 bg-gray-900">
      <div
        className="relative flex flex-col items-start justify-start gap-1"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div
          className="text-white bg-gray-600 w-12 h-12 rounded-full hover:opacity-80 flex items-center justify-center cursor-pointer"
          onClick={() =>
            setWidgetType((prev: string) => (prev === 'meeting_info' ? '' : 'meeting_info'))
          }
        >
          <InfoIcon className="w-6 h-6" />
        </div>
        <span className="text-white text-xs text-center w-full">Info</span>
        {widgetType === 'meeting_info' && (
          <div className="absolute top-14 z-[9999]">
            <MeetingInfo meetState={meetState} />
          </div>
        )}
      </div>
      <div
        className="flex items-center gap-3 mx-auto"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="relative flex flex-col items-center justify-center gap-1">
          <div className="relative flex items-center">
            <CustomTooltip text={isLocalAudioMuted ? 'Unmute' : 'Mute'} side="top">
              <div
                className="text-white bg-gray-600 w-14 h-12 rounded-l-full  hover:opacity-80 flex items-center justify-center cursor-pointer"
                onClick={muteLocalAudioTrack}
              >
                {!isLocalAudioMuted ? (
                  <LucideMic className="w-6 h-6" />
                ) : (
                  <LucideMicOff className="w-6 h-6" />
                )}
              </div>
            </CustomTooltip>
            <DropdownMenu>
              <DropdownMenuTrigger className=" cursor-pointer focus:outline-0  rounded-r-full   text-white bg-gray-700 w-11 h-12 flex items-center justify-center ">
                <ChevronUp className="w-4.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel className="flex items-center gap-1 font-bold">
                  <Mic size={16} />
                  Audio Devices
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {micOptions?.length ? (
                  micOptions?.map((mic: { id: string; label: string; value: string }) => {
                    const isSelected = mic?.id === micDeviceId;

                    return (
                      <DropdownMenuItem
                        key={mic?.id}
                        className="flex items-center justify-between"
                        onClick={() => setMicDeviceId(mic?.value)}
                      >
                        {mic?.label}
                        {isSelected && <Check className="w-4 h-4 text-green-600" />}
                      </DropdownMenuItem>
                    );
                  })
                ) : (
                  <DropdownMenuItem disabled>No microphone found</DropdownMenuItem>
                )}
                <DropdownMenuGroup>
                  <DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuSubTrigger className="flex items-center gap-1 font-bold">
                      <Volume2 size={15} />
                      Speaker Devices
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        {speakerOptions?.length ? (
                          speakerOptions?.map(
                            (speaker: { id: string; label: string; value: string }) => {
                              const isSelected = speaker?.id === speakerDeviceId;
                              return (
                                <DropdownMenuItem
                                  key={speaker?.id}
                                  className="flex items-center justify-between"
                                  onClick={() => setSpeakerDeviceId(speaker?.value)}
                                >
                                  {speaker?.label}
                                  {isSelected && <Check className="w-4 h-4 text-green-600" />}
                                </DropdownMenuItem>
                              );
                            },
                          )
                        ) : (
                          <DropdownMenuItem disabled>No speakers found</DropdownMenuItem>
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <span className="text-white text-xs text-center ">
            {isLocalAudioMuted ? 'Unmute' : 'Mute'}
          </span>
        </div>{' '}
        <div className="relative flex flex-col items-center justify-center gap-1">
          <div className="relative flex items-center">
            <CustomTooltip text={isLocalVideoMuted ? 'Video On' : 'Video Off'} side="top">
              <div
                className="text-white bg-gray-600 w-14 h-12 rounded-l-full  hover:opacity-80 flex items-center justify-center cursor-pointer"
                onClick={muteLocalVideoTrack}
              >
                {isLocalVideoMuted ? (
                  <LucideVideoOff className="w-6 h-6" />
                ) : (
                  <LucideVideo className="w-6 h-6" />
                )}
              </div>
            </CustomTooltip>
            <DropdownMenu>
              <DropdownMenuTrigger className=" cursor-pointer focus:outline-0  rounded-r-full   text-white bg-gray-700 w-11 h-12 flex items-center justify-center ">
                <ChevronUp className="w-4.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel className="flex items-center gap-1 font-bold">
                  <Camera size={16} />
                  Camera Devices
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {cameraOptions?.length ? (
                  cameraOptions?.map((camera: { id: string; label: string; value: string }) => {
                    const isSelected = camera?.id === cameraDeviceId;

                    return (
                      <DropdownMenuItem
                        key={camera?.id}
                        className="flex items-center justify-between"
                        onClick={() => setCameraDeviceId(camera?.value)}
                      >
                        {camera?.label}
                        {isSelected && <Check className="w-4 h-4 text-green-600" />}
                      </DropdownMenuItem>
                    );
                  })
                ) : (
                  <DropdownMenuItem disabled>No speakers found</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <span className="text-white text-xs text-center ">
            {isLocalVideoMuted ? 'Video On' : 'Video Off'}
          </span>
        </div>
        {apiMeetingData?.videoFeatures?.access?.SCREEN_SHARING && (
          <div className="relative flex flex-col items-center justify-center gap-1">
            <CustomTooltip text={screenShareTooltip} side="top">
              <div
                className={`w-12 h-12 rounded-full text-white ${
                  isScreenShareDisabled
                    ? 'bg-gray-700 opacity-50 cursor-not-allowed'
                    : 'bg-gray-600 hover:opacity-80 cursor-pointer'
                } flex items-center justify-center`}
                onClick={toggleScreenShare}
              >
                {isScreenShareEnabled ? (
                  <ScreenShareOff className="w-6 h-6" />
                ) : (
                  <ScreenShare className="w-6 h-6" />
                )}
              </div>
            </CustomTooltip>
            <span className="text-white text-xs text-center ">
              {isScreenShareEnabled ? 'Stop Share' : 'Screen Share'}
            </span>
          </div>
        )}
        <div className="relative flex flex-col items-center justify-center gap-1">
          <div
            className=" w-12 h-12 rounded-full text-white bg-gray-600 hover:opacity-80 flex items-center justify-center cursor-pointer"
            onClick={() =>
              setWidgetType((prev: string) => (prev === 'participant' ? '' : 'participant'))
            }
          >
            <Users className="w-6 h-6" />
          </div>
          <span className="text-white text-xs text-center ">Participants</span>
          {roomAccessRequests && roomAccessRequests.length ? (
            <span className="min-w-6 h-6 text-xs rounded-full bg-red-700 text-white flex items-center justify-center cursor-pointer absolute -top-[8px] -right-[8px]">
              {roomAccessRequests?.length}
            </span>
          ) : null}
        </div>
        {apiMeetingData?.videoFeatures?.access?.CHAT && (
          <div
            className="relative flex flex-col items-center justify-center gap-1"
            // onClick={() => {
            //   setUnreadMsg(0);
            // }}
          >
            <div
              className="text-white bg-gray-600 w-12 h-12 rounded-full hover:opacity-80 flex items-center justify-center cursor-pointer"
              onClick={() => {
                handleUnread({ chatId: currentChat?.chatId, type: 'read' }, true);
                setWidgetType((prev: any) => (prev === 'chat' ? '' : 'chat'));
              }}
            >
              <LucideMessageSquareMore className="w-6 h-6" />
            </div>
            <span className="text-white text-xs text-center ">Chat</span>
            {unreadMsgCount > 0 && widgetType !== 'chat' && (
              <span className="bg-red-600 absolute text-white font-normal  rounded-full -top-[5px] left-[33px] px-1  border-white border-2 text-xs  min-w-5 min-h-5 flex items-center justify-center ">
                {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
              </span>
            )}
          </div>
        )}
        <div className="relative flex flex-col items-center justify-center gap-1">
          <div
            className="text-white bg-gray-600 w-12 h-12 rounded-full hover:opacity-80 flex items-center justify-center cursor-pointer"
            onClick={() => setWidgetType((prev: string) => (prev === 'reaction' ? '' : 'reaction'))}
          >
            <LucideSmilePlus className="w-6 h-6" />
          </div>
          <span className="text-white text-xs text-center ">Reaction</span>
          {widgetType === 'reaction' && <EmojiReaction apiMeetingData={apiMeetingData} />}
          {emojiReactions?.length > 0 &&
            emojiReactions?.map((reaction, index) => (
              <div key={index} className="flying-emoji">
                {reaction?.msg ? reaction?.msg : reaction}
              </div>
            ))}
        </div>
        {isHost && apiMeetingData?.videoFeatures?.access?.RECORDING && (
          <div
            onClick={handleRecordingToggle}
            className="relative flex flex-col items-center justify-center gap-1"
          >
            <CustomTooltip
              text={isActiveRecording ? 'Stop Recording' : 'Start Recording'}
              side="top"
            >
              <div
                className={`w-12 h-12 rounded-full ${
                  isActiveRecording ? 'bg-red-600' : 'bg-gray-600'
                } hover:opacity-80 flex items-center justify-center cursor-pointer`}
              >
                {recordingLoader ? (
                  <Loader variant="white" />
                ) : (
                  <LucideCircleDot className="w-6 h-6 text-white" />
                )}
              </div>
            </CustomTooltip>
            <span className="text-white text-xs text-center ">Recording</span>
          </div>
        )}
        <div className="relative flex flex-col items-center justify-center gap-1">
          <div
            onClick={() => setWidgetType((prev: string) => (prev === 'more' ? '' : 'more'))}
            className="text-white bg-gray-600 w-12 h-12 rounded-full hover:opacity-80 flex items-center justify-center cursor-pointer"
          >
            <LucideGrid2X2Plus className="w-6 h-6" />
          </div>
          <span className="text-white text-xs text-center ">More</span>
          {widgetType === 'more' && (
            <MoreOptions
              setViewType={setViewType}
              viewType={viewType}
              setShowVirtualModal={setShowVirtualModal}
              setWidgetType={setWidgetType}
              apiMeetingData={apiMeetingData}
              meetState={meetState}
            />
          )}
          {canInviteParticipants && widgetType === 'invite_participants' && (
            <InviteParticipants meetState={meetState} />
          )}
          {canInviteParticipants && widgetType === 'invite_members_direct' && (
            <InviteParticipants
              meetState={meetState}
              directModalType="members"
              onClose={() => setWidgetType('')}
            />
          )}
          {canInviteParticipants && widgetType === 'invite_others_direct' && (
            <InviteParticipants
              meetState={meetState}
              directModalType="others"
              onClose={() => setWidgetType('')}
            />
          )}
        </div>
        <div
          className="flex items-center gap-3"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="relative flex flex-col items-center justify-center gap-1">
            <CustomTooltip text={'Leave Meeting'} side="top">
              <div
                className="w-12 h-12 rounded-full bg-red-700 hover:bg-red-700/80 flex items-center justify-center cursor-pointer"
                onClick={() =>
                  setWidgetType((prev: string) => (prev === 'leave_meeting' ? '' : 'leave_meeting'))
                }
              >
                <PhoneIcon className="w-6 h-6 text-white rotate-[135deg]" />
              </div>
            </CustomTooltip>
            <span className="text-white text-xs text-center ">End</span>
          </div>
        </div>
        {['participant', 'chat'].includes(widgetType) && (
          <ParticipantChat
            handleClose={(e: any) => {
              e.stopPropagation();
              setWidgetType('');
            }}
            defaultTab={widgetType}
          />
        )}
        {['leave_meeting'].includes(widgetType) && (
          <EndMeetingConfirmation
            handleClose={() => {
              setWidgetType('');
            }}
            meetState={meetState}
          />
        )}
      </div>

      {isActiveRecording && (
        <div className="rounded-sm px-3 py-2 bg-red-100 text-xs text-red-600 font-semibold min-w-[94px]">
          <span className="flex items-center gap-2">
            <LucideCircleDot className="animate-pulse" />
            {secondsToHHMMSS(recordingElapsedSeconds)}
          </span>
        </div>
      )}
      {showVirtualBackgroundModal && (
        <VirtualBackgroundModal
          handleClose={() => {
            setShowVirtualModal(false);
          }}
        />
      )}
    </div>
  );
};

export default MeetFooter;
