import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PhoneIncoming,
  AlarmClock,
  Gauge,
  Clock,
  PhoneCall,
  PhoneMissed,
  Users,
  Activity,
  TriangleAlert,
  RotateCw,
  Search,
  X,
} from 'lucide-react';
import moment from 'moment';
import './live-theme.css';
import DateDropdown, { type DateDropdownHandle } from '@/components/custom/date-dropdown';
import { DateFilterTypes, handleDate } from '@/components/custom/date-dropdown/constant';
import Timer from '@/components/timer';
import { useLiveContactCentre } from '@/hooks/use-live-contact-centre';
import { useCompanyFeatures } from '@/hooks/rbac';
import { isViewAllowedByPlan } from '@/components/custom/nav-areas';
import QueuesActivityTab from './queues-activity-tab';
import CampaignActivityTab from './campaign-activity-tab';
import AgentsTab from './agents-tab';
import FlowsTab from './flows-tab';
import InteractionsTab from './interactions-tab';
import DashboardsTab from './dashboards-tab';
import LiveInteractionsTab from './live-interactions-tab';
import CallbacksTab from './callbacks-tab';
import SpeechTextTab from './speech-text-tab';
import ReportsTab from './reports-tab';
import { Ic, McmIconSprite } from '@/components/mcm/icons';
import { formatSecsToClock } from './format';
import { useTrend } from './use-trend';
import HeroStatCard from './hero-stat-card';
import PerfStatCard from './stat-card';
import AnimatedValue from './animated-value';
import DataFreshness from './data-freshness';
import '@/components/mcm/mcm-page.css';

import LiveDashboard from '@/pages/dashboard/live-dashboard';
import AiWallboard from '@/pages/dashboard/ai-wallboard';
import VideoDashboard from '@/pages/dashboard/video-dashboard';
import CallQueueContent from '@/pages/dashboard/call-dashboard/Call-queue-content';

/**
 * Wallboards used to hang off Home as a second tab strip, which put a "Home"
 * tab inside Home. They are performance surfaces, so they live here.
 *
 * The `feature` below is the plan entitlement each one needs. It used to be
 * declared here and read by nothing — the comment claimed each wallboard was
 * "still gated on the plan feature that gated it before", but the only
 * enforcement was in the rail, which hides the link. `?view=ai-wallboard`
 * typed, pasted or bookmarked rendered the AI wallboard on any plan.
 *
 * `isViewAllowedByPlan` is the same function the rail asks, so the link and
 * the view can no longer disagree. The labels live in `nav-areas.ts` with the
 * rest of the rail, so they are not repeated here.
 */
const WALLBOARD_TABS = [
  { key: 'live-wallboard', feature: undefined },
  { key: 'ai-wallboard', feature: 'ai' },
  { key: 'call-queue', feature: 'queue' },
  { key: 'video-dashboard', feature: 'video' },
] as const;

const TABS = [
  { key: 'queues-activity', label: 'Queues Activity' },
  { key: 'campaign-activity', label: 'Campaign Activity' },
  { key: 'agents', label: 'Agents' },
  { key: 'interactions', label: 'Interactions' },
  { key: 'flows', label: 'Flows' },
  { key: 'dashboards', label: 'Dashboards' },
  { key: 'live-interactions', label: 'Live Interactions' },
  { key: 'callbacks', label: 'Callbacks' },
  { key: 'speech-text', label: 'Speech & Text' },
  { key: 'reports', label: 'Reports' },
];

const SHOW_KPI_HEADER_TABS = new Set(['queues-activity', 'campaign-activity', 'dashboards']);

/**
 * The views that actually read `useLiveContactCentre`.
 *
 * The hook polls queue configuration, the user roster and two REST reports. It
 * used to run on all fourteen views because it is called at page level — so
 * Reports, Speech & Text, Flows, Callbacks and every wallboard were polling
 * queue and roster data none of them display. These four are the views that
 * either show the KPI band or render queue/agent collections.
 */
const LIVE_DATA_TABS = new Set([
  'queues-activity',
  'campaign-activity',
  'dashboards',
  'agents',
]);

const slaTone = (sla: number | null): 'default' | 'success' | 'warning' | 'danger' => {
  if (sla === null) return 'default';
  if (sla >= 80) return 'success';
  if (sla >= 60) return 'warning';
  return 'danger';
};

const Performance = () => {
  const { view: viewParam } = useParams<{ view: string }>();
  const navigate = useNavigate();
  const { companyPlanFeatures } = useCompanyFeatures();

  /* Wallboards the plan does not include are removed from the set of valid
     views, so an unentitled `?view=` resolves to the default the same way a
     misspelled one does. This is the page half of the gate the rail already
     applies to its links. */
  const allowedWallboardKeys = useMemo(
    () =>
      WALLBOARD_TABS.filter((tab) =>
        isViewAllowedByPlan({ feature: tab.feature }, companyPlanFeatures),
      ).map((tab) => tab.key as string),
    [companyPlanFeatures],
  );
  const allTabKeys = useMemo(
    () => [...TABS.map((tab) => tab.key), ...allowedWallboardKeys],
    [allowedWallboardKeys],
  );
  const activeTab =
    viewParam && allTabKeys.includes(viewParam) ? viewParam : TABS[0].key;
  useEffect(() => {
    if (viewParam && viewParam !== activeTab) navigate(`/performance/${activeTab}`, { replace: true });
  }, [viewParam, activeTab]);
  /* Centralized global search — one box in the parent toolbar that every
     sub-tab reads instead of each view growing its own. Kept as a single
     string handed straight down to each tab's own TableManager `search`
     prop (client-side via `clientSideSearch` for the two tabs backed by an
     already-fetched in-memory array — Queues, Agents — server-side via the
     generic `search` list param everywhere else), so the debounce and the
     "no matches" empty state are the one TableManager already provides
     rather than a second copy of either here. Existing per-page search
     inputs (Campaigns, Call History) are left in place per Neel's review —
     this box is additive, not a replacement, until that's reviewed. */
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedQueueUuid, setSelectedQueueUuid] = useState<string | null>(null);
  const [dropdownVal, setDropdownVal] = useState(() => ({
    value: handleDate('Today'),
    date_type: 'Today',
    dateOptions: DateFilterTypes,
  }));
  const dateDropdownRef = useRef<DateDropdownHandle>(null);
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

  /**
   * The toolbar (filters, live status pill, Wallboard/My dashboards) is
   * rendered once here, unconditionally, above every tab's own content — so
   * `perf-warm-toolbar` (live-theme.css) belongs on this parent rather than
   * duplicated in each tab component. It flags the toolbar bar itself with
   * the flat light tint the left rail uses for its own panel; approved
   * after review, it now applies across every Performance tab, not just
   * Live/Callbacks/Campaigns, which is what previously had it individually.
   */
  useEffect(() => {
    document.body.classList.add('perf-warm-toolbar');
    return () => document.body.classList.remove('perf-warm-toolbar');
  }, []);

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
    failedSources,
    hasSourceError,
    lastUpdatedAt,
    retryFailedSources,
  } = useLiveContactCentre(selectedRange, { enabled: LIVE_DATA_TABS.has(activeTab) });

  /* The seven `useAnimatedNumber` calls that used to sit here have moved into
     `AnimatedValue`, which each card renders. They ran at page level, so every
     animation frame re-rendered the whole page to repaint one tile. */

  // Trends read off the real polled value, not the animated display value —
  // the animated one is mid-flight for ~1.8s after every tick, which would
  // flip the arrow on every render instead of only when the number actually
  // moves between polls.
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
      {/* `<Ic n="grid" />` on the "My dashboards" button below resolves
          against `#mcmp-grid`, which only exists once this sprite's <defs>
          is mounted somewhere on the page — every other page using `Ic`
          (Directory, Campaign, Admin Settings) mounts it the same way.
          Without it the icon renders as an empty, invisible <svg> that
          still reserves its layout box, showing up as unexplained blank
          space to the left of the button's text. */}
      <McmIconSprite />
      {/* The header row draws from three sources — the app's own date dropdown,
          the design system's chips and its buttons — each with a different
          control height and border colour, which is what made the row look
          unsettled. This puts them on one baseline. */}

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
              <DateDropdown
                ref={dateDropdownRef}
                dropdownVal={dropdownVal}
                setDropdownVal={setDropdownVal}
                // The default 'inline' placement rendered the From/To
                // date cards, clear button and Apply button in the same
                // row as the Division/Media segments the moment "Date
                // Range" was picked — a lot to fit on one line before it
                // even got to those segments. 'bottom' expands that group
                // into its own floating card under the toolbar instead,
                // leaving the pill itself untouched.
                customPickerPlacement="bottom"
              />
              {resolvedRangeLabel &&
                (dropdownVal.date_type === 'Custom' ? (
                  // A custom range has a panel to go back and edit — the
                  // preset select beside it still works too, but re-picking
                  // "Date Range" from an already-"Date Range" select takes
                  // an extra click a supervisor glancing at "Sep 2 – Sep 3"
                  // shouldn't need.
                  <span
                    className="pf-seg pf-range pf-range-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => dateDropdownRef.current?.openRangePanel()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        dateDropdownRef.current?.openRangePanel();
                      }
                    }}
                  >
                    {resolvedRangeLabel}
                  </span>
                ) : (
                  <span className="pf-seg pf-range">{resolvedRangeLabel}</span>
                ))}
              <span className="pf-seg">Division: All</span>
              <span className="pf-seg">Media: All</span>
            </div>
          </div>

          {/* Centralized global search — sits in the toolbar's own empty
              middle space between the filter pill and the live-status/
              dashboards controls. `perf-tbar-search` (live-theme.css) pins
              its height to the same 36px every other toolbar control uses. */}
          <div className="perf-tbar-search">
            <Search className="perf-tbar-search-icon" />
            <input
              type="text"
              value={globalSearchQuery}
              onChange={(event) => setGlobalSearchQuery(event.target.value)}
              placeholder="Search queues, agents, calls…"
              aria-label="Search across the active Performance view"
            />
            {globalSearchQuery && (
              <button
                type="button"
                className="perf-tbar-search-clear"
                onClick={() => setGlobalSearchQuery('')}
                aria-label="Clear search"
              >
                <X />
              </button>
            )}
          </div>

          <div className="perf-tbar-group perf-tbar-end">
            {/* The hardcoded "updates every 2s" badge is replaced by a real
                freshness reading (data-freshness.tsx). "My dashboards" stays
                beside it — a supervisor already here for the live figures
                gets a direct shortcut into their saved dashboards without
                dropping back to the rail. */}
            <DataFreshness updatedAt={lastUpdatedAt} />
            <button
              type="button"
              className="btn primary"
              onClick={() => navigate('/performance/dashboards')}
            >
              <Ic n="grid" />
              My dashboards
            </button>
          </div>
        </div>
      </div>

      {SHOW_KPI_HEADER_TABS.has(activeTab) &&
        !(activeTab === 'queues-activity' && selectedQueueUuid) && (
          <div className="page-band">
            <style>{`
            /* Waiting / Longest wait are what a supervisor triages on first —
               sized up and, past target, ringed so they're findable without
               reading every tile. The rest are individual single-metric
               tiles (same style as Performance ▸ Agents' KPI strip), all
               eight sharing one row. */
            .mcm-page .hero-row {
              display:grid; grid-template-columns: repeat(2, minmax(0, 1fr));
              align-items:stretch; gap:10px; padding-top:12px;
            }
            @media (min-width: 900px) {
              .mcm-page .hero-row { grid-template-columns: repeat(8, minmax(0, 1fr)); }
            }
            .mcm-page .hero-stat { padding:16px 18px; }
            .mcm-page .hero-stat-icon {
              display:grid; place-items:center; width:22px; height:22px; flex:none; border-radius:99px;
              background:var(--accent-wash); color:var(--accent-ink);
            }
            .mcm-page .hero-stat-icon-breach { background:var(--crit-wash); color:var(--crit); }
            .mcm-page .hero-stat-value-row {
              display:flex; align-items:baseline; gap:8px; margin-top:6px;
            }
            /* .hero-row .stat .v below (heading-to-value spacing) also
               matches this span, since it's a .v nested inside .stat — but
               flex containers don't collapse margins with their items, so
               that margin-top would add unwanted extra space inside the
               row on top of the row's own margin-top. The row already
               supplies the 6px gap from the heading; the span itself needs
               none. */
            .mcm-page .hero-row .stat .hero-stat-value-row .v {
              margin-top: 0;
            }
            .mcm-page .hero-stat-value { font-size:38px; font-weight:800; letter-spacing:-0.03em; line-height:1; }
            .mcm-page .hero-stat-trend { font-size:18px; font-weight:800; line-height:1; }
            .mcm-page .hero-stat-trend.bad { color:var(--crit); }
            .mcm-page .hero-stat-trend.good { color:var(--live); }
            .mcm-page .hero-stat-breach { box-shadow: 0 0 0 1px var(--crit), 0 0 0 0 var(--crit-wash); animation: hero-pulse 2s ease-in-out infinite; }
            @keyframes hero-pulse {
              0%, 100% { box-shadow: 0 0 0 1px var(--crit), 0 0 0 0 var(--crit-wash); }
              50% { box-shadow: 0 0 0 1px var(--crit), 0 0 0 8px transparent; }
            }
            /* Every KPI tile's heading always wraps to two lines (each
               label below carries its own \n) and its bottom line always
               stays to one, so the value/sub start at the same row across
               every card regardless of label length. Heading/bottom-line
               colour (grey normally, crit red together when a hero card
               breaches) lives in queues-theme.css, which needs the
               body.perf-warm-backdrop chain to outrank this same rule. */
            .mcm-page .hero-row .stat .k {
              white-space: pre-line; line-height: 1.3;
            }
            /* Matches HeroStatCard's own hero-stat-value-row margin-top,
               so heading-to-number spacing is 6px on every card instead of
               the plain PerfStatCard tiles using .stat .v's base 5px. */
            .mcm-page .hero-row .stat .v {
              margin-top: 6px;
            }
            .mcm-page .hero-row .stat .d {
              display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
            }

            .mcm-page .stat-trend { font-size:13px; font-weight:800; margin-left:5px; }
            .mcm-page .stat-trend.bad { color:var(--crit); }
            .mcm-page .stat-trend.good { color:var(--live); }

          `}</style>
            {/* A feed that failed used to be invisible: every query defaults to
                an empty list, so an unreachable API produced Waiting 0,
                Answered 0 — the same screen a genuinely quiet contact centre
                produces. Naming what could not be read, and offering to try
                again, is the difference between "nobody is waiting" and "we
                cannot tell you". */}
            {hasSourceError && (
              <div className="hero-error" role="alert">
                <TriangleAlert className="hero-error-icon" />
                <div className="hero-error-body">
                  <p className="hero-error-t">Some figures below could not be read</p>
                  <p className="hero-error-d">
                    {failedSources.length} of 5 sources failed ({failedSources.join(', ')}). The
                    cards they feed are showing the last value received, which may be out of date.
                  </p>
                </div>
                <button type="button" className="btn sm hero-error-retry" onClick={retryFailedSources}>
                  <RotateCw className="hero-error-retry-icon" />
                  Try again
                </button>
              </div>
            )}
            <div className="hero-row">
              <HeroStatCard
                label={'Waiting\nCalls'}
                value={
                  <AnimatedValue value={waitingCalls.length} format={(n) => String(Math.round(n))} />
                }
                sub={`across ${queues.length} ${queues.length === 1 ? 'queue' : 'queues'}`}
                breaching={waitingCalls.length > 5}
                trend={waitingTrend}
                trendBadWhenUp
                icon={PhoneIncoming}
              />
              <HeroStatCard
                label={'Longest\nWait'}
                value={longestWaitTimestamp ? <Timer startTime={longestWaitTimestamp} /> : '00:00'}
                sub={isBreachingWait ? 'breaching' : 'within target'}
                breaching={isBreachingWait}
                icon={AlarmClock}
              />
              <PerfStatCard
                label={'Service\nLevel'}
                value={<AnimatedValue value={avgSla} format={(n) => `${Math.round(n)}%`} />}
                sub="target 80% in 20s"
                icon={Gauge}
                tone={slaTone(avgSla)}
              />
              <PerfStatCard
                label={'Handle\nTime'}
                value={
                  <>
                    <AnimatedValue value={avgHandleTime} format={formatSecsToClock} />
                    {ahtTrend !== 'flat' && (
                      <span className={`stat-trend${ahtTrend === 'up' ? ' bad' : ' good'}`}>
                        {ahtTrend === 'up' ? '↑' : '↓'}
                      </span>
                    )}
                  </>
                }
                sub="Team average"
                icon={Clock}
              />
              <PerfStatCard
                label={'Answered\nCalls'}
                value={<AnimatedValue value={totals.answered} format={(n) => String(Math.round(n))} />}
                sub={`of ${callStats.totalCalls} calls`}
                icon={PhoneCall}
              />
              <PerfStatCard
                label={'Abandon\nRate'}
                value={
                  <>
                    <AnimatedValue value={abandonRate} format={(n) => `${Math.round(n)}%`} />
                    {abandonTrend !== 'flat' && (
                      <span className={`stat-trend${abandonTrend === 'up' ? ' bad' : ' good'}`}>
                        {abandonTrend === 'up' ? '↑' : '↓'}
                      </span>
                    )}
                  </>
                }
                sub={`${callStats.missedCalls} missed`}
                icon={PhoneMissed}
                tone={abandonRate !== null && abandonRate > 5 ? 'danger' : 'default'}
              />
              <PerfStatCard
                label={'On\nQueue'}
                value={
                  <AnimatedValue value={onlineAgentsCount} format={(n) => String(Math.round(n))} />
                }
                sub={`of ${agentRows.length} active`}
                icon={Users}
              />
              <PerfStatCard
                label={'Occupancy\nRate'}
                value={<AnimatedValue value={occupancy} format={(n) => `${Math.round(n)}%`} />}
                sub="target 75–85%"
                icon={Activity}
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
            globalSearch={globalSearchQuery}
          />
        )}
        {activeTab === 'campaign-activity' && (
          <CampaignActivityTab globalSearch={globalSearchQuery} />
        )}
        {activeTab === 'agents' && (
          <AgentsTab
            agentRows={agentRows}
            usersOnlineStatus={usersOnlineStatus || []}
            activeQueueCalls={activeQueueCalls}
            queues={queues}
            isLoading={isAgentsLoading}
            globalSearch={globalSearchQuery}
          />
        )}
        {activeTab === 'interactions' && (
          <InteractionsTab selectedRange={selectedRange} globalSearch={globalSearchQuery} />
        )}
        {activeTab === 'flows' && <FlowsTab globalSearch={globalSearchQuery} />}
        {activeTab === 'dashboards' && <DashboardsTab />}
        {activeTab === 'live-interactions' && (
          <LiveInteractionsTab globalSearch={globalSearchQuery} />
        )}
        {activeTab === 'callbacks' && <CallbacksTab globalSearch={globalSearchQuery} />}
        {activeTab === 'speech-text' && <SpeechTextTab />}
        {activeTab === 'reports' && (
          <ReportsTab
            selectedRange={selectedRange}
            dropdownVal={dropdownVal}
            setDropdownVal={setDropdownVal}
            globalSearch={globalSearchQuery}
          />
        )}

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
            {/* Was `pt-7`, matching the other boards' 28px line — but this
                tab no longer opens on a full toolbar row (search/refresh are
                gone), just the queue-count pill, so that same offset now
                reads as too much air above it. */}
            <div className="px-3 pt-3 pb-3">
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
