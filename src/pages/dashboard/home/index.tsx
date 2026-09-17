import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { useUser } from '@/hooks/use-user';
import { fetchPhone } from '@/services/api';
import { Ic, McmIconSprite, type McmIconName } from '@/components/mcm/icons';
import Timer from '@/components/timer';
import { useConsoleDialer } from '@/pages/phone/console/dial-number';
import { useLiveContactCentre } from '@/hooks/use-live-contact-centre';

/* Today's voicemail and missed-call counts. Held as its own number rather than
 * a multiple of the contact-centre poll: these two only need to keep up with
 * how fast a counter moves, and tying them to the live-board clock meant
 * retuning that clock silently retuned these too. The repo this file is kept
 * in step with still writes `KPI_REFRESH_MS * 15`, which reads as 30s there
 * and would be 2.5 minutes here — keep this constant when porting. */
const HOME_COUNTER_REFRESH_MS = 30000;
import { serviceLevelBand } from '@/lib/queue-series';
import { useAnimatedNumber } from '@/pages/performance/use-animated-number';
import { formatSecsToClock } from '@/pages/performance/format';
import buildQueueRows from '@/pages/performance/queue-rows';
import buildAgentRows, { AGENT_STATES } from '@/pages/performance/agent-rows';
import {
  getMonitoringCallTimestamp,
  getMonitoringContactValue,
  isMonitoringCallForMember,
} from '@/pages/monitoring/live-call-helpers';
import { handleDate } from '@/components/custom/date-dropdown/constant';
import { buildAttentionItems } from './attention';
import QuickActions from './quick-actions';
import CommunicationOverview from './communication-overview';
import { LinearMeter, RadialGauge, SparkBars, SparkLine, StatusDonut } from './charts';
import { useKpiHistory } from './use-kpi-history';
import '@/components/mcm/mcm-page.css';
import '@/pages/dashboard/dashboard.css';
import './home-v2.css';

/**
 * MCM Unified Console — Home.
 *
 * The artifact's Home is a shift opener, not a dashboard: who you are, what is
 * on fire, how your own day is going, and one click to the phone. It is built
 * from the same platform components as Performance (`components/mcm/mcm-page.css`)
 * so the two read as one product.
 *
 * Everything on screen is live: the KPI strip and the attention list come from
 * the same queue/agent feeds Performance uses (`useLiveContactCentre`), "Your
 * day so far" from the signed-in user's own agent report, the digest counts
 * from the call-log API. The one panel the artifact fills that the platform has
 * no service behind — the Copilot overnight summary — says so rather than
 * inventing a summary.
 */

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '—';

const round = (value: number) => String(Math.round(value));

const STATE_CLASS: Record<string, string> = {
  'On Call': 'state busy',
  Ringing: 'state acw',
  'On Hold': 'state acw',
  Available: 'state q',
  Busy: 'state busy',
  'Do Not Disturb': 'state busy',
  Offline: 'state away',
};

/* Same palette as the .state pills above (--live/--accent/--warn/--ink-4),
   as flat colors rather than classes — the segmented distribution bar
   paints each slice with these directly instead of a background wash. */
const STATE_COLOR: Record<string, string> = {
  'On Call': 'var(--accent)',
  Ringing: 'var(--warn)',
  'On Hold': 'var(--warn)',
  Available: 'var(--live)',
  Busy: 'var(--accent)',
  'Do Not Disturb': 'var(--accent-ink)',
  Offline: 'var(--ink-4)',
};

/** Service level, on the artifact's thresholds: 85+ good, 80+ neutral, below that bad. */
const slTag = (sla: number | null, targetPct?: number | null) => {
  if (sla === null) return <span style={{ color: 'var(--ink-4)' }}>—</span>;
  const tone = sla >= 85 ? 'pos' : sla >= 80 ? 'neu' : 'neg';
  return (
    <span className="sl-cell">
      <span className={`tag ${tone}`}>{Math.round(sla)}%</span>
      {targetPct ? <span className="sl-target">/{targetPct}%</span> : null}
    </span>
  );
};

/** Free capacity in the queue right now -- how much of its roster is
 * actually available to take the next call, not just headcount. Read as
 * risk of the wait growing, not as the SL tone above it: a fully-staffed
 * but fully-busy queue (0 free) is the same risk regardless of its SL. */
const occupancyBar = (available: number, membersCount: number) => {
  const pct = membersCount > 0 ? Math.round((available / membersCount) * 100) : 0;
  const tone = pct >= 60 ? 'pos' : pct >= 30 ? 'warn' : 'neg';
  const color = tone === 'pos' ? 'var(--live)' : tone === 'warn' ? 'var(--warn)' : 'var(--crit)';
  return (
    <span className="occ-cell">
      <span className="occ-label">
        {available}
        <span style={{ color: 'var(--ink-4)' }}>/{membersCount}</span>
      </span>
      <span className="occ-bar">
        <span className="occ-fill" style={{ width: `${pct}%`, background: color }} />
      </span>
    </span>
  );
};

/** Same thresholds as slTag, as a plain status dot for the queue name cell --
 * lets you read "which queue is hurting" down the row labels themselves,
 * before your eye even reaches the SL column. */
const slDotClass = (sla: number | null) =>
  sla === null ? 'neu' : sla >= 85 ? 'pos' : sla >= 80 ? 'neu' : 'neg';

/** First-letter avatar chip for a caller name -- coloured by a stable hash
 * of the name so the same customer keeps the same colour call to call. */
const AVATAR_COLORS = ['#f2994a', '#2f9e6e', '#3f7bd6', '#c2593f', '#8a63d2', '#c9962f'];
const nameAvatar = (name: string, label?: string, size: number = 22) => {
  const shown = label || name.trim().charAt(0).toUpperCase() || '?';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return (
    <span
      className="tbl-avatar"
      style={{
        background: `${color}22`,
        color,
        width: size,
        height: size,
        fontSize: size <= 22 ? 10.5 : 12,
      }}
    >
      {shown}
    </span>
  );
};

type Kpi = {
  key: string;
  title: string;
  subtitle: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Donut tiles only -- a short "of N" caption right under the value
   * itself, alongside the gauge, when the metric has a natural fraction
   * (On Queue's 1 of 15). Skipped for a pure percentage with nothing to
   * count against (On a Call Now). */
  compactSub?: ReactNode;
  tone?: 'good' | 'warnv' | 'bad';
  // Service level only: the linear rail reads value against this real target.
  meter?: { value: number; target: number };
  icon: McmIconName;
  color: string;
  /** 0-100 for the donut tiles (On Queue, On a Call Now) -- derived from
   * the same number already on the tile. */
  progressPct: number;
  /** Which mini chart this tile draws below its value -- bar/line read the
   * tile's own rolling history (`useKpiHistory`); meter and donut read a
   * single current value, no history needed. */
  chartType: 'bar' | 'line' | 'meter' | 'donut';
  /** The raw number sampled into that rolling history -- `null` skips
   * sampling (e.g. service level with nothing configured yet). */
  rawValue: number | null;
  /** Which way this specific metric improving actually points -- fewer
   * people waiting is good, more calls answered is good -- so the trend
   * chip's colour reflects whether the real change was an improvement,
   * not just whether the number went up. */
  goodDirection: 'up' | 'down';
};

const Home = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { dial, isRegistered } = useConsoleDialer();

  // Home always reads today; Performance keeps the date picker.
  const today = useMemo(() => handleDate('Today'), []);

  const live = useLiveContactCentre(today);
  const {
    queues,
    agentRows,
    activeQueueCalls,
    waitingCalls,
    longestWaitTimestamp,
    longestWaitSecs,
    liveSlaByName,
    usersOnlineStatus,
    totals,
    onlineAgentsCount,
    serviceLevel,
    avgHandleTime,
    abandonRate,
    agentsOnCallPct,
  } = live;

  const firstName = String(user?.user_info?.first_name || '').trim();
  const myExtension = String(user?.user_info?.extension || '').trim();
  const myName =
    `${user?.user_info?.first_name || ''} ${user?.user_info?.last_name || ''}`.trim() || 'you';

  /* ── the queues this user is a member of ─────────────────────────────── */
  const myQueues = useMemo(() => {
    const keys = [user?.user_info?.uuid, user?.user_info?.user_uuid, myExtension]
      .filter(Boolean)
      .map((value) => String(value));
    if (!keys.length) return [];
    return queues.filter((queue) => queue.memberKeys.some((key) => keys.includes(key)));
  }, [queues, user, myExtension]);

  /* ── every queue's live row, from the derivation Performance uses ────── */
  const queueRows = useMemo(
    () =>
      buildQueueRows({
        queues,
        activeQueueCalls,
        queueStatsByUuid: live.queueStatsByUuid,
        liveSlaByName,
        liveQueueStatsByName: live.liveQueueStatsByName,
        cdrByQueueUuid: live.cdrByQueueUuid,
      }).sort(
        (a, b) =>
          b.waiting - a.waiting || b.interacting - a.interacting || a.name.localeCompare(b.name),
      ),
    [live, queues, activeQueueCalls, liveSlaByName],
  );

  /* ── the floor, from the derivation Performance ▸ Agents uses ────────── */
  const liveAgents = useMemo(
    () => buildAgentRows({ agentRows, queues, usersOnlineStatus, activeQueueCalls }),
    [agentRows, queues, usersOnlineStatus, activeQueueCalls],
  );

  /* Only states anyone is actually in — an empty bar teaches nothing. */
  const stateDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    liveAgents.forEach((agent) => counts.set(agent.status, (counts.get(agent.status) || 0) + 1));
    const total = liveAgents.length || 1;
    return AGENT_STATES.filter((state) => counts.get(state)).map((state) => ({
      state,
      count: counts.get(state) || 0,
      pct: Math.round(((counts.get(state) || 0) / total) * 100),
    }));
  }, [liveAgents]);

  /* The bar is a picture, so it needs saying in words for anyone who cannot see
     it — the same split, read out. */
  const rosterSummary = useMemo(
    () =>
      stateDistribution.length
        ? `Roster: ${stateDistribution.map((s) => `${s.state} ${s.count} (${s.pct}%)`).join(', ')}`
        : 'Nobody on the roster',
    [stateDistribution],
  );

  /* Busiest first: on a call, then ringing, then everyone else by handled. */
  const agentsByActivity = useMemo(
    () =>
      [...liveAgents].sort(
        (a, b) =>
          Number(b.isOnCall) - Number(a.isOnCall) ||
          Number(b.isOnline) - Number(a.isOnline) ||
          b.handledToday - a.handledToday ||
          a.name.localeCompare(b.name),
      ),
    [liveAgents],
  );

  /* ── what is on the wire this second ─────────────────────────────────── */
  const interactions = useMemo(
    () =>
      (activeQueueCalls || [])
        .map((call: any) => {
          const forwardValue = String(
            call?.queue_uuid || call?.forward_value || call?.campaign_uuid || '',
          );
          const queue = forwardValue ? queues.find((q) => q.uuid === forwardValue) : null;
          const agent = liveAgents.find(
            (row) => row.extension && isMonitoringCallForMember(call, row.extension),
          );
          const startedAt = getMonitoringCallTimestamp(call);
          return {
            id: String(call?.uuid || call?.call_uuid || call?.sipcall_id || startedAt || ''),
            startedAt,
            customer: getMonitoringContactValue(call),
            number: call?.caller_number || call?.called_number || call?.did_number || '—',
            queue: queue?.name || '—',
            agent: agent?.name || 'Unassigned',
            state: String(call?.status || 'waiting').replace(/_/g, ' '),
            waiting: String(call?.status || '') === 'waiting',
          };
        })
        // longest-running first: the one most likely to need a supervisor
        .sort((a, b) => (a.startedAt ?? Infinity) - (b.startedAt ?? Infinity)),
    [activeQueueCalls, queues, liveAgents],
  );

  /* ── the signed-in user's own row in today's agent report ────────────── */
  const me = useMemo(
    () =>
      agentRows.find((agent: any) => String(agent?.extension || '') === myExtension) ||
      agentRows.find(
        (agent: any) =>
          `${agent?.first_name || ''} ${agent?.last_name || ''}`.trim().toLowerCase() ===
          myName.toLowerCase(),
      ) ||
      null,
    [agentRows, myExtension, myName],
  );
  const myStats = me?.stats || {};
  const myHandled = Number(myStats.answered_calls) || 0;
  const myTalkMinutes = Number(myStats.time_on_calls_minutes) || 0;
  const myAhtSecs = myHandled ? (myTalkMinutes * 60) / myHandled : null;

  /* ── digest counts, straight off the call log ────────────────────────── */
  const { data: voicemails = 0 } = useQuery({
    queryKey: ['homeVoicemailCount', today],
    queryFn: () =>
      fetchPhone({
        page: 1,
        limit: 1,
        type: 'voicemail',
        filter: [],
        filter_date: { from: today?.from, to: today?.to },
        sort: { key: 'start_stamp', desc: true },
      }),
    select: (res: any) => Number(res?.data?.data?.result?.totalRecords) || 0,
    refetchInterval: HOME_COUNTER_REFRESH_MS,
  });

  const { data: missedRows = [] } = useQuery({
    queryKey: ['homeMissedCalls', today],
    queryFn: () =>
      fetchPhone({
        page: 1,
        limit: 25,
        filter: [{ key: 'direction', value: 'Missed' }],
        filter_date: { from: today?.from, to: today?.to },
        sort: { key: 'start_stamp', desc: true },
      }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
    refetchInterval: HOME_COUNTER_REFRESH_MS,
  });

  /* ── quick dial: the people you actually call ────────────────────────── */
  const quickDial = useMemo<{ name: string; extension: string; online: boolean }[]>(
    () =>
      agentRows
        .filter((agent: any) => agent?.extension && String(agent.extension) !== myExtension)
        .slice(0, 6)
        .map((agent: any) => {
          const name = `${agent?.first_name || ''} ${agent?.last_name || ''}`.trim() || 'Teammate';
          const online = usersOnlineStatus.some(
            (u: any) => String(u?.userId) === String(agent.extension) && u?.online,
          );
          return { name, extension: String(agent.extension), online };
        }),
    [agentRows, myExtension, usersOnlineStatus],
  );

  /* ── attention list ──────────────────────────────────────────────────── */
  const attention = useMemo(
    () =>
      buildAttentionItems({
        queues,
        activeQueueCalls,
        waitingCalls,
        longestWaitSecs,
        liveSlaByName,
        usersOnlineStatus,
        onlineAgentsCount,
      }),
    [
      queues,
      activeQueueCalls,
      waitingCalls,
      longestWaitSecs,
      liveSlaByName,
      usersOnlineStatus,
      onlineAgentsCount,
    ],
  );

  /* ── KPI strip — same eight figures Performance leads with ───────────── */
  const waitingAnimated = useAnimatedNumber(waitingCalls.length);
  const answeredAnimated = useAnimatedNumber(totals.answered);
  const onlineAgentsAnimated = useAnimatedNumber(onlineAgentsCount);
  const slaAnimated = useAnimatedNumber(serviceLevel.percent);
  const abandonAnimated = useAnimatedNumber(abandonRate);
  const ahtAnimated = useAnimatedNumber(avgHandleTime);
  const onCallAnimated = useAnimatedNumber(agentsOnCallPct);

  /* Real rolling history for the sparklines/trend chips below -- see
     `useKpiHistory` for why this exists instead of a report endpoint. */
  const { getHistory, getTrend } = useKpiHistory({
    waiting: waitingCalls.length,
    longest: longestWaitSecs,
    sla: serviceLevel.percent,
    answered: totals.answered,
    abandon: abandonRate,
    aht: avgHandleTime,
    onqueue: onlineAgentsCount,
    agentsOnCall: agentsOnCallPct,
    needsAttention: attention.length,
  });

  const kpis: Kpi[] = [
    {
      key: 'waiting',
      title: 'Waiting Now',
      subtitle: 'Calls in queue',
      value: round(waitingAnimated),
      sub: `across ${queues.length} ${queues.length === 1 ? 'queue' : 'queues'}`,
      tone: waitingCalls.length > 5 ? 'bad' : undefined,
      icon: 'headset',
      color: '#7c3aed',
      progressPct: Math.min(100, (waitingCalls.length / 10) * 100),
      chartType: 'bar',
      rawValue: waitingCalls.length,
      goodDirection: 'down',
    },
    {
      key: 'longest',
      title: 'Longest Wait',
      subtitle: 'Current longest wait time',
      value: longestWaitTimestamp ? <Timer startTime={longestWaitTimestamp} /> : '00:00',
      sub: longestWaitSecs > 120 ? 'past the breach mark' : 'within target',
      tone: longestWaitSecs > 120 ? 'bad' : undefined,
      icon: 'clock',
      color: 'var(--accent)',
      progressPct: Math.min(100, (longestWaitSecs / 300) * 100),
      chartType: 'line',
      rawValue: longestWaitSecs,
      goodDirection: 'down',
    },
    {
      key: 'sla',
      title: 'Service Level',
      subtitle: 'Calls answered in target',
      value: serviceLevel.percent === null ? '—' : `${Math.round(slaAnimated)}%`,
      /* The real goal, from the queues' own settings: one line when they all
         ask for the same thing, "per-queue targets" when they do not. */
      sub: serviceLevel.targetText,
      /* The one figure on the strip with a number to be judged against, so it
         is the one that gets a track. Both values are real: the level comes
         from the same feed as the figure above it, the target is the 80% the
         sub-line already quotes. */
      /* An idle queue (no calls yet today) still has a real target from its
         own settings -- shown at 0% filled rather than leaving the tile's
         whole chart area blank until the first call comes in. */
      meter:
        serviceLevel.targetPercent === null
          ? undefined
          : {
              value: serviceLevel.percent === null ? 0 : Math.round(slaAnimated),
              target: serviceLevel.targetPercent,
            },
      tone: (() => {
        const band = serviceLevelBand(serviceLevel.percent, serviceLevel.targetPercent);
        return band === null ? undefined : band === 'warn' ? 'warnv' : band;
      })(),
      icon: 'target',
      color: 'var(--live)',
      progressPct: serviceLevel.percent === null ? 0 : Math.round(slaAnimated),
      chartType: 'meter',
      rawValue: serviceLevel.percent,
      goodDirection: 'up',
    },
    {
      key: 'answered',
      title: 'Answered Today',
      subtitle: 'Total calls answered',
      value: round(answeredAnimated),
      sub: 'all queues',
      icon: 'phone',
      color: '#2563eb',
      progressPct: Math.min(100, (totals.answered / 200) * 100),
      chartType: 'bar',
      rawValue: totals.answered,
      goodDirection: 'up',
    },
    {
      key: 'abandon',
      title: 'Abandon Rate',
      subtitle: 'Calls dropped before answer',
      value: abandonRate === null ? '—' : `${Math.round(abandonAnimated)}%`,
      sub: abandonRate === null ? 'no calls in range' : 'of calls today',
      tone: abandonRate !== null && abandonRate > 5 ? 'bad' : undefined,
      icon: 'miss',
      color: 'var(--crit, #d32f2f)',
      progressPct: abandonRate === null ? 0 : Math.round(abandonAnimated),
      chartType: 'bar',
      rawValue: abandonRate,
      goodDirection: 'down',
    },
    {
      key: 'aht',
      title: 'Avg Handle Time',
      subtitle: 'Average call duration',
      value: avgHandleTime === null ? '—' : formatSecsToClock(ahtAnimated),
      icon: 'bolt',
      color: '#0ea5e9',
      progressPct: avgHandleTime === null ? 0 : Math.min(100, (avgHandleTime / 600) * 100),
      chartType: 'line',
      rawValue: avgHandleTime,
      goodDirection: 'down',
    },
    {
      key: 'onqueue',
      title: 'On Queue',
      subtitle: 'Agents currently in queue',
      value: round(onlineAgentsAnimated),
      compactSub: `of ${agentRows.length}`,
      sub: `of ${agentRows.length} on the roster`,
      icon: 'users',
      color: '#7c3aed',
      progressPct: agentRows.length ? (onlineAgentsCount / agentRows.length) * 100 : 0,
      chartType: 'donut',
      rawValue: onlineAgentsCount,
      goodDirection: 'up',
    },
    {
      key: 'agentsOnCall',
      title: 'On a Call Now',
      subtitle: 'Agents on active calls',
      value: agentsOnCallPct === null ? '—' : `${Math.round(onCallAnimated)}%`,
      sub: 'of agents on queue',
      icon: 'trend',
      color: '#0d9488',
      progressPct: agentsOnCallPct === null ? 0 : Math.round(onCallAnimated),
      chartType: 'donut',
      rawValue: agentsOnCallPct,
      goodDirection: 'up',
    },
  ];

  const heroLine = myQueues.length
    ? `You are on queue for ${myQueues
        .slice(0, 3)
        .map((q) => q.name)
        .join(', ')}${myQueues.length > 3 ? ` and ${myQueues.length - 3} more` : ''}.`
    : 'You are not assigned to a queue right now — direct calls only.';

  return (
    <div className="mcm-page home-v2">
      <McmIconSprite />
      <div className="page">
        {/* ── hero ─────────────────────────────────────────────────────── */}
        <div className="hero">
          <div style={{ minWidth: 0 }}>
            <h1>
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p>
              {heroLine}{' '}
              {attention.length
                ? `${attention.length} ${attention.length === 1 ? 'thing needs' : 'things need'} your attention — they are at the top of the list below.`
                : 'Nothing is breaching right now.'}
            </p>
          </div>
          <div className="hero-right">
            <button className="btn ghost" onClick={() => navigate('/performance')}>
              <Ic n="trend" />
              Performance
            </button>
            <button className="btn primary" onClick={() => navigate('/phone')}>
              <Ic n="phone" />
              New call
            </button>
          </div>
        </div>

        {/* ── quick actions ────────────────────────────────────────────── */}
        <QuickActions />

        {/* ── KPI strip: one hero card, then the 8 tiles as a 4x2 grid
            beside it ──────────────────────────────────────────────────── */}
        <div className="kpis kpis-onerow kpis-with-hero">
          <div className="kpi-hero">
            <span className="kpi-hero-live">
              <span className="dot green" />
              live
            </span>
            <h4>Live Performance</h4>
            <p>
              Everything you need, in real-time — wait times, service levels, occupancy and agent
              activity across your contact centre.
            </p>
            <div className={`kpi-hero-status${attention.length ? ' is-warn' : ''}`}>
              <Ic n={attention.length ? 'alert' : 'bolt'} size={16} />
              <div>
                <div className="kpi-hero-status-title">
                  {attention.length ? 'Needs attention' : 'System Healthy'}
                </div>
                <div className="kpi-hero-status-sub">
                  {attention.length
                    ? `${attention.length} item${attention.length === 1 ? '' : 's'} to review`
                    : 'All queues operational'}
                </div>
              </div>
            </div>
          </div>
          {kpis.map((kpi) => {
            const trend = getTrend(kpi.key);
            const trendGood = trend ? trend.direction === kpi.goodDirection : true;
            return (
              // A breaching figure tints the whole tile, not just the number —
              // the artifact's `alert` treatment, so it reads at a glance.
              <div key={kpi.key} className={`kpi kpi-v2${kpi.tone === 'bad' ? ' alert' : ''}`}>
                <div className="kpi-top">
                  <span
                    className="kpi-badge"
                    style={{ background: `${kpi.color}1f`, color: kpi.color }}
                  >
                    <Ic n={kpi.icon} size={18} />
                  </span>
                  <div className="kpi-titles">
                    <span className="kpi-title">{kpi.title}</span>
                    <span className="kpi-subtitle">{kpi.subtitle}</span>
                  </div>
                </div>
                <div className="kpi-value-row">
                  <div className="kpi-value-block">
                    <div className={`v num${kpi.tone ? ` ${kpi.tone}` : ''}`}>{kpi.value}</div>
                    {kpi.compactSub ? (
                      <div className="kpi-compact-sub">{kpi.compactSub}</div>
                    ) : null}
                  </div>
                  {trend ? (
                    <span className={`kpi-trend${trendGood ? ' is-good' : ' is-bad'}`}>
                      <Ic n={trend.direction === 'down' ? 'down' : 'up'} size={10} />
                      {trend.pct}%<small>vs last 30 min</small>
                    </span>
                  ) : null}
                  {/* The two roster-share metrics put their gauge beside the
                      value instead of below it -- there's no history to
                      chart for "share of roster right now", so it reads as
                      one compact row rather than a tall tile with an empty
                      gap under a short number. */}
                  {kpi.chartType === 'donut' ? (
                    <div className="kpi-chart-donut">
                      <RadialGauge value={kpi.progressPct} size={52} color={kpi.color} />
                      <span className="kpi-chart-donut-label">{Math.round(kpi.progressPct)}%</span>
                    </div>
                  ) : null}
                </div>
                {kpi.chartType === 'bar' ||
                kpi.chartType === 'line' ||
                kpi.chartType === 'meter' ? (
                  <div className="kpi-chart">
                    {kpi.chartType === 'bar' ? (
                      <SparkBars data={getHistory(kpi.key)} color={kpi.color} height={32} />
                    ) : null}
                    {kpi.chartType === 'line' ? (
                      <SparkLine data={getHistory(kpi.key)} color={kpi.color} height={32} />
                    ) : null}
                    {kpi.chartType === 'meter' && kpi.meter ? (
                      <LinearMeter
                        value={kpi.meter.value}
                        target={kpi.meter.target}
                        color={kpi.color}
                      />
                    ) : null}
                  </div>
                ) : null}
                {kpi.sub ? <div className="d">{kpi.sub}</div> : null}
              </div>
            );
          })}
        </div>

        {/* ── needs you now, full width on its own row ─────────────────── */}
        <div className="panel-card">
            <div className="pc-head attn-head">
              <h3>Needs you now</h3>
              <span className={`tag ${attention.length ? 'neg' : 'pos'}`}>
                {attention.length
                  ? `${attention.length} item${attention.length === 1 ? '' : 's'}`
                  : 'all clear'}
              </span>
              {/* Real counts, from the same items listed below -- critical
                  (a breach) split from warning (worth a look) rather than
                  one undifferentiated total. */}
              {attention.length ? (
                <span className="attn-split">
                  {attention.filter((item) => item.level === 'crit').length ? (
                    <span className="attn-split-seg is-crit">
                      {attention.filter((item) => item.level === 'crit').length} critical
                    </span>
                  ) : null}
                  {attention.filter((item) => item.level === 'warn').length ? (
                    <span className="attn-split-seg is-warn">
                      {attention.filter((item) => item.level === 'warn').length} warning
                    </span>
                  ) : null}
                </span>
              ) : null}
              {/* How this count has moved over the session -- same rolling
                  sampling as the KPI sparklines above (`useKpiHistory`), not
                  a report endpoint that doesn't exist for this figure. */}
              <div className="attn-spark">
                <SparkBars
                  data={getHistory('needsAttention')}
                  color={attention.length ? 'var(--crit, #d32f2f)' : 'var(--live)'}
                  height={28}
                />
              </div>
              <span className="src live pc-right">
                <span className="dot green" />
                live
              </span>
            </div>
            <div className={`pc-body${attention.length ? ' attn-row' : ''}`}>
              {attention.length ? (
                attention.map((item) => (
                  <div key={item.id} className={`attn ${item.level}`}>
                    <span className="attn-ic">
                      <Ic n={item.icon} size={15} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="attn-t">{item.title}</div>
                      <div className="attn-d">{item.detail}</div>
                    </div>
                    <button
                      className={`btn sm ${item.action.primary ? 'primary' : 'ghost'}`}
                      onClick={() => navigate(item.action.to)}
                    >
                      {item.action.label}
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty">
                  <Ic n="check" />
                  <p>
                    Every queue is inside its service level and nobody is waiting past the breach
                    mark. This list fills itself the moment that changes.
                  </p>
                </div>
              )}
            </div>
          </div>

        {/* ── your day so far (merged with the old "since you logged off"
            digest) / quick dial -- two cards, not three, and the first one
            reads as charts/stats now instead of a stack of key-value rows ── */}
        <div className="grid2 grid2-stretch-cols" style={{ marginTop: 16 }}>
            <div className="panel-card">
              <div className="pc-head">
                <h3>Your day so far</h3>
                <span className="src pc-right">{moment().format('HH:mm')} · today</span>
              </div>
              <div className="pc-body">
                {me ? (
                  <>
                    <div className="day-stats-row">
                      <div className="day-stat">
                        <span
                          className="day-stat-icon"
                          style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}
                        >
                          <Ic n="phone" size={14} />
                        </span>
                        <div className="min-w-0">
                          <div className="day-stat-v num">{myHandled}</div>
                          <div className="day-stat-k">Calls handled</div>
                        </div>
                      </div>
                      <div className="day-stat">
                        <span
                          className="day-stat-icon"
                          style={{ background: 'rgba(14,165,233,0.12)', color: '#0ea5e9' }}
                        >
                          <Ic n="clock" size={14} />
                        </span>
                        <div className="min-w-0">
                          <div className="day-stat-v num">
                            {myAhtSecs === null ? '—' : formatSecsToClock(myAhtSecs)}
                          </div>
                          <div className="day-stat-k">Avg handle time</div>
                        </div>
                      </div>
                      <div className="day-stat">
                        <span
                          className="day-stat-icon"
                          style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}
                        >
                          <Ic n="bolt" size={14} />
                        </span>
                        <div className="min-w-0">
                          <div className="day-stat-v num">{Math.round(myTalkMinutes)}m</div>
                          <div className="day-stat-k">Time on calls</div>
                        </div>
                      </div>
                    </div>

                    {/* Inbound/outbound as a split, not two more kv rows --
                        and the "since you logged off" digest's own dot
                        legend joins the same line, so every colour on the
                        card is explained in one place instead of two. */}
                    <div className="day-split-row">
                      <StatusDonut
                        data={(() => {
                          const inbound = Number(myStats.incoming_calls) || 0;
                          const outbound = Number(myStats.outgoing_calls) || 0;
                          const total = inbound + outbound || 1;
                          return [
                            {
                              state: 'Inbound',
                              count: inbound,
                              pct: Math.round((inbound / total) * 100),
                            },
                            {
                              state: 'Outbound',
                              count: outbound,
                              pct: Math.round((outbound / total) * 100),
                            },
                          ];
                        })()}
                        colors={{ Inbound: '#2563eb', Outbound: '#7c3aed' }}
                        size={88}
                      />
                      <div className="day-split-legend">
                        <div className="day-split-item">
                          <span className="dot" style={{ background: '#2563eb' }} />
                          Inbound
                        </div>
                        <div className="day-split-item">
                          <span className="dot" style={{ background: '#7c3aed' }} />
                          Outbound
                        </div>
                        {[
                          { label: 'Voicemails today', color: 'var(--accent)' },
                          { label: 'Missed calls today', color: 'var(--crit, #d32f2f)' },
                          { label: 'Callers still waiting', color: '#7c3aed' },
                        ].map((row) => (
                          <div className="day-split-item" key={row.label}>
                            <span className="dot" style={{ background: row.color }} />
                            {row.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    {(() => {
                      const digestRows = [
                        { label: 'Voicemails today', value: voicemails, color: 'var(--accent)' },
                        {
                          label: 'Missed calls today',
                          value: missedRows.length,
                          color: 'var(--crit, #d32f2f)',
                        },
                        {
                          label: 'Callers still waiting',
                          value: waitingCalls.length,
                          color: '#7c3aed',
                        },
                      ];
                      const max = Math.max(voicemails, missedRows.length, waitingCalls.length, 1);
                      return (
                        <div className="day-bars">
                          {digestRows.map((row) => (
                            <div className="day-bar-row" key={row.label}>
                              <div className="day-bar-track">
                                <span
                                  style={{
                                    width: `${Math.max(3, (row.value / max) * 100)}%`,
                                    background: row.color,
                                  }}
                                />
                              </div>
                              <span className="day-bar-value num">{row.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    <div className="day-foot">
                      <span className="day-station">
                        {isRegistered ? (
                          <>
                            <span className="dot green" />
                            registered
                            {myExtension ? <span className="num"> · ext {myExtension}</span> : null}
                          </>
                        ) : (
                          <>
                            <span className="dot red" />
                            not registered
                          </>
                        )}
                      </span>
                      <button className="mini" onClick={() => navigate('/phone')}>
                        <Ic n="list" size={12} />
                        Open the call log
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="empty">
                    <Ic n="user" />
                    <p>
                      No agent report for your extension today. Numbers appear here once you take
                      your first call.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── quick dial ───────────────────────────────────────────── */}
            <div className="panel-card">
              <div className="pc-head">
                <h3>Quick dial</h3>
                <span className="src pc-right">{quickDial.length} on the roster</span>
              </div>
              <div className="pc-body">
                {quickDial.length ? (
                  <div className="qd-list">
                    {quickDial.map((person) => (
                      <button
                        key={person.extension}
                        className="qd-row"
                        title={`Call ${person.name} on ${person.extension}`}
                        onClick={() => dial(person.extension)}
                      >
                        {nameAvatar(person.name, initials(person.name), 34)}
                        <span className="qd-row-name">{person.name}</span>
                        <span className="qd-row-meta">
                          <i className={`tbl-dot ${person.online ? 'pos' : 'neu'}`} />
                          Ext. {person.extension} · {person.online ? 'Available' : 'Offline'}
                        </span>
                        <span className="qd-row-call">
                          <Ic n="phone" size={13} />
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty">
                    <Ic n="users" />
                    <p>No other extensions on the roster yet.</p>
                  </div>
                )}
              </div>
            </div>
        </div>

        {/* ── communication overview ────────────────────────────────────── */}
        <div style={{ marginTop: 16 }}>
          <CommunicationOverview today={today} />
        </div>


        {/* ── Queues + agent status, side by side ──────────────────────── */}
        <div className="grid2 grid2-stretch-cols" style={{ marginTop: 16 }}>
        {/* Queues stacked with Interactions below it — Queues alone left a
            lot of dead space under the right column's taller
            agent-status + agents stack, and Interactions was a separate
            full-width row after both; folding it in here uses that space
            instead of leaving it empty. */}
        <div className="stack">
        {/* ── Queues ──────────────────────────────────────────────────────
            The whole floor, worst first — Home answers "where is it hurting"
            before you go to Performance to work the detail. */}
        <div className="panel-card">
          <div className="pc-head">
            <h3>Queues</h3>
            <button type="button" className="btn sm ghost" onClick={() => navigate('/performance')}>
              <Ic n="trend" />
              All queues
            </button>
          </div>
          <div className="tbl-wrap tbl-enhanced">
            <table>
              <thead>
                <tr>
                  <th>Queue</th>
                  <th>Waiting</th>
                  <th>Longest</th>
                  <th>On queue</th>
                  <th>Interacting</th>
                  <th>SL</th>
                  <th>ASA</th>
                  <th>Abandon</th>
                </tr>
              </thead>
              <tbody>
                {queueRows.length ? (
                  queueRows.map((row) => (
                    <tr key={row.uuid}>
                      <td style={{ fontWeight: 700 }}>
                        <span className="tbl-row-name">
                          <i className={`tbl-dot ${slDotClass(row.sla)}`} />
                          {row.name}
                        </span>
                      </td>
                      <td className="num">
                        {row.waiting > 0 ? (
                          <span className="tag warn">{row.waiting}</span>
                        ) : (
                          row.waiting
                        )}
                      </td>
                      <td className="num">
                        {row.longestWaitTimestamp ? (
                          <Timer startTime={row.longestWaitTimestamp} />
                        ) : (
                          <span style={{ color: 'var(--ink-4)' }}>—</span>
                        )}
                      </td>
                      <td className="num">{occupancyBar(row.available, row.membersCount)}</td>
                      <td className="num">{row.interacting}</td>
                      <td className="num">{slTag(row.sla, row.slaTargetPct)}</td>
                      <td className="num">
                        {row.asa === null ? (
                          <span style={{ color: 'var(--ink-4)' }}>—</span>
                        ) : (
                          formatSecsToClock(Math.round(row.asa))
                        )}
                      </td>
                      <td className="num">{row.abandonRate}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty">
                        <Ic n="list" />
                        <p>No queues are configured yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Interactions ───────────────────────────────────────────────
            Live calls only. Sentiment is in the artifact but needs the
            Copilot transcript service, so the column is left out rather
            than shown empty. */}
        <div className="panel-card">
          <div className="pc-head">
            <h3>Interactions</h3>
            <span className="pc-right num" style={{ color: 'var(--ink-4)', fontSize: 11 }}>
              {interactions.length} in progress
            </span>
          </div>
          <div className="tbl-wrap tbl-enhanced">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Number</th>
                  <th>Queue</th>
                  <th>Agent</th>
                  <th>Duration</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {interactions.length ? (
                  interactions.map((call) => (
                    <tr key={call.id}>
                      <td className="num">
                        {call.startedAt ? moment(call.startedAt).format('HH:mm') : '—'}
                      </td>
                      <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        <span className="tbl-row-name">
                          {nameAvatar(call.customer)}
                          {call.customer}
                        </span>
                      </td>
                      <td className="num">{call.number}</td>
                      <td>{call.queue}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{call.agent}</td>
                      <td className="num">
                        {call.startedAt ? (
                          <Timer startTime={call.startedAt} />
                        ) : (
                          <span style={{ color: 'var(--ink-4)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={call.waiting ? 'state acw' : 'state busy'}
                          style={{ textTransform: 'capitalize' }}
                        >
                          {call.state}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty">
                        <Ic n="phone" />
                        <p>Nothing on the wire right now.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>

        {/* ── Agent status distribution + agents, stacked in this column
            so they fill the height Queues sets on the left ─────────────── */}
        <div className="stack">
        <div className="panel-card">
          <div className="pc-head">
            <h3>Agent status distribution</h3>
            <span className="pc-right num" style={{ color: 'var(--ink-4)', fontSize: 11 }}>
              {liveAgents.length} on the roster
            </span>
          </div>
          <div className="pc-body">
            {/* A single segmented bar -- every state's share end to end --
                instead of a donut: reads as one proportion at a glance
                rather than needing separate wedges compared to each other,
                and the legend rows underneath give the exact counts. */}
            {stateDistribution.length ? (
              <div className="dist-bar-block" role="img" aria-label={rosterSummary}>
                <div className="dist-bar">
                  {stateDistribution.map((slice) => (
                    <span
                      key={slice.state}
                      className="dist-bar-seg"
                      style={{
                        width: `${slice.pct}%`,
                        background: STATE_COLOR[slice.state] || 'var(--ink-4)',
                      }}
                    />
                  ))}
                </div>
                <div className="dist-legend-list">
                  {stateDistribution.map((slice) => (
                    <div className="dist-legend-item" key={slice.state}>
                      <span className={STATE_CLASS[slice.state] || 'state away'}>
                        {slice.state}
                      </span>
                      <span className="num" style={{ color: 'var(--ink-4)' }}>
                        {slice.count} · {slice.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty">
                <Ic n="users" />
                <p>Nobody is logged in yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Agents ─────────────────────────────────────────────────────
            Adherence and sentiment are in the artifact but have no service
            behind them yet, so this shows what the platform knows rather than
            filling the columns in. Occupancy needs how long each person spent
            in each status: agent_status_history started recording that on
            9 Sep 2026, so it becomes answerable once a range of it exists. */}
        <div className="panel-card roomy-rows fill-remaining">
          <div className="pc-head">
            <h3>Agents</h3>
            <button type="button" className="btn sm ghost" onClick={() => navigate('/performance')}>
              <Ic n="users" />
              All agents
            </button>
          </div>
          <div className="tbl-wrap tbl-enhanced">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Queue</th>
                  <th>State</th>
                  <th>Time in state</th>
                  <th>Handled</th>
                  <th>AHT</th>
                </tr>
              </thead>
              <tbody>
                {agentsByActivity.length ? (
                  agentsByActivity.map((agent) => (
                    <tr key={agent.extension || agent.name}>
                      <td>
                        <span className="tbl-row-name">
                          <i
                            className="tbl-dot"
                            style={{ background: STATE_COLOR[agent.status] || 'var(--ink-4)' }}
                          />
                          <span style={{ fontWeight: 700 }}>{agent.name}</span>
                          {agent.extension ? (
                            <span className="num" style={{ color: 'var(--ink-4)' }}>
                              · {agent.extension}
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td>{agent.queueOrCampaign}</td>
                      <td>
                        <span className={STATE_CLASS[agent.status] || 'state away'}>
                          {agent.status}
                        </span>
                      </td>
                      <td className="num">
                        {agent.callStart ? (
                          <Timer startTime={agent.callStart} />
                        ) : (
                          <span style={{ color: 'var(--ink-4)' }}>—</span>
                        )}
                      </td>
                      <td className="num">{agent.handledToday}</td>
                      <td className="num">
                        {agent.aht === null ? (
                          <span style={{ color: 'var(--ink-4)' }}>—</span>
                        ) : (
                          formatSecsToClock(Math.round(agent.aht * 60))
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty">
                        <Ic n="users" />
                        <p>No agents on the roster yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
