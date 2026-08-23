import { Button } from '@/components/ui/button';
import { useJitsi } from '@/hooks/use-jitsi';

const LobbyScreen = () => {
  const { requestRoomAccessFromLobby } = useJitsi();

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="p-6 gap-6 border border-gray-200 rounded-xl flex flex-col">
        <div className="flex flex-col gap-2">
          <p className="text-gray-900 text-md text-center font-semibold">You are in the lobby.</p>
          <p className="text-gray-900 text-md text-center">
            We'll notify the host that you are waiting.
          </p>
        </div>
        <Button onClick={() => requestRoomAccessFromLobby()}>Notify the host</Button>
      </div>
    </div>
  );
};

export default LobbyScreen;
