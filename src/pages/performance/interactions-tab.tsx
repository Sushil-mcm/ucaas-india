import { useEffect } from 'react';
import { Clock, Timer, IndianRupee } from 'lucide-react';
import CallHistory from '@/pages/reports/call-logs/call-history';
import PerfStatCard from './stat-card';
import { useCallStats } from '@/hooks/use-call-stats';
import { formatSecsToClock } from './format';
import './interactions-theme.css';

const InteractionsTab = ({
  selectedRange,
  globalSearch,
}: {
  selectedRange: { from: string; to: string };
  globalSearch?: string;
}) => {
  const callStats = useCallStats(selectedRange);

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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <PerfStatCard
          label="Avg wait time"
          value={callStats.avgWaitSec === null ? '—' : formatSecsToClock(callStats.avgWaitSec)}
          sub="before answer"
          icon={Clock}
        />
        <PerfStatCard
          label="Avg call duration"
          value={callStats.avgHandleSec === null ? '—' : formatSecsToClock(callStats.avgHandleSec)}
          sub="per answered call"
          icon={Timer}
        />
        <PerfStatCard
          label="Total call charge"
          value={`₹${callStats.totalCharge.toFixed(2)}`}
          sub={
            callStats.isQueueBreakdownSampled
              ? `most recent ${callStats.sampledRowCount} calls`
              : `${selectedRange.from} – ${selectedRange.to}`
          }
          icon={IndianRupee}
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
