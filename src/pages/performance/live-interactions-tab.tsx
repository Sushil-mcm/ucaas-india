import { useMemo } from 'react';
import AllUserMonitoring from '@/pages/monitoring/all-users';
import { useSocketEvents } from '@/hooks/use-socket-events';
import {
  getMonitoringCallTimestamp,
  getMonitoringLiveCalls,
  isActiveMonitoringCall,
} from '@/pages/monitoring/live-call-helpers';
import { STATE_TYPE_NAME } from '@/pages/monitoring/constants';
import PerfStatCard from './stat-card';
import Timer from '@/components/timer';

const LiveInteractionsTab = () => {
  const { liveCalls, eventLiveCallsData } = useSocketEvents();

  const activeCalls = useMemo(
    () => getMonitoringLiveCalls(liveCalls, eventLiveCallsData).filter(isActiveMonitoringCall),
    [liveCalls, eventLiveCallsData],
  );

  const byState = useMemo(() => {
    const map: Record<string, number> = {};
    activeCalls.forEach((call: any) => {
      const label = STATE_TYPE_NAME[call?.status as keyof typeof STATE_TYPE_NAME] || 'Other';
      map[label] = (map[label] || 0) + 1;
    });
    return map;
  }, [activeCalls]);

  const byDirection = useMemo(() => {
    const map = { inbound: 0, outbound: 0 };
    activeCalls.forEach((call: any) => {
      if (call?.direction === 'inbound') map.inbound += 1;
      else if (call?.direction === 'outbound') map.outbound += 1;
    });
    return map;
  }, [activeCalls]);

  const longestRunningCall = useMemo(
    () =>
      activeCalls.reduce((longest: any, call: any) => {
        if (!longest) return call;
        const callTs = getMonitoringCallTimestamp(call) ?? Infinity;
        const longestTs = getMonitoringCallTimestamp(longest) ?? Infinity;
        return callTs < longestTs ? call : longest;
      }, null),
    [activeCalls],
  );

  return (
    <div className="flex w-full flex-col gap-3 px-[22px] py-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <PerfStatCard label="Total live calls" value={String(activeCalls.length)} />
        <PerfStatCard
          label="By state"
          value={Object.keys(byState).length ? String(Math.max(...Object.values(byState))) : '0'}
          sub={
            Object.entries(byState).length
              ? Object.entries(byState)
                  .map(([state, count]) => `${state}: ${count}`)
                  .join(' · ')
              : 'No live calls'
          }
        />
        <PerfStatCard
          label="Longest running"
          value={
            longestRunningCall && getMonitoringCallTimestamp(longestRunningCall) !== null ? (
              <Timer startTime={getMonitoringCallTimestamp(longestRunningCall)} />
            ) : (
              '00:00'
            )
          }
        />
        <PerfStatCard
          label="By direction"
          value={`${byDirection.inbound} / ${byDirection.outbound}`}
          sub="inbound / outbound"
        />
      </div>
      <AllUserMonitoring embedded />
    </div>
  );
};

export default LiveInteractionsTab;
