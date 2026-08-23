import CustomAvatar from '@/components/custom/custom-avatar';
import AudioLevelMeter from '@/components/custom/audio-level-meter';
import ConnectionStateBadge from '@/components/custom/connection-state-badge';
import { useAvCall } from '@/hooks/use-av-call';
import { LucideMicOff, LucideVideoOff, Maximize, Minimize } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const IndividualTrack = ({
  participantId,
  audioTrack,
  videoTrack,
  displayName = '',
}: {
  participantId: string;
  audioTrack: any;
  videoTrack: any;
  displayName: string;
  isParticipantHost: boolean;
}) => {
  const { audioLevels, connectionQuality } = useAvCall();
  const [fullscreen, setFullscreen] = useState(false);

  const currentAudioLevel = useMemo(
    () => audioLevels?.[participantId] || 0,
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

  const isAudioMuted = useMemo(() => audioTrack?.isMuted(), [audioTrack?.isMuted()]);
  const isVideoMuted = useMemo(() => videoTrack?.isMuted(), [videoTrack?.isMuted()]);

  const isScreenSharing = useMemo(
    () => videoTrack?.videoType === 'desktop',
    [videoTrack?.videoType],
  );
  const shouldShowStatus = useMemo(
    () => isAudioMuted || isVideoMuted || isScreenSharing,
    [isAudioMuted, isVideoMuted, isScreenSharing],
  );

  return (
    <div
      className="bg-gray-900 rounded-xl aspect-video relative flex items-center justify-center overflow-hidden w-full h-full"
      key={participantId}
      id={participantId}
    >
      {isVideoMuted || !videoTrack ? (
        <>
          <div
            id={participantId + 'profile'}
            className="flex justify-center flex-col items-center w-[5em]"
          >
            <CustomAvatar name={displayName} />

            {displayName && (
              <span className="inline-flex items-center rounded-full bg-purple-400 px-4 py-1 font-medium text-secondary absolute top-3 left-3">
                <small>{displayName}</small>
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <video
            className="cursor-default w-full h-full object-contain"
            autoPlay
            id={`remote_${participantId}`}
            style={{
              transform: isScreenSharing ? undefined : 'rotateY(180deg)',
            }}
          ></video>
          {displayName && (
            <span className="inline-flex items-center rounded-full bg-purple-400 px-4 py-1 font-medium text-secondary absolute top-3 left-3">
              <small>{displayName}</small>
            </span>
          )}
        </>
      )}
      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        {!isAudioMuted && audioTrack && <AudioLevelMeter audioLevel={currentAudioLevel} />}
        <ConnectionStateBadge participantId={participantId} stats={currentConnectionStats} />
      </div>
      {shouldShowStatus && (
        <div className="absolute right-3 top-3 flex gap-2">
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
              onClick={() => {
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
