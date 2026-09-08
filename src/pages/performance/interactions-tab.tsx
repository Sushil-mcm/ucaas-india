import { useEffect } from 'react';
import { Clock, Timer, IndianRupee } from 'lucide-react';
import CallHistory from '@/pages/reports/call-logs/call-history';
import PerfStatCard from './stat-card';
import { useCallStats } from '@/hooks/use-call-stats';
import { formatSecsToClock } from './format';
import './interactions-theme.css';

const InteractionsTab = ({ selectedRange }: { selectedRange: { from: string; to: string } }) => {
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
    <div className="perf-interactions flex w-full flex-col gap-3 px-[22px] py-4">
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
      />
    </div>
  );
};

export default InteractionsTab;
