import IndividualTrack from './individual-screen';
import { useAvCall } from '@/hooks/use-av-call';

const RemoteTrackContainer = () => {
  const { remoteTracks, participantsIds, participantsListing } = useAvCall();
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
            participantsListing.length > 0 &&
            participantsListing.filter((participant) => participant?._id === id)?.[0];

          const isParticipantHost = participant?.getProperty('isHost') === 'true';
          return (
            <IndividualTrack
              participantId={id}
              audioTrack={audioTrack}
              videoTrack={videoTrack}
              displayName={participant?._displayName}
              isParticipantHost={isParticipantHost}
            />
          );
        })}
      <div className="hidden" id="RemoteAudioContainer" />
    </>
  );
};

export default RemoteTrackContainer;
