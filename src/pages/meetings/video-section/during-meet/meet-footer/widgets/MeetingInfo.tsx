import { useJitsi } from '@/hooks/use-jitsi';

const MeetingInfo = ({ meetState }: { meetState: any }) => {
  const { participantsListing } = useJitsi();
  const host = participantsListing?.find((p: any) => p?._properties?.get?.('isHost') === 'true');
  const hostName = host?._displayName ?? '';
  return (
    <div className="bg-white rounded-xl absolute bottom-20 px-4 pt-4 pb-5 flex flex-col items-center w-[360px]">
      <div className="flex flex-col gap-1">
        <small className="text-gray-700">Meeting details</small>
        <h5 className="text-primary-800 font-bold">UCAAS Meeting</h5>
        <div className="flex flex-col pt-2 gap-1.5">
          <div className="flex gap-3">
            <small className="text-gray-900 font-semibold w-1/4">Host</small>
            <small className="font-medium w-3/4 break-words">
              {hostName || meetState?.hostName || 'Unknown'}
            </small>
          </div>
          <div className="flex gap-3">
            <small className="text-gray-900 font-semibold w-1/4">Meeting ID</small>
            <small className="font-medium w-3/4 break-words">
              {meetState?.meetUniqueKey ?? ''}
            </small>
          </div>
          <div className="flex gap-3">
            <small className="text-gray-900 font-semibold w-1/4">Meeting Link</small>
            <div className="flex flex-col gap-1 w-3/4">
              <div className="font-medium break-words text-xs text-primary underline cursor-pointer">
                {`${window.location.origin}/video-meet?meetCode=${meetState?.meetUniqueKey}`}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute polygon w-5 h-5 bg-white bottom-[-10px] left-4"></div>
    </div>
  );
};

export default MeetingInfo;
