import { PhoneCallingLine } from '@/assets/icons';
import { useDialpad } from '@/hooks/use-dialpad';
import { useEffect, useMemo, useState } from 'react';
import CustomTooltip from '../custom-tooltip';

type HeaderDialerButtonProps = {
  isRegistered: boolean;
  onClick: () => void;
};

const formatDuration = (totalSeconds: number) => {
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

const HeaderDialerButton = ({ isRegistered, onClick }: HeaderDialerButtonProps) => {
  const { sessions, activeSessionId, isDialpadOpen } = useDialpad();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const allSessions = useMemo(
    () => Object.values(sessions).sort((left, right) => right.startedAt - left.startedAt),
    [sessions],
  );
  const activeSessionFromId = activeSessionId ? sessions?.[activeSessionId] : null;
  const activeSession = activeSessionFromId || allSessions[0] || null;
  const isActiveSessionLive = !['ended', 'failed'].includes(
    String(activeSession?.status || '').toLowerCase(),
  );
  const timerReference = activeSession?.connectedAt || activeSession?.startedAt || 0;
  const shouldShowTimer = !isDialpadOpen && isActiveSessionLive && Boolean(timerReference);

  useEffect(() => {
    if (!shouldShowTimer) {
      setElapsedSeconds(0);
      return;
    }

    const syncElapsed = () => {
      const diffInSeconds = Math.floor((Date.now() - timerReference) / 1000);
      setElapsedSeconds(Math.max(0, diffInSeconds));
    };

    syncElapsed();
    const intervalId = window.setInterval(syncElapsed, 1000);
    return () => window.clearInterval(intervalId);
  }, [shouldShowTimer, timerReference]);

  return (
    <div className="inline-flex items-center justify-center font-medium">
      <CustomTooltip text={'Dialer'} side="bottom">
        <span
          className="cursor-pointer flex items-center justify-center gap-1 relative bg-gray-100 flex items-center justify-center min-h-9 min-w-9 w-full max-h-9 rounded-lg hover:bg-ucass-primary-200 hover:text-primary p-1"
          onClick={onClick}
        >
          <div className="w-full flex absolute top-0 left-1">
            <span className="inline-flex items-center font-medium text-blue">
              <div className="flex items-center text-[10px] gap-1 uppercase tracking-widest">
                <div
                  className={`w-2 h-2 rounded-lg ${isRegistered ? 'bg-green-500' : 'bg-red-500'}`}
                ></div>
              </div>
            </span>
          </div>
          <div>
            <PhoneCallingLine className="w-4.5 h-4.5" />
          </div>
          {shouldShowTimer ? (
            <span className="text-xs text-[#d02f4d] ">{formatDuration(elapsedSeconds)}</span>
          ) : null}
        </span>
      </CustomTooltip>
    </div>
  );
};

export default HeaderDialerButton;
