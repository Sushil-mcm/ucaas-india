import { useJitsi } from '@/hooks/use-jitsi';

import { Button } from '@/components/ui/button';
import {
  Hand,
  LucideExternalLink,
  LucideMic,
  LucideMicOff,
  LucideVideo,
  LucideVideoOff,
} from 'lucide-react';
import AlertConfirm from '@/components/custom/alert-confirm';
import { useState } from 'react';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { useSocketEvents } from '@/hooks/use-socket-events';

const Participants = () => {
  const {
    userName: displayName,
    isHost,
    isMember,
    muteLocalAudioTrack,
    muteLocalVideoTrack,
    isLocalAudioMuted,
    isLocalVideoMuted,
    participantsListing,
    muteParticipantCam,
    muteParticipantMic,
    roomAccessRequests,
    approveRoomAccessFromLobby,
    declineRoomAccessFromLobby,
    remoteHandRaised,
    kickParticipant,
    roomCode,
  } = useJitsi();
  const { allChats = [] } = useSocketEvents();
  const [kickDialogOpen, setKickDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const participantArray = allChats?.find((chat: any) => chat?.chatId === roomCode)?.users || [];

  const isUserHandRasied = (participantId: string = '') => {
    return remoteHandRaised?.includes(participantId) || false;
  };
  const handleKickParticipant = (participantId: string, participantName: string) => {
    setSelectedParticipant({ id: participantId, name: participantName });
    setKickDialogOpen(true);
  };
  const confirmKick = () => {
    if (selectedParticipant) {
      kickParticipant(selectedParticipant.id, 'Removed by host');
      setKickDialogOpen(false);
      setSelectedParticipant(null);
    }
  };

  return (
    <div className="w-full flex flex-col gap-5 overflow-y-auto h-[calc(100vh_-_22.9rem)] py-2">
      <ul className="flex flex-col gap-3 overflow-y-auto w-full h-full  py-2" role="list">
        {/* <ul
        className="flex flex-col gap-3 overflow-y-auto w-full h-full max-h-[calc(100vh_-_22rem)] py-2"
        role="list"
      > */}
        <li className="flex bg-white" role="menu-item">
          <div className="flex items-center gap-3 w-full">
            <div className="gap-2.5 flex items-center">
              <div className="w-8 h-8 rounded-md bg-red-500 flex items-center justify-center">
                <p className="text-white">{`${displayName?.toUpperCase()?.charAt(0)}`}</p>
              </div>
            </div>
            <div className="flex justify-between w-[calc(100%_-_2.25rem)]">
              <div className="flex flex-col gap-0.5">
                <h6 className="text-gray-900 truncate text-sm">
                  {displayName} {isHost ? '(Host)' : isMember ? '(Member)' : '(Guest)'}
                </h6>
              </div>
              <div className="flex items-center gap-2.5">
                <div onClick={() => muteLocalAudioTrack()} className="cursor-pointer">
                  {isLocalAudioMuted ? (
                    <CustomTooltip text="Unmute" side="top">
                      <LucideMicOff className="text-gray-900 hover:opacity-80 w-5 h-5" />
                    </CustomTooltip>
                  ) : (
                    <CustomTooltip text="Mute" side="top">
                      <LucideMic className="text-gray-900 hover:opacity-80 w-5 h-5" />
                    </CustomTooltip>
                  )}
                </div>
                <div className="cursor-pointer" onClick={() => muteLocalVideoTrack()}>
                  {isLocalVideoMuted ? (
                    <CustomTooltip text="Video on" side="top">
                      <LucideVideoOff className="text-gray-900 hover:opacity-80 w-5 h-5" />
                    </CustomTooltip>
                  ) : (
                    <CustomTooltip text="Video off" side="top">
                      <LucideVideo className="text-gray-900 hover:opacity-80 w-5 h-5" />
                    </CustomTooltip>
                  )}
                </div>
              </div>
            </div>
          </div>
        </li>
        {participantsListing &&
          participantsListing?.length > 0 &&
          participantsListing?.map((participant) => {
            const { _tracks, _id, _displayName } = participant;

            const videoTrack = _tracks.filter((track: any) => track.getType() === 'video')[0];
            const audioTrack = _tracks.filter((track: any) => track.getType() === 'audio')[0];
            const isVideoMuted = videoTrack ? videoTrack?.muted : true;
            const isAudioMuted = audioTrack ? audioTrack?.muted : true;
            const displayName = _displayName || `random_${_id}`;
            const isParticipantHost = participant?.getProperty('isHost') === 'true';
            // const isMember = participant?.getProperty('isMember') === 'true';
            const t = participantArray?.find((user: any) => user?.jid?.includes(_id))?.isGuest
              ? '(Guest)'
              : '(Member)';
            return (
              <li key={_id} className="flex bg-white" role="menu-item">
                <div className="flex items-center gap-3 w-full">
                  <div className="gap-2.5 flex items-center">
                    <div className="w-8 h-8 rounded-md bg-red-500 flex items-center justify-center">
                      <p className="text-white">{`${displayName?.toUpperCase()?.charAt(0)}`}</p>
                    </div>
                  </div>
                  <div className="flex justify-between w-[calc(100%_-_2.25rem)]">
                    <div className="flex flex-col gap-0.5">
                      <h6 className="text-gray-900 truncate text-sm">
                        {displayName} {isParticipantHost ? '(Host)' : t}
                      </h6>
                    </div>
                    {/* {isHost && ( */}
                    <div className="flex items-center gap-2.5">
                      {isHost && !isParticipantHost && (
                        <CustomTooltip text="Kick out" side="top">
                          <div
                            className="cursor-pointer"
                            onClick={() => handleKickParticipant(_id, displayName)}
                            title="Remove participant"
                          >
                            <LucideExternalLink className="text-gray-900 hover:opacity-80 w-5 h-5" />
                          </div>
                        </CustomTooltip>
                      )}
                      {isUserHandRasied(_id) && (
                        <div className="cursor-pointer">
                          <Hand className="text-gray-900 hover:opacity-80 w-5 h-5" />
                        </div>
                      )}
                      <div
                        onClick={() => {
                          if (isHost) muteParticipantMic(_id);
                        }}
                        className="cursor-pointer"
                      >
                        {isAudioMuted ? (
                          <CustomTooltip text="Unmute" side="top">
                            <LucideMicOff className="text-gray-900 hover:opacity-80 w-5 h-5" />
                          </CustomTooltip>
                        ) : (
                          <CustomTooltip text="Mute" side="top">
                            <LucideMic className="text-gray-900 hover:opacity-80 w-5 h-5" />
                          </CustomTooltip>
                        )}
                      </div>
                      <div
                        onClick={() => {
                          if (isHost) muteParticipantCam(_id);
                        }}
                        className="cursor-pointer"
                      >
                        {isVideoMuted ? (
                          <CustomTooltip text="Video on" side="top">
                            <LucideVideoOff className="text-gray-900 hover:opacity-80 w-5 h-5" />
                          </CustomTooltip>
                        ) : (
                          <CustomTooltip text="Video off" side="top">
                            <LucideVideo className="text-gray-900 hover:opacity-80 w-5 h-5" />
                          </CustomTooltip>
                        )}
                      </div>
                    </div>
                    {/* )} */}
                  </div>
                </div>
              </li>
            );
          })}
      </ul>
      {isHost && (
        <div className="flex flex-col gap-2">
          {' '}
          <ul className="overflow-y-auto xxl:h-[calc(100vh_-_42rem)] flex flex-col gap-3">
            {roomAccessRequests &&
              roomAccessRequests?.map((item) => {
                return (
                  <li className="flex bg-white" role="menu-item">
                    <div className="flex items-center gap-3 w-full">
                      <div className="gap-2.5 flex items-center">
                        <div className="w-8 h-8 rounded-md bg-red-500 flex items-center justify-center">
                          <p className="text-white">{`${item?._displayName?.toUpperCase()?.charAt(0)}`}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-[calc(100%_-_2.25rem)]">
                        <h6 className="truncate text-gray-900">{item?._displayName}</h6>

                        <div className="flex items-center gap-2.5">
                          <Button
                            size={'sm'}
                            variant={'destructive'}
                            type="button"
                            onClick={() => declineRoomAccessFromLobby(item)}
                          >
                            Decline
                          </Button>
                          <Button
                            variant={'outline'}
                            size={'sm'}
                            type="button"
                            onClick={() => approveRoomAccessFromLobby(item)}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      <AlertConfirm
        open={kickDialogOpen}
        setOpen={setKickDialogOpen}
        onConfirm={confirmKick}
        onCancel={() => {
          setKickDialogOpen(false);
          setSelectedParticipant(null);
        }}
        closeBtnText="Cancel"
        confirmBtnText="Remove"
        descriptionTextComp={`Are you sure you want to remove ${selectedParticipant?.name} from the meeting?`}
      />
    </div>
  );
};

export default Participants;
