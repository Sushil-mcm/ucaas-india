/* eslint-disable @typescript-eslint/no-explicit-any */
import CustomAvatar from '@/components/custom/custom-avatar';
import AudioLevelMeter from '@/components/custom/audio-level-meter';
import ConnectionStateBadge from '@/components/custom/connection-state-badge';
import { useJitsi } from '@/hooks/use-jitsi';
import { Hand, LucideMicOff, LucideVideoOff, Maximize, Minimize } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSocketEvents } from '@/hooks/use-socket-events';

const IndividualTrack = ({
  participantId,
  audioTrack,
  videoTrack,
  displayName = '',
  isParticipantHost,
  onTileClick,
}: {
  participantId: string;
  audioTrack: any;
  videoTrack: any;
  displayName: string;
  isParticipantHost: boolean;
  isMember: boolean;
  onTileClick?: (participantId: string) => void;
}) => {
  const {
    remoteHandRaised,
    handlePresentatingView,
    dominantSpeaker,
    audioLevels,
    connectionQuality,
    roomCode,
  } = useJitsi();
  const { allChats = [] } = useSocketEvents();
  const participantType = allChats
    ?.find((chat: any) => chat?.chatId === roomCode)
    ?.users?.find((user: any) => user?.jid?.includes(participantId))?.isGuest
    ? '(Guest)'
    : '(Member)';

  const [fullscreen, setFullscreen] = useState(false);

  // Get audio level for this participant
  const currentAudioLevel = useMemo(
    () => audioLevels[participantId] || 0,
    [audioLevels, participantId],
  );
  const currentConnectionStats = useMemo(() => {
    const map = connectionQuality || {};
    if (map?.[participantId]) return map[participantId];

    const matchedKey = Object.keys(map).find(
      (key) =>
        key === participantId || key.endsWith(`/${participantId}`) || key.endsWith(participantId),
    );
    return matchedKey ? map[matchedKey] : null;
  }, [connectionQuality, participantId]);

  useEffect(() => {
    if (!currentConnectionStats) {
      console.log('[JITSI-CQ][TILE] no stats match for participant', {
        participantId,
        connectionQualityKeys: Object.keys(connectionQuality || {}),
      });
    }
  }, [participantId, currentConnectionStats, connectionQuality]);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (videoTrack && !videoTrack.isMuted()) {
      const video = document.querySelector(`#remote_${participantId}`) as HTMLVideoElement;
      try {
        if (video) {
          video.srcObject = videoTrack?.stream;
          const vidPromise = video?.play();
          if (vidPromise !== undefined) {
            vidPromise
              .then(() => {
                video?.play();
              })
              .catch(() => {
                video?.pause();
              });
          }
        }
      } catch (err) {
        console.log('remote Video Container', err);
      }
    }
    if (audioTrack) {
      const isElementAvailable = document.getElementById(`audio_remote_${participantId}`);
      if (!isElementAvailable) {
        const AudioElement = document.createElement('audio');
        AudioElement.autoplay = true;
        AudioElement.controls = false;
        AudioElement.muted = false;
        AudioElement.id = `audio_remote_${participantId}`;
        const element = document.getElementById('RemoteAudioContainer');
        if (element) {
          element.appendChild(AudioElement);
          audioTrack.attach(AudioElement);
        }
      }
    }
  }, [videoTrack, audioTrack?.isMuted(), videoTrack?.isMuted()]);

  function handleFullscreenChange() {
    if (document.fullscreenElement) {
      setFullscreen(true);
    } else {
      setFullscreen(false);
    }
  }

  const isHandRaised = useMemo(
    () => remoteHandRaised?.includes(participantId),
    [remoteHandRaised?.length, participantId],
  );
  const isAudioMuted = useMemo(() => audioTrack?.isMuted(), [audioTrack?.isMuted()]);
  const isVideoMuted = useMemo(() => videoTrack?.isMuted(), [videoTrack?.isMuted()]);

  const isScreenSharing = useMemo(
    () => videoTrack?.videoType === 'desktop',
    [videoTrack?.videoType],
  );
  const shouldShowStatus = useMemo(
    () => isAudioMuted || isHandRaised || isVideoMuted || isScreenSharing,
    [isHandRaised, isAudioMuted, isVideoMuted, isScreenSharing],
  );
  const participantRoleLabel = isParticipantHost ? '(Host)' : participantType;
  const participantDisplayLabel = `${displayName || ''} ${participantRoleLabel}`.trim();

  return (
    <div
      className={`bg-gray-900 rounded-xl aspect-video relative flex items-center justify-center overflow-hidden w-full h-full min-h-0 min-w-0 cursor-pointer ${dominantSpeaker === participantId ? 'border-2 border-primary' : ''}`}
      key={participantId}
      id={participantId}
      onClick={() => {
        handlePresentatingView(participantId);
        onTileClick?.(participantId);
      }}
    >
      {isVideoMuted || !videoTrack ? (
        <>
          <div
            id={participantId + 'profile'}
            className="flex justify-center flex-col items-center w-[5em]"
          >
            <CustomAvatar name={displayName} />

            {displayName && (
              <span
                className="inline-flex max-w-[70%] items-center rounded-full bg-purple-400 px-4 py-1 font-medium text-secondary absolute top-3 left-3"
                title={participantDisplayLabel}
              >
                <small className="block w-full truncate">{participantDisplayLabel}</small>
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <video
            className="cursor-pointer w-full h-full min-h-0 min-w-0 object-contain"
            autoPlay
            id={`remote_${participantId}`}
            style={{
              transform: isScreenSharing ? undefined : 'rotateY(180deg)',
            }}
          ></video>
          {displayName && (
            <span
              className="inline-flex max-w-[70%] items-center rounded-full bg-purple-400 px-4 py-1 font-medium text-secondary absolute top-3 left-3"
              title={participantDisplayLabel}
            >
              <small className="block w-full truncate">{participantDisplayLabel}</small>
            </span>
          )}
        </>
      )}
      {/* Network quality is always visible. Audio quality is shown when audio is active. */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        {!isAudioMuted && audioTrack && <AudioLevelMeter audioLevel={currentAudioLevel} />}
        <ConnectionStateBadge participantId={participantId} stats={currentConnectionStats} />
      </div>
      {shouldShowStatus && (
        <div className="absolute right-3 top-3 flex gap-2">
          {isHandRaised && (
            <a
              href="javascript:void(0)"
              className="bg-white rounded-xl p-1 w-8 h-8 flex items-center justify-center"
            >
              <Hand className="w-5 h-5" />
            </a>
          )}
          {isAudioMuted && (
            <a
              href="javascript:void(0)"
              className="bg-white rounded-xl p-1 w-8 h-8 flex items-center justify-center"
            >
              <LucideMicOff className="w-5 h-5" />
            </a>
          )}
          {isVideoMuted && (
            <a
              href="javascript:void(0)"
              className="bg-white rounded-xl p-1 w-8 h-8 flex items-center justify-center"
            >
              <LucideVideoOff className="w-5 h-5" />
            </a>
          )}
          {isScreenSharing && (
            <div
              className="bg-white rounded-xl p-1 w-8 h-8 cursor-pointer flex items-center justify-center"
              onClick={(e: any) => {
                e.stopPropagation();
                const elm: any = document.getElementById(participantId);
                if (fullscreen) {
                  if (document.exitFullscreen) {
                    document.exitFullscreen();
                  }
                } else {
                  if (elm.requestFullscreen) {
                    elm.requestFullscreen();
                  }
                }
              }}
            >
              {fullscreen ? <Minimize className="w-30 h-30" /> : <Maximize className="w-30 h-30" />}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IndividualTrack;
