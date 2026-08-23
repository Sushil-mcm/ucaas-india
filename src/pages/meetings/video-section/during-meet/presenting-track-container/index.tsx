import CustomAvatar from '@/components/custom/custom-avatar';
import { useJitsi } from '@/hooks/use-jitsi';
import { useEffect, useMemo, useState } from 'react';

const PersentationTrackContainer = ({
  extraClasses = 'w-full aspect-video min-h-0 min-w-0',
}: {
  extraClasses?: string;
}) => {
  const [persentingUser, setPersentingUser] = useState<any>(null);
  const {
    localVideoTrack,
    isLocalVideoMuted,
    desktopVideoTrack,
    desktopAudioTrack,
    userName,
    isHost,
    participantsListing,
    remoteTracks,
    currentActiveScreenShareId,
    dominantSpeaker,
    roomInstance,
  } = useJitsi();

  const userId = currentActiveScreenShareId || roomInstance?.myUserId?.();

  useEffect(() => {
    const video: any = document.querySelector('#custom_jitsi_Screen_Video_container');
    if (desktopVideoTrack || currentActiveScreenShareId) {
      const newPersentingUser = currentActiveScreenShareId
        ? remoteTracks?.[currentActiveScreenShareId]?.desktop &&
          !remoteTracks?.[currentActiveScreenShareId]?.desktop?.muted
          ? remoteTracks?.[currentActiveScreenShareId]?.desktop
          : remoteTracks?.[currentActiveScreenShareId]?.camera
        : desktopVideoTrack;
      setPersentingUser(newPersentingUser);

      const hasPlayableVideo =
        newPersentingUser?.stream && !newPersentingUser?.muted && !newPersentingUser?.isMuted?.();

      try {
        if (video) {
          if (!hasPlayableVideo) {
            video.srcObject = null;
            return;
          }
          video.srcObject = newPersentingUser?.stream;
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

      const newPersentingUseraAudioTrack = currentActiveScreenShareId
        ? remoteTracks?.[currentActiveScreenShareId]?.audio
        : desktopAudioTrack;
      if (newPersentingUseraAudioTrack) {
        const isElementAvailable = document.getElementById(
          `audio_remote_${currentActiveScreenShareId}`,
        );
        if (!isElementAvailable) {
          const AudioElement = document.createElement('audio');
          AudioElement.autoplay = true;
          AudioElement.controls = false;
          AudioElement.muted = false;
          AudioElement.id = `audio_remote_${currentActiveScreenShareId}`;
          const element = document.getElementById('RemoteAudioContainer');
          if (element) {
            element.appendChild(AudioElement);
            newPersentingUseraAudioTrack.attach(AudioElement);
          }
        }
      }
      return;
    }

    // no active presentation: clear srcObject to avoid a frozen frame
    if (video) {
      try {
        video.srcObject = null;
      } catch (err: any) {
        console.log('err', err);
      }
    }
  }, [
    localVideoTrack,
    isLocalVideoMuted,
    desktopVideoTrack,
    currentActiveScreenShareId,
    remoteTracks?.[currentActiveScreenShareId],
  ]);

  const presentingParticipant = useMemo(
    () =>
      participantsListing?.find((item: any) => item?._id === currentActiveScreenShareId) || null,
    [participantsListing, currentActiveScreenShareId],
  );

  const presentingDisplayName = currentActiveScreenShareId
    ? presentingParticipant?._displayName || 'Guest'
    : userName || 'You';

  const presentingRoleLabel = currentActiveScreenShareId
    ? presentingParticipant?.getProperty?.('isHost') === 'true'
      ? '(Host)'
      : presentingParticipant?.getProperty?.('isMember') === 'true'
        ? '(Member)'
        : '(Guest)'
    : isHost
      ? '(Host)'
      : '(You)';

  const showAvatarFallback =
    !persentingUser?.stream || persentingUser?.muted || persentingUser?.isMuted?.();

  return (
    <div
      className={`bg-gray-900 rounded-xl relative flex items-center justify-center overflow-hidden h-full min-h-0 min-w-0 ${participantsListing?.length === 0 ? 'w-full h-full' : extraClasses} ${dominantSpeaker === userId ? 'border-2 border-primary' : ''}`}
    >
      <>
        <video
          className={`cursor-default w-full h-full min-h-0 min-w-0 object-contain ${showAvatarFallback ? 'hidden' : 'block'}`}
          autoPlay
          id="custom_jitsi_Screen_Video_container"
          style={{
            transform: persentingUser?.videoType === 'desktop' ? undefined : 'rotateY(180deg)',
          }}
        ></video>
        {showAvatarFallback ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <CustomAvatar name={presentingDisplayName} />
          </div>
        ) : null}
        <span className="inline-flex items-center rounded-full bg-purple-400 px-4 py-1 font-medium text-secondary absolute top-3 left-3">
          <small>
            {presentingDisplayName} {presentingRoleLabel}
          </small>
        </span>
      </>
      {/* {shouldShowStatus && (
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <>
            {isHandRaised && (
              <div className="bg-white p-1 rounded-xl">
                <Hand />
              </div>
            )}
            {(isLocalAudioMuted || !localAudioTrack) && (
              <div className="bg-white p-1 rounded-xl">
                <MicOffFill />
              </div>
            )}
          </>
        </div>
      )} */}
    </div>
  );
};

export default PersentationTrackContainer;
