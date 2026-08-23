import { useJitsi } from '@/hooks/use-jitsi';
import IndividualTrack from './individual-track';

const RemoteTrackContainer = ({
  onTileClick,
}: {
  onTileClick?: (participantId: string) => void;
}) => {
  const { remoteTracks, participantsIds, participantsListing, currentActiveScreenShareId } =
    useJitsi();
  return (
    <>
      {participantsIds &&
        participantsIds.size > 0 &&
        Array.from(participantsIds).map((id) => {
          let audioTrack = null;
          let videoTrack = null;
          if (remoteTracks[id]) {
            videoTrack =
              remoteTracks[id]?.desktop && !remoteTracks[id]?.desktop?.muted
                ? remoteTracks[id]?.desktop
                : remoteTracks[id]?.camera;
            audioTrack = remoteTracks[id]?.audio;
          }
          const participant =
            participantsListing &&
            participantsListing?.length > 0 &&
            participantsListing?.filter((participant) => participant?._id === id)?.[0];

          const isParticipantHost = participant?.getProperty('isHost') === 'true';
          const isMember = participant?.getProperty('isMember') === 'true';
          if (currentActiveScreenShareId === id) return null;
          return (
            <IndividualTrack
              participantId={id}
              audioTrack={audioTrack}
              videoTrack={videoTrack}
              displayName={participant?._displayName}
              isParticipantHost={isParticipantHost}
              isMember={isMember}
              onTileClick={onTileClick}
            />
          );
        })}
    </>
  );
};

export default RemoteTrackContainer;
