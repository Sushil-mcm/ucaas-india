import { useEffect, useMemo, useState } from 'react';
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
   boxes. `tab` is that same tab strip's own label for the segment — clicking
   a segment drives CallHistory's `selectedTab` prop with this exact string,
   so it filters the table using its own existing tab-click logic rather
   than this file re-deriving the filter rules. */
const DONUT_SEGMENTS: Array<{ key: string; label: string; tab: string; color: string }> = [
  { key: 'inboundCalls', label: 'Answered', tab: 'Answered Calls', color: '#6ee7b7' },
  { key: 'outboundCalls', label: 'Outgoing', tab: 'Outgoing Calls', color: '#fdba74' },
  { key: 'missedCalls', label: 'Missed', tab: 'Missed Calls', color: '#fca5a5' },
  { key: 'voicemailCalls', label: 'Voicemails', tab: 'Voicemails', color: '#c7d2fe' },
  { key: 'blockedCalls', label: 'Blocked', tab: 'Blocked', color: '#cbd5e1' },
];
const TOTAL_CALLS_TAB = 'Total Calls';

const CallStatusDonut = ({
  callStats,
  selectedTab,
  onSelectTab,
}: {
  callStats: ReturnType<typeof useCallStats>;
  selectedTab: string;
  onSelectTab: (tab: string) => void;
}) => {
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

  /* Clicking the already-selected segment again clears back to Total Calls
     instead of getting stuck — the same toggle-off a filter chip usually
     gets, since a donut segment has no separate "clear" control of its own. */
  const toggle = (tab: string) => onSelectTab(selectedTab === tab ? TOTAL_CALLS_TAB : tab);

  return (
    <div className="ic-panel">
      <div className="ic-panel-title">Call Status Breakdown</div>
      <div className="ic-panel-sub">Click a segment to filter the table below.</div>
      <div className="ic-donut-wrap">
        <svg width="150" height="150" viewBox="0 0 170 170">
          <circle
            cx="85"
            cy="85"
            r={r}
            fill="none"
            stroke="rgba(150,100,50,0.1)"
            strokeWidth="20"
            style={{ cursor: selectedTab !== TOTAL_CALLS_TAB ? 'pointer' : 'default' }}
            onClick={() => onSelectTab(TOTAL_CALLS_TAB)}
          />
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
                  strokeOpacity={selectedTab === TOTAL_CALLS_TAB || selectedTab === arc.tab ? 1 : 0.3}
                  strokeDasharray={`${arc.len} ${circumference - arc.len}`}
                  strokeDashoffset={arc.offset}
                  transform="rotate(-90 85 85)"
                  style={{ cursor: 'pointer', transition: 'stroke-opacity 0.15s ease' }}
                  onClick={() => toggle(arc.tab)}
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
            <div
              className={`ic-donut-legend-row${selectedTab === arc.tab ? ' is-active' : ''}`}
              key={arc.key}
              onClick={() => toggle(arc.tab)}
            >
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
        <TrendBars data={series} dataKey="v" xKey="label" color="#f2994a" height={158} />
      ) : (
        <div className="ic-panel-empty">Not enough range to chart yet.</div>
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

  /* Drives CallHistory's own tab-strip filter from the donut, replacing the
     tab strip itself (hidden below via `hideTabStrip`) rather than
     duplicating it — one control for "which calls am I looking at", not
     two that could disagree. */
  const [selectedTab, setSelectedTab] = useState(TOTAL_CALLS_TAB);
  useEffect(() => {
    setSelectedTab(TOTAL_CALLS_TAB);
  }, [selectedRange.from, selectedRange.to]);

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
        <CallStatusDonut callStats={callStats} selectedTab={selectedTab} onSelectTab={setSelectedTab} />
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
        hideTabStrip
        selectedTab={selectedTab}
      />
    </div>
  );
};

export default InteractionsTab;
