import { useState, useEffect } from 'react';
import moment from 'moment';
import { CalendarClock } from 'lucide-react';

export const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const updateTimer = () => {
      const now = moment();
      const target = moment(targetDate);
      const diff = target.diff(now);

      if (diff <= 0) {
        setTimeLeft('Due now');
        return;
      }

      const duration = moment.duration(diff);
      const hours = Math.floor(duration.asHours());
      const minutes = duration.minutes();
      const seconds = duration.seconds();

      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setTimeLeft(`Due in ${parts.join(' ')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-[10px] font-bold text-amber-600 border border-amber-100 mt-1 animate-pulse whitespace-nowrap w-fit min-w-28">
      <CalendarClock className="w-3 h-3" />
      {timeLeft}
    </span>
  );
};
