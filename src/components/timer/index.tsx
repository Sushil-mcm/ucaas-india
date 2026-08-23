import { secondsToHHMMSS } from '@/lib/utils';
import moment from 'moment';
import { useEffect, useState } from 'react';

const Timer = ({ startTime = '' }: { startTime: any }) => {
  const [time, setTime] = useState('00:00');

  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = moment();
      const second = currentTime.diff(startTime ? moment(startTime) : moment(), 'seconds');
      setTime(secondsToHHMMSS(second));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return <>{time}</>;
};

export default Timer;
