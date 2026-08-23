import { cn } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type DialpadCountdownRingTimerProps = {
  currentTimeSeconds: number;
  onTimeEnds: () => void;
  className?: string;
  size?: 'default' | 'compact';
  referenceTimestampMs?: number;
  onTick?: (remainingSeconds: number) => void;
};

const normalizeSeconds = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
};

const formatSeconds = (value: number) => {
  const safeValue = Math.max(0, Math.floor(value));
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const DialpadCountdownRingTimer = ({
  currentTimeSeconds,
  onTimeEnds,
  className,
  size = 'default',
  referenceTimestampMs,
  onTick,
}: DialpadCountdownRingTimerProps) => {
  const totalSeconds = useMemo(() => normalizeSeconds(currentTimeSeconds), [currentTimeSeconds]);
  const hasReferenceTimestamp =
    Number.isFinite(referenceTimestampMs) && Number(referenceTimestampMs) > 0;
  const getRemainingSecondsFromReference = useCallback(() => {
    if (!hasReferenceTimestamp) return totalSeconds;
    const elapsedSeconds = Math.max(
      0,
      Math.floor((Date.now() - Number(referenceTimestampMs)) / 1000),
    );
    return Math.max(0, totalSeconds - elapsedSeconds);
  }, [hasReferenceTimestamp, referenceTimestampMs, totalSeconds]);
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSecondsFromReference(),
  );
  const hasTriggeredEndRef = useRef(false);

  useEffect(() => {
    setRemainingSeconds(getRemainingSecondsFromReference());
    hasTriggeredEndRef.current = false;
  }, [getRemainingSecondsFromReference]);

  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const countdownInterval = window.setInterval(() => {
      if (hasReferenceTimestamp) {
        setRemainingSeconds(getRemainingSecondsFromReference());
        return;
      }

      setRemainingSeconds((previousSeconds) => Math.max(0, previousSeconds - 1));
    }, 1000);

    return () => {
      window.clearInterval(countdownInterval);
    };
  }, [getRemainingSecondsFromReference, hasReferenceTimestamp, remainingSeconds]);

  useEffect(() => {
    if (remainingSeconds !== 0 || hasTriggeredEndRef.current) return;

    hasTriggeredEndRef.current = true;
    onTimeEnds();
  }, [onTimeEnds, remainingSeconds]);

  useEffect(() => {
    onTick?.(remainingSeconds);
  }, [onTick, remainingSeconds]);

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const progressDegrees = Math.max(0, Math.min(360, progress * 360));
  const displayValue = formatSeconds(remainingSeconds);
  const isCompact = size === 'compact';

  return (
    <div className={cn('flex flex-col items-center justify-center gap-1.5', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full',
          isCompact ? 'h-11 w-11 sm:h-11 sm:w-11' : 'h-20 w-20 sm:h-24 sm:w-24',
        )}
        style={{
          background: `conic-gradient(#1f62d9 ${progressDegrees}deg, #dbe8fb ${progressDegrees}deg 360deg)`,
        }}
      >
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-full bg-white text-[#1f2f47]',
            isCompact
              ? 'h-[calc(100%-6px)] w-[calc(100%-6px)]'
              : 'h-[calc(100%-10px)] w-[calc(100%-10px)]',
          )}
        >
          <span
            className={cn(
              'font-mono font-bold leading-none',
              isCompact ? 'text-[9px]' : 'text-[12px] sm:text-[14px]',
            )}
          >
            {displayValue}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DialpadCountdownRingTimer;
