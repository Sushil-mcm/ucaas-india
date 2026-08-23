import CustomAvatar from '@/components/custom/custom-avatar';
import AudioLevelMeter from '@/components/custom/audio-level-meter';
import ConnectionStateBadge from '@/components/custom/connection-state-badge';
import { useJitsi } from '@/hooks/use-jitsi';
import { Hand, LucideMicOff } from 'lucide-react';
import { useMemo } from 'react';
import { useEffect } from 'react';

const LocalTrackContainer = ({
  extraClasses = 'w-full aspect-video min-h-0 min-w-0',
  isPersentingMode = false,
  onPresentationClick,
  onTileClick,
  forceTileLayout = false,
}: {
  extraClasses?: string;
  isPersentingMode?: boolean;
  onPresentationClick?: () => void;
  onTileClick?: () => void;
  forceTileLayout?: boolean;
}) => {
  const {
    localVideoTrack,
    localAudioTrack,
    isLocalVideoMuted,
    isLocalAudioMuted,
    desktopVideoTrack,
    isHandRaised,
    isHost,
    userName,
    participantsListing,
    isScreenShareEnabled,
    handlePresentatingView,
    dominantSpeaker,
    roomInstance,
    audioLevels,
    connectionQuality,
  } = useJitsi();

  // Get local participant's audio level
  const localParticipantId = useMemo(() => {
    try {
      if (!roomInstance || typeof roomInstance?.myUserId !== 'function') return '';
      return roomInstance.myUserId() || '';
    } catch {
      return '';
    }
  }, [roomInstance]);
  const currentAudioLevel = useMemo(() => {
    if (!localParticipantId) return 0;
    return audioLevels[localParticipantId] || 0;
  }, [audioLevels, localParticipantId]);
  const currentConnectionStats = useMemo(() => {
    if (!localParticipantId) return null;
    const map = connectionQuality || {};
    if (map?.[localParticipantId]) return map[localParticipantId];

    const normalizedLocalId = localParticipantId.split('/').pop() || localParticipantId;
    if (map?.[normalizedLocalId]) return map[normalizedLocalId];

    const matchedKey = Object.keys(map).find(
      (key) =>
        key === localParticipantId ||
        key === normalizedLocalId ||
        key.endsWith(`/${normalizedLocalId}`) ||
        key.endsWith(normalizedLocalId),
    );
    return matchedKey ? map[matchedKey] : null;
  }, [connectionQuality, localParticipantId]);

  useEffect(() => {
    if (localParticipantId && !currentConnectionStats) {
      console.log('[JITSI-CQ][LOCAL-TILE] no stats match for local participant', {
        localParticipantId,
        normalizedLocalId: localParticipantId.split('/').pop() || localParticipantId,
        connectionQualityKeys: Object.keys(connectionQuality || {}),
      });
    }
  }, [localParticipantId, currentConnectionStats, connectionQuality]);

  useEffect(() => {
    if (desktopVideoTrack) {
      const video: any = document.querySelector('#custom_jitsi_LVideo_container');
      try {
        if (video) {
          video.srcObject = desktopVideoTrack?.stream;
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
        console.log('Local Video Container', err);
      }
      return;
    }

    if (!desktopVideoTrack && localVideoTrack && !isLocalVideoMuted) {
      const video: any = document.querySelector('#custom_jitsi_LVideo_container');
      try {
        video.srcObject = localVideoTrack?.stream;
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
      } catch (err) {
        console.log('Local Video Container', err);
      }
    }
  }, [localVideoTrack, isLocalVideoMuted, desktopVideoTrack]);

  const shouldShowStatus = isHandRaised || isLocalAudioMuted || !localAudioTrack;
  const localRoleLabel = isHost ? '(Host)' : '(You)';
  const localDisplayLabel = `${userName || ''} ${localRoleLabel}`.trim();
  const shouldUseTileLayout = forceTileLayout || participantsListing?.length > 0;

  return (
    <div
      className={`bg-gray-900 rounded-xl relative flex items-center justify-center overflow-hidden h-full min-h-0 min-w-0 ${shouldUseTileLayout ? extraClasses : 'w-full h-full'} ${isPersentingMode || onTileClick ? 'cursor-pointer' : ''} ${dominantSpeaker === localParticipantId ? 'border-2 border-primary' : ''}  `}
      onClick={() => {
        if (onTileClick) {
          onTileClick();
          return;
        }
        if (!isPersentingMode) return;
        handlePresentatingView();
        onPresentationClick?.();
      }}
    >
      <>
        {(isLocalVideoMuted || !localVideoTrack?.stream) && !desktopVideoTrack ? (
          <div id="localProfile" className="w-[5em] font-[1vw] flex items-center justify-center">
            <CustomAvatar name={userName} />
            {userName && (
              <span
                className="inline-flex max-w-[70%] items-center rounded-full bg-purple-400 px-4 py-1 font-medium text-secondary absolute top-3 left-3"
                title={localDisplayLabel}
              >
                <small className="block w-full truncate">{localDisplayLabel}</small>
              </span>
            )}
          </div>
        ) : (
          <>
            <video
              style={{
                transform: isScreenShareEnabled ? undefined : 'rotateY(180deg)',
              }}
              className={`${isPersentingMode || onTileClick ? 'cursor-pointer' : 'cursor-default'} w-full h-full min-h-0 min-w-0 object-contain`}
              autoPlay
              id="custom_jitsi_LVideo_container"
            ></video>
            {userName && (
              <span
                className="inline-flex max-w-[70%] items-center rounded-full bg-purple-400 px-4 py-1 font-medium text-secondary absolute top-3 left-3"
                title={localDisplayLabel}
              >
                <small className="block w-full truncate">{localDisplayLabel}</small>
              </span>
            )}
          </>
        )}
      </>
      {/* Network quality is always visible. Audio quality is shown when audio is active. */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        {!isLocalAudioMuted && localAudioTrack && (
          <AudioLevelMeter audioLevel={currentAudioLevel} />
        )}
        <ConnectionStateBadge
          participantId={localParticipantId || 'local'}
          stats={currentConnectionStats}
        />
      </div>
      {shouldShowStatus && (
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <div className="flex gap-2">
            {isHandRaised && (
              <div className="bg-white rounded-xl p-1 w-8 h-8 flex items-center justify-center">
                <Hand className="w-5 h-5" />
              </div>
            )}
            {(isLocalAudioMuted || !localAudioTrack) && (
              <div className="bg-white rounded-xl p-1 w-8 h-8 flex items-center justify-center">
                <LucideMicOff className="w-5 h-5" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalTrackContainer;
