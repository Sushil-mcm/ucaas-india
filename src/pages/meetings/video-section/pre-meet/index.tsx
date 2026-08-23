import { useJitsi } from '@/hooks/use-jitsi';
import AVModal from './av-modal';
import WaitingScreen from './waiting-screen';
import LobbyScreen from './lobby-screen';

const PreMeetLayout = ({ meetState, setMeetState }: { meetState: any; setMeetState: any }) => {
  const {
    waitingScreenEnabled,
    waitingRoomJoined,
    isLobbyJoined,
    isLobbyEnabled,
    isRoomJoined,
    isHost,
  } = useJitsi();
  const isPasswordGateRequired = Boolean(
    (meetState?.isPasswordRequired || meetState?.passwordRequired) &&
    !meetState?.isPasswordAuth &&
    !isHost,
  );
  const shouldShowAVModal =
    !meetState?.isLocked &&
    !isLobbyJoined &&
    !isRoomJoined &&
    (isPasswordGateRequired || !waitingRoomJoined);

  return (
    <>
      {shouldShowAVModal && <AVModal meetState={meetState} setMeetState={setMeetState} />}
      {/* {meetState.isLocked && <LoaderPage type={'locked'} />} To be add later */}
      {!meetState.isLocked &&
        !isPasswordGateRequired &&
        waitingScreenEnabled &&
        waitingRoomJoined && <WaitingScreen />}
      {!meetState.isLocked &&
        !isPasswordGateRequired &&
        !waitingRoomJoined &&
        isLobbyEnabled &&
        isLobbyJoined && <LobbyScreen />}
    </>
  );
};

export default PreMeetLayout;
