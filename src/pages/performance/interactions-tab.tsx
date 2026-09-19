import { useEffect, useMemo } from 'react';
import moment from 'moment';
import { Clock, Timer, IndianRupee } from 'lucide-react';
import CallHistory from '@/pages/reports/call-logs/call-history';
import PerfKpiTile from './perf-kpi-tile';
import { useKpiHistory } from '@/pages/dashboard/home/use-kpi-history';
import { TrendBars } from '@/pages/dashboard/home/charts';
import { useCallStats } from '@/hooks/use-call-stats';
import { formatSecsToClock } from './format';
import './perf-kpi-tile.css';
import './interactions-theme.css';

/* Donut segments — real counts from the same call_stats the platform's own
   call-history tab strip reads (inbound_calls/outbound_calls/missed_calls/
   voicemail/blocked_calls), just drawn as a ring instead of five separate
   boxes. */
const DONUT_SEGMENTS: Array<{ key: string; label: string; color: string }> = [
  { key: 'inboundCalls', label: 'Answered', color: '#34d399' },
  { key: 'outboundCalls', label: 'Outgoing', color: '#fb923c' },
  { key: 'missedCalls', label: 'Missed', color: '#f87171' },
  { key: 'voicemailCalls', label: 'Voicemails', color: '#a5b4fc' },
  { key: 'blockedCalls', label: 'Blocked', color: '#94a3b8' },
];

const CallStatusDonut = ({ callStats }: { callStats: ReturnType<typeof useCallStats> }) => {
  const total = callStats.totalCalls;
  const r = 70;
  const circumference = 2 * Math.PI * r;
  let cursor = 0;
  const arcs = DONUT_SEGMENTS.map((segment) => {
    const count = (callStats as any)[segment.key] as number;
    const pct = total ? (count / total) * 100 : 0;
    const len = total ? (count / total) * circumference : 0;
    const arc = { ...segment, count, pct, len, offset: -cursor };
    cursor += len;
    return arc;
  });

  return (
    <div className="ic-panel">
      <div className="ic-panel-title">Call Status Breakdown</div>
      <div className="ic-panel-sub">Track and manage all your calls in real time.</div>
      <div className="ic-donut-wrap">
        <svg width="150" height="150" viewBox="0 0 170 170">
          <circle cx="85" cy="85" r={r} fill="none" stroke="rgba(150,100,50,0.1)" strokeWidth="20" />
          {arcs.map(
            (arc) =>
              arc.len > 0 && (
                <circle
                  key={arc.key}
                  cx="85"
                  cy="85"
                  r={r}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth="20"
                  strokeDasharray={`${arc.len} ${circumference - arc.len}`}
                  strokeDashoffset={arc.offset}
                  transform="rotate(-90 85 85)"
                />
              ),
          )}
          <text x="85" y="80" textAnchor="middle" fontSize="26" fontWeight="800" fill="#1a1a1a">
            {total.toLocaleString()}
          </text>
          <text x="85" y="99" textAnchor="middle" fontSize="11" fill="#8a8578">
            Total Calls
          </text>
        </svg>
        <div className="ic-donut-legend">
          {arcs.map((arc) => (
            <div className="ic-donut-legend-row" key={arc.key}>
              <span className="ic-donut-legend-label">
                <i style={{ background: arc.color }} />
                {arc.label}
              </span>
              <span className="ic-donut-legend-value">
                {arc.count.toLocaleString()} {arc.pct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* Calls per bucket across the selected range — hour buckets for a single
   day, day buckets otherwise, same dynamic-granularity rule Queues' own
   heatmap uses. Built from the same CDR rows useCallStats already fetches
   for the per-queue/per-agent breakdown, so no second request. */
const useCallVolumeSeries = (
  rows: any[],
  selectedRange: { from: string; to: string },
) =>
  useMemo(() => {
    const from = moment(selectedRange?.from);
    const to = moment(selectedRange?.to);
    if (!from.isValid() || !to.isValid()) return [];
    const byHour = from.isSame(to, 'day');

    const buckets = new Map<string, { label: string; v: number }>();
    if (byHour) {
      for (let hour = 0; hour < 24; hour += 1) {
        const key = String(hour).padStart(2, '0');
        buckets.set(key, { label: moment({ hour }).format('h A'), v: 0 });
      }
    } else {
      const cursor = from.clone().startOf('day');
      const end = to.clone().startOf('day');
      while (cursor.isSameOrBefore(end, 'day')) {
        buckets.set(cursor.format('YYYY-MM-DD'), { label: cursor.format('MMM D'), v: 0 });
        cursor.add(1, 'day');
      }
    }

    rows.forEach((row: any) => {
      const stamp = moment(row?.start_stamp);
      if (!stamp.isValid()) return;
      const key = byHour ? stamp.format('HH') : stamp.format('YYYY-MM-DD');
      const bucket = buckets.get(key);
      if (bucket) bucket.v += 1;
    });

    return Array.from(buckets.values());
  }, [rows, selectedRange?.from, selectedRange?.to]);

const CallVolumeTrend = ({
  callStats,
  selectedRange,
}: {
  callStats: ReturnType<typeof useCallStats>;
  selectedRange: { from: string; to: string };
}) => {
  const series = useCallVolumeSeries(callStats.rows, selectedRange);
  const byHour = moment(selectedRange?.from).isSame(moment(selectedRange?.to), 'day');

  return (
    <div className="ic-panel">
      <div className="ic-panel-title">Call Volume Trend</div>
      <div className="ic-panel-sub">
        Calls per {byHour ? 'hour' : 'day'} across the selected range.
      </div>
      {series.length > 1 ? (
        <TrendBars data={series} dataKey="v" xKey="label" color="#f2994a" height={170} />
      ) : (
        <div className="ic-panel-empty">Not enough range to chart yet.</div>
      )}
      {callStats.isQueueBreakdownSampled && (
        <div className="ic-panel-note">
          Based on the most recent {callStats.sampledRowCount.toLocaleString()} calls.
        </div>
      )}
    </div>
  );
};

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
      <div className="ic-chart-row">
        <CallStatusDonut callStats={callStats} />
        <CallVolumeTrend callStats={callStats} selectedRange={selectedRange} />
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
