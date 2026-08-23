import CallHistory from '@/pages/reports/call-logs/call-history';
import PerfStatCard from './stat-card';
import { useCallStats } from '@/hooks/use-call-stats';
import { formatSecsToClock } from './format';

const InteractionsTab = ({ selectedRange }: { selectedRange: { from: string; to: string } }) => {
  const callStats = useCallStats(selectedRange);

  return (
    <div className="flex w-full flex-col gap-3 px-[22px] py-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <PerfStatCard
          label="Avg wait time"
          value={callStats.avgWaitSec === null ? '—' : formatSecsToClock(callStats.avgWaitSec)}
          sub="before answer"
        />
        <PerfStatCard
          label="Avg call duration"
          value={callStats.avgHandleSec === null ? '—' : formatSecsToClock(callStats.avgHandleSec)}
          sub="per answered call"
        />
        <PerfStatCard
          label="Total call charge"
          value={`$${callStats.totalCharge.toFixed(2)}`}
          sub={
            callStats.isQueueBreakdownSampled
              ? `most recent ${callStats.sampledRowCount} calls`
              : `${selectedRange.from} – ${selectedRange.to}`
          }
        />
      </div>
      <CallHistory
        key={`${selectedRange.from}_${selectedRange.to}`}
        embedded
        initialDateFilter={selectedRange}
      />
    </div>
  );
};

export default InteractionsTab;
