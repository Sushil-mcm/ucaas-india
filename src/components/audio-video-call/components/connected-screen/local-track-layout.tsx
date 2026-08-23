// import { MicOffFill } from '@/assets/icons';
import CustomAvatar from '@/components/custom/custom-avatar';
import AudioLevelMeter from '@/components/custom/audio-level-meter';
import ConnectionStateBadge from '@/components/custom/connection-state-badge';
import { useAvCall } from '@/hooks/use-av-call';
import { MicOff } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

interface LayoutProps {
  extraClasses?: string;
  customFont?: any;
}

const LocalTrackLayout = ({
  extraClasses = 'w-full aspect-video',
  customFont = '',
}: LayoutProps) => {
  const {
    localVideoTrack,
    localAudioTrack,
    isLocalVideoMuted,
    isLocalAudioMuted,
    desktopVideoTrack,
    userName,
    participantsListing,
    roomInstance,
    audioLevels,
    connectionQuality,
  } = useAvCall();

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (desktopVideoTrack) {
      try {
        video.srcObject = desktopVideoTrack?.stream;
        video.play().catch((err: any) => console.log('Desktop video play error:', err));
      } catch (err) {
        console.log('Local Video Container', err);
      }
      return;
    }

    if (localVideoTrack) {
      console.log('Local video track for layout:', {
        hasStream: !!localVideoTrack?.stream,
        isMuted: isLocalVideoMuted,
        id: localVideoTrack?.getId(),
      });
    }

    if (!desktopVideoTrack && localVideoTrack && !isLocalVideoMuted) {
      try {
        if (localVideoTrack?.stream) {
          video.srcObject = localVideoTrack?.stream;
          video.play().catch((err: any) => console.log('Local video play error:', err));
        } else if (localVideoTrack?.attach) {
          // If localVideoTrack exists but no stream, try to attach it directly
          localVideoTrack.attach(video);
        }
      } catch (err) {
        console.log('Local Video Container error:', err);
      }
    } else {
      // Clear video when muted or no track
      video.srcObject = null;
    }
  }, [localVideoTrack, isLocalVideoMuted, desktopVideoTrack, localVideoTrack?.getId()]);

  const shouldShowStatus = isLocalAudioMuted || !localAudioTrack;
  const isSingleUserLayout = (participantsListing?.length || 0) === 0;
  const shouldHideCameraFrame =
    (isLocalVideoMuted || !localVideoTrack?.stream) && !desktopVideoTrack;
  const localParticipantId = roomInstance?.myUserId?.();
  const currentAudioLevel = useMemo(() => {
    if (!localParticipantId) return 0;
    return audioLevels?.[localParticipantId] || 0;
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

  return (
    <div
      className={`bg-gray-900 rounded-xl relative flex items-center justify-center overflow-hidden w-full h-full min-h-0 ${participantsListing?.length === 0 ? 'self-stretch justify-self-stretch' : extraClasses}`}
    >
      <>
        {/* Always render video element, but show/hide with CSS */}
        <video
          ref={videoRef}
          style={{
            transform: 'rotateY(180deg)',
            visibility: shouldHideCameraFrame ? 'hidden' : 'visible',
            objectFit: desktopVideoTrack ? 'contain' : isSingleUserLayout ? 'cover' : 'contain',
          }}
          className="cursor-default absolute inset-0 w-full h-full"
          autoPlay
        ></video>

        {/* Show avatar when video is off */}
        {shouldHideCameraFrame && (
          <div
            id="localProfile"
            className="w-[5em] font-[1vw] flex items-center justify-center absolute"
          >
            <CustomAvatar name={userName} />
          </div>
        )}

        {/* Always show username */}
        {userName && (
          <span
            className={`inline-flex items-center rounded-full bg-purple-400 px-4 py-1 font-medium text-secondary absolute top-3 left-3 ${customFont} `}
          >
            <small>{userName}</small>
          </span>
        )}
      </>
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
          <>
            {(isLocalAudioMuted || !localAudioTrack) && (
              // <div className="bg-white  p-1 rounded-xl">
              <div className="text-white bg-gray-600 w-10 h-10 rounded-full flex items-center justify-center ">
                <MicOff className="w-5 h-5" />
              </div>
            )}
          </>
        </div>
      )}
    </div>
  );
};

export default LocalTrackLayout;
