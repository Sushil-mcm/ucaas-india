import { useMemo, useState, type ReactNode } from 'react';
import moment from 'moment';
import { AlarmClock, PhoneIncoming } from 'lucide-react';
import { useSearchParamManager } from '@/hooks/use-search-params';
import DateDropdown from '@/components/custom/date-dropdown';
import { DateFilterTypes, handleDate } from '@/components/custom/date-dropdown/constant';
import Timer from '@/components/timer';
import { useLiveContactCentre } from '@/hooks/use-live-contact-centre';
import QueuesActivityTab from './queues-activity-tab';
import CampaignActivityTab from './campaign-activity-tab';
import AgentsTab from './agents-tab';
import InteractionsTab from './interactions-tab';
import DashboardsTab from './dashboards-tab';
import LiveInteractionsTab from './live-interactions-tab';
import CallbacksTab from './callbacks-tab';
import SpeechTextTab from './speech-text-tab';
import ReportsTab from './reports-tab';
import { formatSecsToClock } from './format';
import { useAnimatedNumber } from './use-animated-number';
import { useTrend } from './use-trend';
import HeroStatCard from './hero-stat-card';
import GroupedStatCard from './grouped-stat-card';
import '@/components/mcm/mcm-page.css';

import LiveDashboard from '@/pages/dashboard/live-dashboard';
import AiWallboard from '@/pages/dashboard/ai-wallboard';
import VideoDashboard from '@/pages/dashboard/video-dashboard';
import CallQueueContent from '@/pages/dashboard/call-dashboard/Call-queue-content';
import './live-theme.css';

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
  const [dropdownVal, setDropdownVal] = useState(() => ({
    value: handleDate('Today'),
    date_type: 'Today',
    dateOptions: DateFilterTypes,
  }));
  const selectedRange = dropdownVal.value;

  /* "Today" or "Last 7 Days" says which preset is picked, not which dates
     that resolves to — this spells the actual range out next to it, the
     same way a calendar app shows both the label and the date underneath. */
  const resolvedRangeLabel = useMemo(() => {
    const from = selectedRange?.from ? moment(selectedRange.from) : null;
    const to = selectedRange?.to ? moment(selectedRange.to) : null;
    if (!from?.isValid() || !to?.isValid()) return '';
    return from.isSame(to, 'day')
      ? from.format('MMM D')
      : `${from.format('MMM D')} – ${to.format('MMM D')}`;
  }, [selectedRange?.from, selectedRange?.to]);

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

  /* Direction-of-travel for the three figures where a change matters more
     than the level: more callers waiting, calls taking longer to handle, or
     more of them abandoning are each worth surfacing as an arrow. */
  const waitingTrend = useTrend(waitingCalls.length);
  const ahtTrend = useTrend(avgHandleTime);
  const abandonTrend = useTrend(abandonRate);
  const isBreachingWait = longestWaitSecs > 120;

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

        /* Date range, division and media used to be three separately
           bordered controls sitting side by side, reading as three
           unrelated filters rather than one "what am I looking at" bar.
           One pill, divided into segments, reads as a single filter. */
        .mcm-page .perf-filter-pill {
          display:flex; align-items:center; height:36px;
          border:1px solid var(--line); border-radius:999px;
          background:var(--surface); overflow:hidden; padding:0 2px;
        }
        .mcm-page .perf-filter-pill .pf-seg {
          display:flex; align-items:center; height:100%;
          padding:0 14px; white-space:nowrap;
          font-size:12px; font-weight:600; color:var(--ink-2);
          border-left:1px solid var(--line);
        }
        .mcm-page .perf-filter-pill .pf-seg:first-child { border-left:none; padding-left:4px; }
        .mcm-page .perf-filter-pill .pf-range { font-weight:500; color:var(--ink-3, #8b8478); }
        /* The date dropdown is a react-select instance with its own control
           chrome (border, background, padding) — strip that so it sits flush
           as the pill's first segment instead of a select-box-in-a-pill. */
        .mcm-page .perf-filter-pill .custom-react-select__control {
          border:none !important; background:transparent !important;
          box-shadow:none !important; min-height:34px !important;
        }
        .mcm-page .perf-filter-pill .custom-react-select__value-container { padding-left:14px; }
        .mcm-page .perf-filter-pill .custom-react-select__indicator-separator { display:none; }
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
            <div className="perf-filter-pill">
              <DateDropdown dropdownVal={dropdownVal} setDropdownVal={setDropdownVal} />
              {resolvedRangeLabel && <span className="pf-seg pf-range">{resolvedRangeLabel}</span>}
              <span className="pf-seg">Division: All</span>
              <span className="pf-seg">Media: All</span>
            </div>
          </div>

          <div className="perf-tbar-group perf-tbar-end">
            <span className="fchip live">
              <span className="dot green pulsing" />
              Live — updates every 2s
            </span>
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
            <style>{`
            /* Waiting / Longest wait are what a supervisor triages on first —
               sized up and, past target, ringed so they're findable without
               reading every tile. Everything else groups into three denser
               cards instead of six single-metric ones. */
            .mcm-page .hero-row {
              display:grid; grid-template-columns: repeat(2, minmax(0, 1fr));
              align-items:start; gap:10px; margin-bottom:10px;
            }
            .mcm-page .hero-stat { padding:16px 18px; position:relative; }
            .mcm-page .hero-stat-icon {
              position:absolute; top:16px; right:18px;
              display:grid; place-items:center; width:44px; height:44px; border-radius:99px;
              background:var(--accent-wash); color:var(--accent-ink);
            }
            .mcm-page .hero-stat-icon-breach { background:var(--crit-wash); color:var(--crit); }
            .mcm-page .hero-stat-value-row { display:flex; align-items:baseline; gap:8px; margin-top:6px; }
            .mcm-page .hero-stat-value { font-size:38px; font-weight:800; letter-spacing:-0.03em; line-height:1; }
            .mcm-page .hero-stat-trend { font-size:18px; font-weight:800; line-height:1; }
            .mcm-page .hero-stat-trend.bad { color:var(--crit); }
            .mcm-page .hero-stat-trend.good { color:var(--live); }
            .mcm-page .hero-stat-breach {
              border-color: var(--crit);
              box-shadow: 0 0 0 1px var(--crit);
              animation: heroBreachPulse 1.8s ease-in-out infinite;
            }
            .mcm-page .hero-stat-breach .hero-stat-value { color: var(--crit); }
            @keyframes heroBreachPulse {
              0%, 100% { box-shadow: 0 0 0 1px var(--crit), 0 0 0 0 var(--crit-wash); }
              50% { box-shadow: 0 0 0 1px var(--crit), 0 0 0 8px transparent; }
            }

            .mcm-page .grouped-row {
              display:grid; grid-template-columns: repeat(1, minmax(0, 1fr));
              align-items:start; gap:10px; margin-bottom:16px;
            }
            @media (min-width: 700px) {
              .mcm-page .grouped-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            }
            .mcm-page .grouped-stat { padding:14px 16px; }
            .mcm-page .grouped-stat-row { display:flex; align-items:stretch; gap:14px; margin-top:8px; }
            .mcm-page .grouped-stat-metric { flex:1; min-width:0; }
            .mcm-page .grouped-stat-divider { width:1px; background:var(--line); flex:none; }
            .mcm-page .grouped-stat-value { display:flex; align-items:baseline; gap:5px; font-size:21px; }
            .mcm-page .grouped-stat-trend { font-size:13px; font-weight:800; }
            .mcm-page .grouped-stat-trend.bad { color:var(--crit); }
            .mcm-page .grouped-stat-trend.good { color:var(--live); }

            /* Reinforces "live" beyond the word itself — a soft glow that
               breathes with the pulsing dot, not just a static badge. */
            .mcm-page .fchip.live {
              animation: liveBadgeGlow 2.4s ease-in-out infinite;
            }
            @keyframes liveBadgeGlow {
              0%, 100% { box-shadow: 0 0 0 0 var(--live-wash); }
              50% { box-shadow: 0 0 10px 1px var(--live-wash); }
            }
          `}</style>
            <div className="hero-row">
              <HeroStatCard
                label="Waiting"
                value={String(Math.round(waitingAnimated))}
                sub={`across ${queues.length} ${queues.length === 1 ? 'queue' : 'queues'}`}
                breaching={waitingCalls.length > 5}
                trend={waitingTrend}
                trendBadWhenUp
                icon={PhoneIncoming}
              />
              <HeroStatCard
                label="Longest wait"
                value={longestWaitTimestamp ? <Timer startTime={longestWaitTimestamp} /> : '00:00'}
                sub={
                  isBreachingWait ? (
                    <span style={{ color: 'var(--crit)' }}>breaching</span>
                  ) : (
                    'within target'
                  )
                }
                breaching={isBreachingWait}
                icon={AlarmClock}
              />
            </div>
            <div className="grouped-row">
              <GroupedStatCard
                title="Service"
                primary={{
                  label: 'Service level · target 80% in 20s',
                  value: avgSla === null ? '—' : `${Math.round(slAnimated)}%`,
                  tone: slaTone(avgSla),
                }}
                secondary={{
                  label: 'Avg handle time',
                  value: avgHandleTime === null ? '—' : formatSecsToClock(ahtAnimated),
                  trend: ahtTrend,
                  trendBadWhenUp: true,
                }}
              />
              <GroupedStatCard
                title="Volume"
                primary={{
                  label: `Answered · of ${callStats.totalCalls} calls`,
                  value: String(Math.round(answeredAnimated)),
                }}
                secondary={{
                  label: abandonRate === null ? 'Abandon rate' : `Abandon · ${callStats.missedCalls} missed`,
                  value: abandonRate === null ? '—' : `${Math.round(abandonAnimated)}%`,
                  tone: abandonRate !== null && abandonRate > 5 ? 'danger' : 'default',
                  trend: abandonTrend,
                  trendBadWhenUp: true,
                }}
              />
              <GroupedStatCard
                title="Coverage"
                primary={{
                  label: `On queue · of ${agentRows.length} active`,
                  value: String(Math.round(onlineAgentsAnimated)),
                }}
                secondary={{
                  label: 'Occupancy · target 75–85%',
                  value: occupancy === null ? '—' : `${Math.round(occupancyAnimated)}%`,
                }}
              />
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
    </section>
  );
};

export default Performance;
