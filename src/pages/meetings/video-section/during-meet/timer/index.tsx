import { secondsToHHMMSS } from '@/lib/utils';
import moment from 'moment';
import { useEffect, useState } from 'react';

const MeetingTimer = ({ startTime = '', endUtc = '' }: { startTime: string; endUtc?: string }) => {
  const [time, setTime] = useState('00:00:00');

  useEffect(() => {
    if (endUtc) {
      const interval = setInterval(() => {
        const diffSeconds = moment(endUtc).diff(moment(), 'seconds');
        if (diffSeconds > 0) {
          const hours = Math.floor(diffSeconds / 3600);
          const minutes = Math.floor((diffSeconds % 3600) / 60);
          const secs = diffSeconds % 60;
          const formatted =
            hours > 0
              ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
              : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          setTime(formatted);
        } else {
          setTime('00:00');
        }
      }, 1000);

      return () => clearInterval(interval);
    }

    if (!startTime) {
      setTime('00:00:00');
      return;
    }

    const interval = setInterval(() => {
      const currentTime = moment();
      const startMoment = moment(startTime);
      const seconds = currentTime.diff(startMoment, 'seconds');

      // Only show positive time (meeting has started)
      if (seconds >= 0) {
        if (seconds >= 3600) {
          const hours = Math.floor(seconds / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          const secs = seconds % 60;
          setTime(
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
          );
        } else {
          setTime(secondsToHHMMSS(seconds));
        }
      } else {
        setTime('00:00');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, endUtc]);

  return (
    <div className="flex items-center space-x-1">
      <span className="text-white font-mono text-lg font-black tracking-wider">{time}</span>
    </div>
  );
};

export default MeetingTimer;
