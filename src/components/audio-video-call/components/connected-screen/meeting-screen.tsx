import LocalTrackLayout from './local-track-layout';
import RemoteTrackContainer from './remote-track-screen';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { Maximize, Mic, MicOff, Minimize, PhoneIcon, Video, VideoOff } from 'lucide-react';
import { useAvCall } from '@/hooks/use-av-call';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CALL_STATUS_CONST } from '../../constants';
import { useUser } from '@/hooks/use-user';
import { useSocketEvents } from '@/hooks/use-socket-events';
import Draggable from 'react-draggable';
import { handleAlert, removeEnvPrefix } from '@/lib/utils';
import MeetingHeader from '@/pages/meetings/video-section/during-meet/meeting-header';

const NORMAL_GRID_SCROLLABLE_CLASS = 'grid min-h-0 w-full gap-4 items-stretch content-start';
const NORMAL_GRID_COMPACT_CLASS = 'grid h-full min-h-0 w-full gap-4';

const NORMAL_GRID_STYLE_MAP: Record<number, CSSProperties> = {
  1: {
    gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
    gridTemplateRows: 'minmax(0, 1fr)',
  },
  2: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gridTemplateRows: 'minmax(0, 1fr)',
  },
  3: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  },
  4: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  },
  5: {
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  },
  6: {
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  },
  7: {
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
  },
  8: {
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
  },
  9: {
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
  },
};

const getNormalGridStyle = (tileCount: number): CSSProperties =>
  NORMAL_GRID_STYLE_MAP[tileCount] || {
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gridAutoRows: 'minmax(180px, auto)',
  };

const getNormalGridClassName = (isScrollable: boolean): string =>
  isScrollable ? NORMAL_GRID_SCROLLABLE_CLASS : NORMAL_GRID_COMPACT_CLASS;

const getVideoToggleErrorMessage = (rawError: string = '') => {
  const error = String(rawError || '').toLowerCase();
  if (!error) return 'Unable to enable camera right now.';

  if (
    error.includes('notreadable') ||
    error.includes('trackstart') ||
    error.includes('device in use') ||
    error.includes('could not start video source')
  ) {
    return 'Camera is being used by another application.';
  }

  if (error.includes('notallowed') || error.includes('permission')) {
    return 'Camera permission is not enabled.';
  }

  if (error.includes('notfound') || error.includes('devicesnotfound')) {
    return 'No camera device was found.';
  }

  return rawError || 'Unable to enable camera right now.';
};

const CallScreen = ({
  meetState: _meetState,
  isMinimize,
  setIsMinimize,
  handleCallUpdate,
  incominCallData,
}: {
  meetState: any;
  alertMessageId?: string;
  isMinimize?: boolean;
  setIsMinimize?: any;
  handleCallUpdate?: any;
  incominCallData?: any;
}) => {
  console.log('_meetState', _meetState);
  const {
    participantsListing,
    isLocalAudioMuted,
    muteLocalAudioTrack,
    isLocalVideoMuted,
    muteLocalVideoTrack,
    errors,
    endMeeting,
  } = useAvCall();
  const { socketEventsManager, handleTerminateCall, allChats } = useSocketEvents();
  const { user } = useUser();
  const nodeRef = useRef<any>(null);
  const chatId = incominCallData?._doc?.chatId || incominCallData?.chatId;
  const [duration, setDuration] = useState('');
  const [onCall, setOnCall] = useState(false);
  const [callDuration, setCallDuration] = useState('00:00');
  const [isEnablingVideo, setIsEnablingVideo] = useState(false);
  const lastVideoToggleErrorRef = useRef('');
  const totalParticipantsForGrid = 1 + (participantsListing?.length || 0);
  const isScrollableNormalGrid = totalParticipantsForGrid > 9;
  const normalGridClassName = getNormalGridClassName(isScrollableNormalGrid);
  const normalGridStyle = getNormalGridStyle(totalParticipantsForGrid);
  const findChat = allChats?.find((chat: any) => chat?.chatId === chatId);
  useEffect(() => {
    const isOnCall = findChat?.meetMetadata?.onCall === true;
    setOnCall(isOnCall);
    if (isOnCall && findChat?.meetMetadata?.startedAt) {
      setDuration(findChat.meetMetadata.startedAt);
    }
  }, [allChats]);

  useEffect(() => {
    if (!duration) return;
    const tick = () => {
      const diffSec = Math.max(0, Math.floor((Date.now() - new Date(duration).getTime()) / 1000));
      const h = Math.floor(diffSec / 3600);
      const m = Math.floor((diffSec % 3600) / 60);
      const s = diffSec % 60;
      const pad = (n: number) => String(n).padStart(2, '0');
      setCallDuration(h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [duration]);

  const handleEndOrLeaveCall = () => {
    handleTerminateCall({
      chatId: chatId || removeEnvPrefix(chatId) || '',
      userID: user?.uuid,
    });

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

    handleCallUpdate?.(CALL_STATUS_CONST.ENDED);
  };

  useEffect(() => {
    if (incominCallData?.callStatus === CALL_STATUS_CONST.ENDED) {
      endMeeting();
    }
  }, [incominCallData]);

  useEffect(() => {
    if (!isEnablingVideo) return;
    const localVideoError = `${errors?.localVideo || ''}`.trim();
    if (!localVideoError || !isLocalVideoMuted) {
      if (!isLocalVideoMuted) {
        setIsEnablingVideo(false);
      }
      return;
    }

    const normalizedMessage = getVideoToggleErrorMessage(localVideoError);
    if (lastVideoToggleErrorRef.current !== normalizedMessage) {
      lastVideoToggleErrorRef.current = normalizedMessage;
      handleAlert({ text: normalizedMessage, type: 'error' });
    }
    setIsEnablingVideo(false);
  }, [errors?.localVideo, isLocalVideoMuted, isEnablingVideo]);

  const handleVideoToggle = async () => {
    const isTryingToEnableVideo = isLocalVideoMuted;
    if (isTryingToEnableVideo) {
      setIsEnablingVideo(true);
      lastVideoToggleErrorRef.current = '';
    }
    await muteLocalVideoTrack();
    if (!isTryingToEnableVideo) {
      setIsEnablingVideo(false);
      lastVideoToggleErrorRef.current = '';
    }
  };
  return (
    <>
      <div
        className={`w-full  sm:flex-row xs:flex-col min-h-[92vh] max-h-[92vh] overflow-hidden ${isMinimize ? 'hidden' : 'flex'}`}
      >
        <div className="w-full h-[92vh] max-h-[92vh] flex flex-col relative">
          <div className="flex flex-col h-[calc(100%_-_5rem)] min-h-0 p-4 bg-black rounded-tl-lg rounded-tr-lg relative">
            {onCall && (
              <MeetingHeader apiMeetingData={{ startUtc: findChat.meetMetadata.startedAt }} />
            )}
            {/* Call duration — top-left overlay (only while call is active) */}

            <div
              className={`flex-1 min-h-0 ${isScrollableNormalGrid ? 'overflow-y-auto overflow-x-hidden pr-1' : ''}`}
            >
              <div className={normalGridClassName} style={normalGridStyle}>
                <LocalTrackLayout />
                {participantsListing?.length > 0 && <RemoteTrackContainer />}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center px-8 h-20 bg-gray-900 rounded-bl-lg rounded-br-lg">
            <div
              className="flex items-center gap-3"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {/* <div className="relative" onClick={() => setWidgetType('connection')}>
          <CustomTooltip text={'Connection'}>
            <a
        div 
              className="w-12 h-12 rounded-full bg-black-500 hover:opacity-80 flex items-center justify-center cursor-pointer">
              <NetworkBars />
            </a>
            {widgetType === 'connection' && <GoodConnection />}
          </CustomTooltip>
        </div> */}
            </div>

            <div
              className="flex items-center gap-3 mx-auto"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <div
                className="text-white bg-gray-600 hover:opacity-80 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer"
                onClick={() => setIsMinimize(true)}
              >
                <Minimize className="w-6 h-6" />
              </div>
              <div className="relative">
                <CustomTooltip text={isLocalAudioMuted ? 'Unmute' : 'Mute'}>
                  <div
                    className="w-12 h-12 rounded-full text-white bg-gray-600 hover:opacity-80 flex items-center justify-center cursor-pointer"
                    onClick={muteLocalAudioTrack}
                  >
                    {!isLocalAudioMuted ? (
                      <Mic className="w-6 h-6" />
                    ) : (
                      <MicOff className="w-6 h-6" />
                    )}
                  </div>
                </CustomTooltip>
              </div>

              <div className="relative">
                <CustomTooltip text={isLocalVideoMuted ? 'Video On' : 'Video Off'}>
                  <div
                    className="text-white bg-gray-600 w-12 h-12 rounded-full  hover:opacity-80 flex items-center justify-center cursor-pointer"
                    onClick={() => {
                      void handleVideoToggle();
                    }}
                  >
                    {isLocalVideoMuted ? (
                      <VideoOff className="w-6 h-6" />
                    ) : (
                      <Video className="w-6 h-6" />
                    )}
                  </div>
                </CustomTooltip>
              </div>

              <div
                className="flex items-center gap-3"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEndOrLeaveCall();
                }}
              >
                <div className="relative">
                  <CustomTooltip
                    text={participantsListing?.length >= 2 ? 'Leave Call' : 'End Call'}
                  >
                    <div className="w-12 h-12 rounded-full bg-red-700 hover:bg-red-700/80 flex items-center justify-center cursor-pointer">
                      <PhoneIcon className="w-6 h-6 text-white rotate-[135deg]" />
                    </div>
                  </CustomTooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* minimize bottom header  */}
      {isMinimize ? (
        <Draggable
          nodeRef={nodeRef}
          bounds="body" // Keeps the draggable element inside the screen
          // Initial position: Bottom Right (Adjust x/y as needed for your exact layout)
          defaultPosition={{ x: window.innerWidth - 340, y: window.innerHeight - 250 }}
        >
          <div
            ref={nodeRef}
            className="flex items-center flex-col gap-2 mx-auto bg-gray-900 fixed left-0 top-0 z-50 rounded-lg px-4 py-3 w-full max-w-[320px] cursor-move shadow-xl"
            // className="flex items-center flex-col gap-2 mx-auto bg-gray-900 fixed bottom-1 right-1  z-50 rounded-lg px-4 py-3 w-full max-w-[320px] cursor-move"
            onClick={(e) => {
              e.stopPropagation();
            }}
            // style={{
            //   transform: `translate(${position.x}px, ${position.y}px)`,
            //   transition: dragging ? 'none' : 'transform 0.1s ease',
            // }}
            // onMouseDown={handleMouseDown}
          >
            <div className="w-full h-full flex ">
              <LocalTrackLayout customFont="text-xs !px-2" />
              {/* {participantsListing?.length > 0 && <RemoteTrackContainer />} */}
            </div>
            {/* Duration in minimized view (only while call is active) */}
            {onCall && (
              <div className="flex items-center gap-1 mt-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs font-mono">{callDuration}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div
                className="text-white bg-gray-600 hover:opacity-80 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
                onClick={() => setIsMinimize(false)}
              >
                <Maximize className="w-5 h-5" />
              </div>
              <div className="relative">
                <CustomTooltip text={isLocalAudioMuted ? 'Unmute' : 'Mute'}>
                  <div
                    className="w-10 h-10 rounded-full text-white bg-gray-600 hover:opacity-80 flex items-center justify-center cursor-pointer"
                    onClick={muteLocalAudioTrack}
                  >
                    {!isLocalAudioMuted ? (
                      <Mic className="w-5 h-5" />
                    ) : (
                      <MicOff className="w-5 h-5" />
                    )}
                  </div>
                </CustomTooltip>
              </div>

              <div className="relative">
                <CustomTooltip text={isLocalVideoMuted ? 'Video On' : 'Video Off'}>
                  <div
                    className="text-white bg-gray-600 w-10 h-10 rounded-full  hover:opacity-80 flex items-center justify-center cursor-pointer"
                    onClick={() => {
                      void handleVideoToggle();
                    }}
                  >
                    {isLocalVideoMuted ? (
                      <VideoOff className="w-5 h-5" />
                    ) : (
                      <Video className="w-5 h-5" />
                    )}
                  </div>
                </CustomTooltip>
              </div>

              <div
                className="flex items-center gap-3"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEndOrLeaveCall();
                }}
              >
                <div className="relative">
                  <CustomTooltip
                    text={participantsListing?.length >= 2 ? 'Leave Call' : 'End Call'}
                  >
                    <div className="w-10 h-10 rounded-full bg-red-700 hover:bg-red-700/80 flex items-center justify-center cursor-pointer">
                      <PhoneIcon className="w-5 h-5 text-white rotate-[135deg]" />
                    </div>
                  </CustomTooltip>
                </div>
              </div>
            </div>
          </div>
        </Draggable>
      ) : null}
    </>
  );
};

export default CallScreen;
