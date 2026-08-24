import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParamManager } from '@/hooks/use-search-params';
import DateDropdown from '@/components/custom/date-dropdown';
import { DateFilterTypes, handleDate } from '@/components/custom/date-dropdown/constant';
import Timer from '@/components/timer';
import { useLiveContactCentre } from '@/hooks/use-live-contact-centre';
import {
  getMonitoringCallTimestamp,
  isMonitoringCallForForwardValue,
} from '@/pages/monitoring/live-call-helpers';
import QueuesActivityTab from './queues-activity-tab';
import CampaignActivityTab from './campaign-activity-tab';
import AgentsTab from './agents-tab';
import InteractionsTab from './interactions-tab';
import DashboardsTab from './dashboards-tab';
import LiveInteractionsTab from './live-interactions-tab';
import CallbacksTab from './callbacks-tab';
import SpeechTextTab from './speech-text-tab';
import ReportsTab from './reports-tab';
import Wallboard, { type WallboardQueueRow, type WallboardTile } from './wallboard';
import { formatSecsToClock } from './format';
import { useAnimatedNumber } from './use-animated-number';
import '@/components/mcm/mcm-page.css';

import LiveDashboard from '@/pages/dashboard/live-dashboard';
import AiWallboard from '@/pages/dashboard/ai-wallboard';
import VideoDashboard from '@/pages/dashboard/video-dashboard';
import CallQueueContent from '@/pages/dashboard/call-dashboard/Call-queue-content';

/**
 * Wallboards used to hang off Home as a second tab strip, which put a "Home"
 * tab inside Home. They are performance surfaces, so they live here — each one
 * still gated on the plan feature that gated it before.
 */
const WALLBOARD_TABS = [
  { key: 'live-wallboard', label: 'Live Wallboard', feature: null },
  { key: 'ai-wallboard', label: 'AI Wallboard', feature: 'ai' },
  { key: 'call-queue', label: 'Call Queue', feature: 'queue' },
  { key: 'video-dashboard', label: 'Video Dashboard', feature: 'video' },
] as const;

const TABS = [
  { key: 'queues-activity', label: 'Queues Activity' },
  { key: 'campaign-activity', label: 'Campaign Activity' },
  { key: 'agents', label: 'Agents' },
  { key: 'interactions', label: 'Interactions' },
  { key: 'dashboards', label: 'Dashboards' },
  { key: 'live-interactions', label: 'Live Interactions' },
  { key: 'callbacks', label: 'Callbacks' },
  { key: 'speech-text', label: 'Speech & Text' },
  { key: 'reports', label: 'Reports' },
];

const SHOW_KPI_HEADER_TABS = new Set(['queues-activity', 'campaign-activity', 'dashboards']);

// Maps onto the shared status tokens in mcm-page.css rather than raw colours,
// so the band stays legible in dark mode.
const KPI_TONE_STYLES: Record<string, string> = {
  default: '',
  success: 'good',
  warning: 'warnv',
  danger: 'bad',
};

const slaTone = (sla: number | null): 'default' | 'success' | 'warning' | 'danger' => {
  if (sla === null) return 'default';
  if (sla >= 80) return 'success';
  if (sla >= 60) return 'warning';
  return 'danger';
};

const Performance = () => {
  // The open view lives in the URL, the same `?view=` convention the calendar
  // uses. That makes a Performance view shareable and survive a refresh, and it
  // is what lets the area rail highlight the view you are actually on.
  const { setParam, getParam } = useSearchParamManager();
  const allTabKeys = useMemo(
    () => [...TABS.map((tab) => tab.key), ...WALLBOARD_TABS.map((tab) => tab.key)],
    [],
  );
  const viewParam = getParam('view');
  const activeTab =
    viewParam && allTabKeys.includes(viewParam as string) ? (viewParam as string) : TABS[0].key;
  const setActiveTab = (key: string) => setParam({ view: key });
  const [selectedQueueUuid, setSelectedQueueUuid] = useState<string | null>(null);
  const [isWallboardOpen, setIsWallboardOpen] = useState(false);
  const [dropdownVal, setDropdownVal] = useState(() => ({
    value: handleDate('Today'),
    date_type: 'Today',
    dateOptions: DateFilterTypes,
  }));
  const selectedRange = dropdownVal.value;

  // Queues, agents and the headline figures come from the shared live hook so
  // Home and Performance can never disagree about them. Everything below is
  // this page's own presentation of them.
  const {
    activeQueueCalls,
    usersOnlineStatus,
    queues,
    agentRows,
    queueStatsByUuid,
    liveSlaByName,
    liveQueueStatsByName,
    waitingCalls,
    longestWaitTimestamp,
    longestWaitSecs,
    totals,
    onlineAgentsCount,
    avgSla,
    avgHandleTime,
    abandonRate,
    occupancy,
    callStats,
    cdrByQueueUuid,
    isCdrSampled,
    isQueuesLoading,
    isAgentsLoading,
  } = useLiveContactCentre(selectedRange);

  const waitingAnimated = useAnimatedNumber(waitingCalls.length);
  const answeredAnimated = useAnimatedNumber(totals.answered);
  const onlineAgentsAnimated = useAnimatedNumber(onlineAgentsCount);
  const slAnimated = useAnimatedNumber(avgSla);
  const abandonAnimated = useAnimatedNumber(abandonRate);
  const ahtAnimated = useAnimatedNumber(avgHandleTime);
  const occupancyAnimated = useAnimatedNumber(occupancy);

  const kpis: {
    label: string;
    value: ReactNode;
    sub?: ReactNode;
    tone?: 'default' | 'success' | 'warning' | 'danger';
  }[] = [
    {
      label: 'Waiting',
      value: String(Math.round(waitingAnimated)),
      sub: `across ${queues.length} ${queues.length === 1 ? 'queue' : 'queues'}`,
    },
    {
      label: 'Longest wait',
      value: longestWaitTimestamp ? <Timer startTime={longestWaitTimestamp} /> : '00:00',
      sub:
        longestWaitSecs > 120 ? (
          <span style={{ color: 'var(--crit)' }}>breaching</span>
        ) : (
          'within target'
        ),
    },
    {
      label: 'Service level',
      value: avgSla === null ? '—' : `${Math.round(slAnimated)}%`,
      sub: 'target 80% in 20s',
      tone: slaTone(avgSla),
    },
    {
      label: 'Answered',
      value: String(Math.round(answeredAnimated)),
      sub: `of ${callStats.totalCalls} calls`,
    },
    {
      label: 'Abandon rate',
      value: abandonRate === null ? '—' : `${Math.round(abandonAnimated)}%`,
      sub: abandonRate === null ? undefined : `${callStats.missedCalls} missed`,
      tone: abandonRate !== null && abandonRate > 5 ? 'danger' : 'default',
    },
    {
      label: 'Avg handle time',
      value: avgHandleTime === null ? '—' : formatSecsToClock(ahtAnimated),
      sub: 'per answered call',
    },
    {
      label: 'On queue agents',
      value: String(Math.round(onlineAgentsAnimated)),
      sub: `of ${agentRows.length} active`,
    },
    {
      label: 'Occupancy',
      value: occupancy === null ? '—' : `${Math.round(occupancyAnimated)}%`,
      sub: 'target 75–85%',
    },
  ];

  // The wallboard mirrors the KPI band and the live queue table on a dark,
  // room-facing full-screen layout, so it reads from the same live sources.
  const wallboardTiles: WallboardTile[] = [
    {
      key: 'waiting',
      label: 'Waiting',
      value: String(waitingCalls.length),
      warn: waitingCalls.length > 5,
    },
    {
      key: 'longest',
      label: 'Longest wait',
      value: '00:00',
      timerStart: longestWaitTimestamp,
      warn: longestWaitSecs > 120,
    },
    {
      key: 'sl',
      label: 'Service level',
      value: avgSla === null ? '—' : `${Math.round(avgSla)}%`,
      warn: avgSla !== null && avgSla < 80,
      good: avgSla !== null && avgSla >= 80,
    },
    { key: 'answered', label: 'Answered today', value: String(totals.answered) },
    {
      key: 'abandon',
      label: 'Abandon rate',
      value: abandonRate === null ? '—' : `${Math.round(abandonRate)}%`,
      warn: abandonRate !== null && abandonRate > 5,
      good: abandonRate !== null && abandonRate <= 5,
    },
    {
      key: 'onqueue',
      label: 'On queue agents',
      value: String(onlineAgentsCount),
    },
  ];

  const wallboardQueues: WallboardQueueRow[] = queues.map((queue: any) => {
    const queueCalls = activeQueueCalls.filter((call: any) =>
      isMonitoringCallForForwardValue(call, queue.uuid),
    );
    const queueWaiting = queueCalls.filter((call: any) => call?.status === 'waiting');
    const queueLongest = queueWaiting.reduce((longest: any, call: any) => {
      if (!longest) return call;
      const callTimestamp = getMonitoringCallTimestamp(call) ?? Infinity;
      const longestTimestamp = getMonitoringCallTimestamp(longest) ?? Infinity;
      return callTimestamp < longestTimestamp ? call : longest;
    }, null);
    const nameKey = String(queue.name || '').toLowerCase();
    const liveStats = liveQueueStatsByName[nameKey];
    const sla = liveSlaByName[nameKey];
    return {
      uuid: queue.uuid,
      name: queue.name,
      waiting: queueWaiting.length,
      longestWaitTimestamp: queueLongest ? getMonitoringCallTimestamp(queueLongest) : null,
      sla: typeof sla === 'number' ? sla : null,
      handledToday: liveStats ? liveStats.totalCalls : null,
    };
  });

  return (
    // `mcm-page` scopes the shared console design system (stat tiles, panels,
    // buttons). PerfStatCard renders `.stat`, which is defined only inside
    // this scope, so without the wrapper every card on every tab loses its
    // styling entirely.
    //
    // Its base rule also swaps in its own typeface, which would leave this
    // page reading differently from the rest of the app — so the font is
    // handed back to the app's own while everything else is kept.
    <section
      className="mcm-page"
      style={
        {
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: 'inherit',
          // `--sans` and `--mono` are what the design system's own rules read
          // (`.num` puts every stat value in a monospace face, which turned
          // text values like a queue name into typewriter text). Pointing both
          // at the app's own stack keeps the layout while restoring the
          // typography; `.num` still gets its tabular figures.
          '--sans': 'inherit',
          '--mono': 'inherit',
          // The design system pins the page and scrolls one inner pane, which
          // left the tab content scrolling inside a short box. The whole page
          // scrolls as one instead.
          overflowY: 'auto',
        } as React.CSSProperties
      }
    >
      {/* The header row draws from three sources — the app's own date dropdown,
          the design system's chips and its buttons — each with a different
          control height and border colour, which is what made the row look
          unsettled. This puts them on one baseline. */}
      <style>{`
        .mcm-page .perf-tbar {
          display:flex; align-items:center; gap:10px 16px;
          flex-wrap:wrap; margin-bottom:0;
        }
        .mcm-page .perf-tbar-group {
          display:flex; align-items:center; gap:8px; flex-wrap:wrap; min-width:0;
        }
        .mcm-page .perf-tbar-end { margin-left:auto; }
        .mcm-page .perf-tbar .fchip,
        .mcm-page .perf-tbar .btn.sm { height:36px; border-radius:9px; }
        /* the date dropdown ships its own grey border — align it to the tokens */
        .mcm-page .perf-tbar input,
        .mcm-page .perf-tbar select,
        .mcm-page .perf-tbar [role="combobox"] { border-color:var(--line); }
      `}</style>

      <div className="page-bar">
        {/* The views moved into the area rail, the way the console navigates
            Performance — a strip here as well would be a second row of the
            same navigation. The rail links through `?view=`, which is what
            `activeTab` reads. */}
        {/* This row is the whole page header now, so it carries the filters on
            the left and status plus actions on the right. The controls come
            from three places (the app's date dropdown, the design system's
            chips, its buttons) at three different heights — `perf-tbar` below
            settles them onto one baseline. */}
        <div className="tbar perf-tbar">
          <div className="perf-tbar-group">
            <DateDropdown dropdownVal={dropdownVal} setDropdownVal={setDropdownVal} />
            <span className="fchip">Division: All</span>
            <span className="fchip">Media: All</span>
          </div>

          <div className="perf-tbar-group perf-tbar-end">
            <span className="fchip live">
              <span className="dot green pulsing" />
              Live — updates every 2s
            </span>
            {/* The page header that used to carry these was removed; keeping
                the actions here so the wallboard stays reachable. */}
            <button type="button" className="btn ghost sm" onClick={() => setIsWallboardOpen(true)}>
              Wallboard
            </button>
            <button
              type="button"
              className="btn primary sm"
              onClick={() => {
                setActiveTab('dashboards');
                setSelectedQueueUuid(null);
              }}
            >
              My dashboards
            </button>
          </div>
        </div>
      </div>

      {SHOW_KPI_HEADER_TABS.has(activeTab) &&
        !(activeTab === 'queues-activity' && selectedQueueUuid) && (
          <div className="page-band">
            <p className="page-note">
              Waiting, Longest wait, Service level, On queue agents and Occupancy are live right
              now. Answered, Abandon rate and Avg handle time cover the selected date range.
            </p>
            {/* The design system's auto-fit grid left the 8th tile alone on a
              second row with the container's divider colour showing through as
              a large grey block. Fixed column counts divide the 8 evenly. */}
            <style>{`
            .mcm-page .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            @media (min-width: 700px) {
              .mcm-page .kpis { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            }
            @media (min-width: 1500px) {
              .mcm-page .kpis { grid-template-columns: repeat(8, minmax(0, 1fr)); }
            }
          `}</style>
            <div className="kpis">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="kpi">
                  <div className="k">{kpi.label}</div>
                  <div className={`v num ${KPI_TONE_STYLES[kpi.tone || 'default']}`.trim()}>
                    {kpi.value}
                  </div>
                  {kpi.sub && <div className="d">{kpi.sub}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Flows in the page's own scroll rather than being a separate scroll pane. */}
      <div style={{ flex: 'none' }}>
        {activeTab === 'queues-activity' && (
          <QueuesActivityTab
            queues={queues}
            activeQueueCalls={activeQueueCalls}
            queueStatsByUuid={queueStatsByUuid}
            liveSlaByName={liveSlaByName}
            liveQueueStatsByName={liveQueueStatsByName}
            cdrByQueueUuid={cdrByQueueUuid}
            isCdrSampled={isCdrSampled}
            usersOnlineStatus={usersOnlineStatus || []}
            isLoading={isQueuesLoading}
            selectedQueueUuid={selectedQueueUuid}
            setSelectedQueueUuid={setSelectedQueueUuid}
          />
        )}
        {activeTab === 'campaign-activity' && <CampaignActivityTab />}
        {activeTab === 'agents' && (
          <AgentsTab
            agentRows={agentRows}
            usersOnlineStatus={usersOnlineStatus || []}
            activeQueueCalls={activeQueueCalls}
            queues={queues}
            isLoading={isAgentsLoading}
          />
        )}
        {activeTab === 'interactions' && <InteractionsTab selectedRange={selectedRange} />}
        {activeTab === 'dashboards' && <DashboardsTab />}
        {activeTab === 'live-interactions' && <LiveInteractionsTab />}
        {activeTab === 'callbacks' && <CallbacksTab />}
        {activeTab === 'speech-text' && <SpeechTextTab />}
        {activeTab === 'reports' && <ReportsTab selectedRange={selectedRange} />}

        {/* The wallboards predate the console language and bring their own
            layout, so they get a plain scroll container. */}
        {activeTab === 'live-wallboard' && (
          <div className="dash-legacy">
            <LiveDashboard selectedRange={selectedRange} />
          </div>
        )}
        {activeTab === 'ai-wallboard' && (
          <div className="dash-legacy">
            <AiWallboard />
          </div>
        )}
        {activeTab === 'call-queue' && (
          <div className="dash-legacy">
            <div className="p-3">
              <CallQueueContent />
            </div>
          </div>
        )}
        {activeTab === 'video-dashboard' && (
          <div className="dash-legacy">
            <VideoDashboard />
          </div>
        )}
      </div>

      {isWallboardOpen && (
        <Wallboard
          tiles={wallboardTiles}
          queues={wallboardQueues}
          onClose={() => setIsWallboardOpen(false)}
        />
      )}
    </section>
  );
};

export default Performance;
