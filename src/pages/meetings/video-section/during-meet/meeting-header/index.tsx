import { Clock } from 'lucide-react';
import MeetingTimer from '../timer';

const MeetingHeader = ({ apiMeetingData }: { apiMeetingData: any }) => {
  const endUtc =
    apiMeetingData?.endUtc ||
    (apiMeetingData?.startUtc && apiMeetingData?.duration
      ? new Date(
          new Date(apiMeetingData.startUtc).getTime() + apiMeetingData.duration * 60000,
        ).toISOString()
      : '');

  return (
    <div className="bg-black px-6 py-3 border-b border-zinc-800">
      <div className="flex items-center justify-end">
        <div className="flex items-center space-x-4 text-sm font-semibold">
          {/* Call Duration */}
          <div className="flex items-center space-x-2 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-400 font-medium text-xs">Call Duration:</span>
            <MeetingTimer startTime={apiMeetingData?.startUtc || ''} />
          </div>
          {/* Time Remaining */}
          {endUtc && (
            <div className="flex items-center space-x-2 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">
              <Clock className="w-4 h-4 text-rose-400 animate-pulse" />
              <span className="text-rose-400 font-medium text-xs">Time Remaining:</span>
              <MeetingTimer endUtc={endUtc} startTime="" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingHeader;
