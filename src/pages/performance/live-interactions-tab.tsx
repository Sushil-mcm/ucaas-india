import { useEffect, useMemo } from 'react';
import { PhoneCall, Radio, Timer as TimerIcon, PhoneForwarded } from 'lucide-react';
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
import './live-theme.css';

const LiveInteractionsTab = ({ globalSearch }: { globalSearch?: string } = {}) => {
  const { liveCalls, eventLiveCallsData } = useSocketEvents();

  /**
   * The view's warm theme covers a thing this component does not render:
   * the full-page ambient backdrop (the page shell above this tab).
   * Flagging the document while the view is open lets `live-theme.css`
   * reach it without the shell being edited — so no other area, and no
   * other Performance view, is touched, and leaving this view restores it
   * on the same frame. Shared with Campaigns, which opts in the same way.
   *
   * The toolbar itself (`perf-warm-toolbar`) is now toggled once in the
   * parent `Performance` component (index.tsx), since the toolbar renders
   * unconditionally there for every tab — adding it here too would race
   * with the parent's own toggle on tab switches (this tab's cleanup would
   * strip the class the parent still wants on).
   */
  useEffect(() => {
    document.body.classList.add('perf-warm-backdrop');
    return () => document.body.classList.remove('perf-warm-backdrop');
  }, []);

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

  /* Distinct queues the live calls are spread across. Counted off
     `current_context` — the same field the monitoring table's own "Call
     Path" column reads — so the card and the table below it can't
     disagree. Calls with no queue (a direct extension call) simply don't
     add to the count rather than being lumped under an "Other" bucket. */
  const liveQueueCount = useMemo(
    () =>
      new Set(
        activeCalls
          .map((call: any) => String(call?.current_context || '').trim())
          .filter(Boolean),
      ).size,
    [activeCalls],
  );

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

  /* `pt-7` lands the first card on the same 28px as Agents/Calls (their
     `py-4` root plus the 12px their stat grids add via `py-3`). Bottom stays
     at this tab's own `py-5` — only the top was out of step. */
  return (
    <div className="perf-live flex w-full flex-col gap-4 px-[22px] pt-7 pb-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <PerfStatCard
          label="Total live calls"
          value={String(activeCalls.length)}
          /* Queue *spread*, not another direction/state split — the two
             cards beside this one already carry those, so counting the
             distinct queues these calls are sitting in says something
             neither of them does. `current_context` is the same field the
             table's own "Call Path" column reads, so the two agree. */
          sub={
            liveQueueCount
              ? `across ${liveQueueCount} queue${liveQueueCount === 1 ? '' : 's'}`
              : undefined
          }
          icon={PhoneCall}
        />
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
          icon={Radio}
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
          /* Which call the timer is actually counting. A duration with
             nothing attached to it is the one number on this row you
             can't act on — naming its queue is what makes it a lead to
             follow rather than a statistic. */
          sub={longestRunningCall ? longestRunningCall?.current_context || undefined : undefined}
          icon={TimerIcon}
        />
        <PerfStatCard
          label="By direction"
          value={`${byDirection.inbound} / ${byDirection.outbound}`}
          sub="inbound / outbound"
          icon={PhoneForwarded}
        />
      </div>
      <AllUserMonitoring embedded globalSearch={globalSearch} />
    </div>
  );
};

export default LiveInteractionsTab;
