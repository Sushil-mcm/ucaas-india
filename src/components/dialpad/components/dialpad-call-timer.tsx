import { useEffect, useState } from 'react';

type DialpadCallTimerProps = {
  connectedAt?: number;
};

export const formatDialpadDuration = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
};

const DialpadCallTimer = ({ connectedAt }: DialpadCallTimerProps) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!connectedAt) {
      setElapsedSeconds(0);
      return;
    }

    const syncElapsed = () => {
      const diffInSeconds = Math.floor((Date.now() - connectedAt) / 1000);
      setElapsedSeconds(Math.max(0, diffInSeconds));
    };

    syncElapsed();
    const intervalId = window.setInterval(syncElapsed, 1000);

    return () => window.clearInterval(intervalId);
  }, [connectedAt]);

  if (!connectedAt) return null;

  return (
    <span className="rounded-full  bg-white   font-mono text-[11px] font-semibold text-red-600 max-[380px]:px-1.5 max-[380px]:text-[10px] sm:px-2.5 sm:py-1 sm:text-xs xl:text-[13px]">
      {formatDialpadDuration(elapsedSeconds)}
    </span>
  );
};

export default DialpadCallTimer;
