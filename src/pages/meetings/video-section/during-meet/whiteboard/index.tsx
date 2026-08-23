import { useJitsi } from '@/hooks/use-jitsi';
import { getEnv } from '@/lib/utils';
import { useMemo } from 'react';

const Whiteboard = () => {
  const { roomCode, userName } = useJitsi();

  const whiteboardUrl = useMemo(() => {
    const whiteboardBaseUrl = getEnv()?.VITE_WHITEBOARD_BASE_URL;
    if (!whiteboardBaseUrl) return '';
    const params = new URLSearchParams({
      room: roomCode || '',
      username: userName || 'Guest',
    });

    return `${whiteboardBaseUrl}/?${params.toString()}`;
  }, [roomCode, userName]);

  if (!whiteboardUrl) {
    return (
      <div className="bg-white rounded-lg col-span-4 flex items-center justify-center text-sm text-gray-600 p-4">
        Whiteboard is unavailable right now.
      </div>
    );
  }
  console.log({ whiteboardUrl });
  return (
    <div className="bg-white rounded-lg overflow-hidden w-full h-full">
      <iframe
        title="Meeting Whiteboard"
        src={whiteboardUrl}
        className="w-full h-full border-0"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
};

export default Whiteboard;
