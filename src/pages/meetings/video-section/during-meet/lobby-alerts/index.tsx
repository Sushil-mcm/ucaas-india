import CustomAvatar from '@/components/custom/custom-avatar';
import { Button } from '@/components/ui/button';
import { useJitsi } from '@/hooks/use-jitsi';
import { useEffect, useState } from 'react';

let timeout: any = null;
const LobbyAlerts = () => {
  const {
    setLobbyRequestNotification,
    lobbyRequestNotification = {},
    declineRoomAccessFromLobby,
    approveRoomAccessFromLobby,
  } = useJitsi();

  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (lobbyRequestNotification && Object.keys(lobbyRequestNotification).length > 0) {
      setShowAlert(true);
      timeout = setTimeout(() => {
        setLobbyRequestNotification({});
        setShowAlert(false);
      }, 4000);
    } else {
      setShowAlert(false);
    }
    return () => clearTimeout(timeout);
  }, [lobbyRequestNotification]);

  const { _displayName = '' } = lobbyRequestNotification || {};

  if (!showAlert) return;
  return (
    <div className="bg-gray-800 border border-gray-50 rounded-md fixed bottom-24 right-10 z-50 text-white w-64 p-2 flex flex-col gap-2">
      <div className="flex gap-4">
        <CustomAvatar name={_displayName} />
        <div className="flex flex-col gap-0">
          <h6 className="text-md">{_displayName}</h6>
          <h3 className="text-xs">In Lobby Room</h3>
        </div>
      </div>
      <div className="w-full flex gap-2 justify-end">
        <Button
          variant={'destructive'}
          className="w-28 cursor-pointer"
          onClick={() => {
            declineRoomAccessFromLobby(lobbyRequestNotification);
          }}
        >
          Decline
        </Button>
        <Button
          variant={'default'}
          className="w-28"
          onClick={() => {
            approveRoomAccessFromLobby(lobbyRequestNotification);
          }}
        >
          Approve
        </Button>
      </div>
    </div>
  );
};

export default LobbyAlerts;
