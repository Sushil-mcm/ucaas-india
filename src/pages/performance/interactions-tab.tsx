import { useEffect } from 'react';
import { Clock, Timer, IndianRupee } from 'lucide-react';
import CallHistory from '@/pages/reports/call-logs/call-history';
import PerfKpiTile from './perf-kpi-tile';
import { useKpiHistory } from '@/pages/dashboard/home/use-kpi-history';
import { useCallStats } from '@/hooks/use-call-stats';
import { formatSecsToClock } from './format';
import './perf-kpi-tile.css';
import './interactions-theme.css';

const InteractionsTab = ({
  selectedRange,
  globalSearch,
}: {
  selectedRange: { from: string; to: string };
  globalSearch?: string;
}) => {
  const callStats = useCallStats(selectedRange);

  /* Backs the KPI tiles' sparklines and "vs last 30 min" trend pills —
     same rolling in-memory sampler Queues/Agents/Home use; no historical
     report endpoint exists behind these live-only figures either. */
  const { getHistory, getTrend } = useKpiHistory({
    avgWait: callStats.avgWaitSec ?? 0,
    avgHandle: callStats.avgHandleSec ?? 0,
    charge: callStats.totalCharge,
  });

  /* The warm ambient backdrop renders one level up, in the Performance page
     shell (index.tsx) — flagging the document while this tab is open is
     what lets interactions-theme.css reach it, the same convention Queues/
     Agents/Live/Campaigns already use. */
  useEffect(() => {
    document.body.classList.add('perf-warm-backdrop');
    return () => document.body.classList.remove('perf-warm-backdrop');
  }, []);

  return (
    /* `pt-3 pb-4`, matching Queues' own root (queues-activity-tab.tsx) — a
       tight ~12px top offset from the toolbar, not the looser `py-4` (16px
       top) this tab used before. The hero grid below no longer carries its
       own `py-3`: that was stacking a second 12px of padding *inside* the
       grid on top of this root's own `gap-3` to the next sibling, which is
       what read as a loose double gap between the cards and the search bar
       row beneath them. One owner (this root's padding/gap) is enough. */
    <div className="perf-interactions flex w-full flex-col gap-3 px-[22px] pt-3 pb-4">
      <div className="perf-kpi-row" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <PerfKpiTile
          icon={Clock}
          color="#60a5fa"
          title="Avg Wait Time"
          subtitle="before answer"
          value={callStats.avgWaitSec === null ? '—' : formatSecsToClock(callStats.avgWaitSec)}
          trend={getTrend('avgWait')}
          chart={{ type: 'line', data: getHistory('avgWait') }}
        />
        <PerfKpiTile
          icon={Timer}
          color="#fb923c"
          title="Avg Call Duration"
          subtitle="per answered call"
          value={callStats.avgHandleSec === null ? '—' : formatSecsToClock(callStats.avgHandleSec)}
          trend={getTrend('avgHandle')}
          goodWhenUp
          chart={{ type: 'area', data: getHistory('avgHandle') }}
        />
        <PerfKpiTile
          icon={IndianRupee}
          color="#c084fc"
          title="Total Call Charge"
          subtitle={
            callStats.isQueueBreakdownSampled
              ? `most recent ${callStats.sampledRowCount} calls`
              : `${selectedRange.from} – ${selectedRange.to}`
          }
          value={`₹${callStats.totalCharge.toFixed(2)}`}
          trend={getTrend('charge')}
          goodWhenUp
          chart={{ type: 'line', data: getHistory('charge') }}
        />
      </div>
      <CallHistory
        key={`${selectedRange.from}_${selectedRange.to}`}
        embedded
        initialDateFilter={selectedRange}
        showDateFilter={false}
        splitStickyHeader
        visibleRowCount={6}
        hasSubRows={false}
        detailsAsModal
        externalSearch={globalSearch}
      />
    </div>
  );
};

export default InteractionsTab;
