import { useJitsi } from '@/hooks/use-jitsi';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import LocalTrackContainer from './local-track-container';
import RemoteTrackContainer from './remote-track-container';
import MeetFooter from './meet-footer';
import LobbyAlerts from './lobby-alerts';
import Whiteboard from './whiteboard';
import PersentationTrackContainer from './presenting-track-container';
import MeetingHeader from './meeting-header';
import { useUser } from '@/hooks/use-user';
import { useSocketEvents } from '@/hooks/use-socket-events';
import Subtitles from './meet-footer/widgets/Subtitles';
import { Maximize, Minimize } from 'lucide-react';

const NORMAL_GRID_SCROLLABLE_CLASS =
  'grid min-h-0 w-full gap-2 p-4 m-auto items-stretch content-start';
const NORMAL_GRID_COMPACT_CLASS = 'grid h-full min-h-0 w-full gap-2 p-4';

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

const DuringMeet = ({
  meetState,
  apiMeetingData,
  viewType,
  setViewType,
  meetingData,
}: {
  meetState: any;
  apiMeetingData: any;
  viewType: string;
  setViewType: any;
  meetingData?: any;
}) => {
  const {
    participantsListing,
    whiteBoardState,
    remoteTracks,
    participantsIds,
    currentActiveScreenShareId,
    isRoomJoined,
    userID,
    roomCode,
    localVideoTrack,
    localAudioTrack,
    isUserSubtitlesOn,
    isScreenShareEnabled,
  } = useJitsi();
  const { user } = useUser();
  const { socketEventsManager } = useSocketEvents();
  const meetingActorUuid = user?.uuid || user?.guest_info?.uuid;
  const [widgetType, setWidgetType] = useState('');
  const [isWhiteboardFullscreen, setIsWhiteboardFullscreen] = useState(false);
  const whiteboardPanelRef = useRef<HTMLDivElement | null>(null);
  const whiteboardWasActiveRef = useRef(false);
  const isWhiteboardActive = Boolean(whiteBoardState?.isWhiteBoardopen);
  const totalParticipantsCount = participantsListing?.length || 0;
  const hasParticipants = totalParticipantsCount > 0;
  const normalViewTileCount = 1 + totalParticipantsCount + (isWhiteboardActive ? 1 : 0);
  const isScrollableNormalGrid = normalViewTileCount > 9;
  const normalGridClassName = getNormalGridClassName(isScrollableNormalGrid);
  const normalGridStyle = getNormalGridStyle(normalViewTileCount);

  useEffect(() => {
    const handleConfirmedUnload = (event: PageTransitionEvent) => {
      if (event.persisted) return;

      if (user?.uuid) {
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
      }
      if (localVideoTrack) {
        localVideoTrack.dispose();
      }
      if (localAudioTrack) {
        localAudioTrack.dispose();
      }
    };

    window.addEventListener('pagehide', handleConfirmedUnload);
    return () => {
      window.removeEventListener('pagehide', handleConfirmedUnload);
    };
  }, [localVideoTrack, localAudioTrack, socketEventsManager, user]);

  useEffect(() => {
    if (isWhiteboardActive && !whiteboardWasActiveRef.current) {
      setViewType('whiteboard');
      whiteboardWasActiveRef.current = true;
      return;
    }

    if (!isWhiteboardActive && whiteboardWasActiveRef.current) {
      if (viewType === 'whiteboard') {
        const hasActivePresentation = Boolean(currentActiveScreenShareId || isScreenShareEnabled);
        setViewType(hasActivePresentation ? 'presentation' : 'grid');
      }
      whiteboardWasActiveRef.current = false;
    }
  }, [isWhiteboardActive, currentActiveScreenShareId, isScreenShareEnabled, viewType]);

  useEffect(() => {
    if (currentActiveScreenShareId) {
      setTimeout(() => {
        setViewType('presentation');
      }, 1000);
    }
  }, [currentActiveScreenShareId]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsWhiteboardFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (isRoomJoined && user?.uuid) {
      socketEventsManager?.emit(
        'user-presence-update',
        {
          doc: {
            userId: user?.user_info?.extension,
            domain: user?.sip_credentials?.domain,
            uuid: user?.uuid,
            status: 'online',
            onCall: true,
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
    }

    if (isRoomJoined && meetingActorUuid) {
      socketEventsManager?.emit(
        'meeting-participant-user-insert',
        {
          jid: userID,
          meetingId: roomCode,
          userUuid: meetingActorUuid,
        },
        (response: any) => {
          console.log('meeting-participant-user-insert:', response);
        },
      );
    }
  }, [isRoomJoined, meetingActorUuid, user?.uuid]);

  // Keep remote audio attached even when whiteboard view hides participant tiles.
  useEffect(() => {
    const audioContainer = document.getElementById('RemoteAudioContainer');
    if (!audioContainer) return;

    const activeParticipantIds = new Set(Array.from(participantsIds || []));

    activeParticipantIds.forEach((participantId) => {
      const audioTrack = remoteTracks?.[participantId]?.audio;
      if (!audioTrack) return;

      const audioId = `audio_remote_${participantId}`;
      let audioElement = document.getElementById(audioId) as HTMLAudioElement | null;

      if (!audioElement) {
        audioElement = document.createElement('audio');
        audioElement.autoplay = true;
        audioElement.controls = false;
        audioElement.muted = false;
        audioElement.id = audioId;
        audioContainer.appendChild(audioElement);
      }

      try {
        if (audioElement.srcObject !== audioTrack?.stream) {
          audioTrack.attach(audioElement);
        }
      } catch (err) {
        console.log('Remote audio attach error', err);
      }
    });

    const audioElements = audioContainer.querySelectorAll('audio[id^="audio_remote_"]');
    audioElements.forEach((element) => {
      const participantId = element.id.replace('audio_remote_', '');
      if (!activeParticipantIds.has(participantId)) {
        element.remove();
      }
    });
  }, [participantsIds, remoteTracks, viewType]);

  const toggleWhiteboardFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      if (whiteboardPanelRef.current?.requestFullscreen) {
        await whiteboardPanelRef.current.requestFullscreen();
      }
    } catch (err) {
      console.log('Whiteboard fullscreen toggle failed', err);
    }
  };

  const openPresentationMode = () => {
    setViewType('presentation');
  };

  return (
    <div
      className="w-full flex sm:flex-row xs:flex-col md:min-h-screen xs:min-h-0 overflow-hidden"
      onClick={() => {
        setWidgetType('');
      }}
    >
      <LobbyAlerts />
      <div className="w-full sm:h-screen xs:h-auto flex flex-col relative min-h-0">
        <MeetingHeader apiMeetingData={meetingData} />
        <div
          className={`flex h-[calc(100%_-_8.2rem)] py-3 bg-black gap-4 min-h-0 ${isUserSubtitlesOn ? 'md:flex-row flex-col' : ''}`}
        >
          <div className={`${isUserSubtitlesOn ? 'flex-1 min-w-0 min-h-0' : 'w-full min-h-0'}`}>
            {viewType === 'whiteboard' ? (
              <div
                className={`grid grid-rows-1 px-2 gap-4 w-full h-full min-h-0 ${!hasParticipants ? '' : 'grid-cols-5'}`}
              >
                <div className={hasParticipants ? 'col-span-4' : 'w-full h-full'}>
                  <div ref={whiteboardPanelRef} className="relative w-full h-full">
                    <Whiteboard />
                    <button
                      type="button"
                      className="absolute top-2 right-2 z-30 bg-black/70 hover:bg-black/80 text-white text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWhiteboardFullscreen();
                      }}
                    >
                      {isWhiteboardFullscreen ? (
                        <Minimize className="w-3.5 h-3.5" />
                      ) : (
                        <Maximize className="w-3.5 h-3.5" />
                      )}
                      {isWhiteboardFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                    </button>
                  </div>
                </div>
                {hasParticipants && (
                  <div className="h-full min-h-0 overflow-y-auto pr-2">
                    <div className="grid gap-4 h-fit min-h-0">
                      <LocalTrackContainer
                        isPersentingMode={true}
                        forceTileLayout={hasParticipants}
                        onPresentationClick={() => {
                          setViewType('presentation');
                        }}
                        onTileClick={openPresentationMode}
                      />
                      <RemoteTrackContainer onTileClick={openPresentationMode} />
                    </div>
                  </div>
                )}
              </div>
            ) : viewType === 'presentation' ? (
              <div
                className={`grid grid-rows-1 px-2 gap-4 w-full h-full min-h-0 ${!hasParticipants ? '' : 'grid-cols-5'}`}
              >
                {currentActiveScreenShareId ? (
                  <PersentationTrackContainer extraClasses="col-span-4" />
                ) : (
                  <LocalTrackContainer
                    extraClasses="col-span-4"
                    forceTileLayout={hasParticipants}
                  />
                )}
                {hasParticipants && (
                  <div className="h-full min-h-0 overflow-y-auto pr-2">
                    <div className="grid gap-4 h-fit min-h-0">
                      {currentActiveScreenShareId && (
                        <LocalTrackContainer
                          isPersentingMode={true}
                          forceTileLayout={hasParticipants}
                        />
                      )}
                      {isWhiteboardActive && (
                        <div
                          className="bg-gray-900 rounded-xl aspect-video relative overflow-hidden min-h-0 min-w-0 cursor-pointer"
                          onClick={() => {
                            setViewType('whiteboard');
                          }}
                        >
                          <Whiteboard />
                          <div className="absolute inset-0 z-10 bg-black/10" />
                          <div className="absolute top-2 right-2 z-20 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            Whiteboard
                          </div>
                        </div>
                      )}
                      <RemoteTrackContainer onTileClick={openPresentationMode} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`h-full min-h-0 w-full overflow-x-hidden ${isScrollableNormalGrid ? 'overflow-y-auto' : 'overflow-y-hidden'}`}
              >
                <div className={normalGridClassName} style={normalGridStyle}>
                  <LocalTrackContainer
                    onTileClick={openPresentationMode}
                    forceTileLayout={normalViewTileCount > 1}
                  />
                  {isWhiteboardActive && (
                    <div
                      className="bg-gray-900 rounded-xl aspect-video relative flex items-center justify-center overflow-hidden w-full h-full min-h-0 min-w-0 cursor-pointer"
                      onClick={() => {
                        setViewType('whiteboard');
                      }}
                    >
                      <Whiteboard />
                      <div className="absolute inset-0 z-10 bg-black/10" />
                      <div className="absolute top-2 right-2 z-20 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        Whiteboard
                      </div>
                    </div>
                  )}
                  {participantsListing?.length > 0 && (
                    <RemoteTrackContainer onTileClick={openPresentationMode} />
                  )}
                </div>
              </div>
            )}
          </div>
          {isUserSubtitlesOn ? (
            <div className="w-full md:w-[360px] md:min-w-[320px] h-full bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
              <Subtitles />
            </div>
          ) : null}
        </div>
        <MeetFooter
          apiMeetingData={apiMeetingData}
          meetState={meetState}
          setWidgetType={setWidgetType}
          widgetType={widgetType}
          setViewType={setViewType}
          viewType={viewType}
        />
        <div id="RemoteAudioContainer" className="hidden" />
      </div>
    </div>
  );
};

export default DuringMeet;
