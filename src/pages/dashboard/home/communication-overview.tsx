import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { Ic } from '@/components/mcm/icons';
import { useQueueSeries } from '@/hooks/use-queue-series';
import { videoDashboardStats, getSmsLogList, getChatAgentList } from '@/services/api';
import { useAnimatedNumber } from '@/pages/performance/use-animated-number';
import { TrendLine } from './charts';

type Range = { from: string; to: string };

const TABS = [
  { key: 'calls', label: 'Calls', icon: 'phone', color: 'var(--accent)' },
  { key: 'meetings', label: 'Meetings', icon: 'video', color: '#0d9488' },
  { key: 'messages', label: 'Messages', icon: 'chat', color: '#7c3aed' },
  { key: 'ai', label: 'AI Agents', icon: 'spark', color: '#c96f1f' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/* How many agents the AI tab names before it stops and counts the rest.
   Enough to be useful on a small account, few enough that a large one does
   not turn the tab into a directory. */
const AI_AGENT_CHIPS = 12;

/** Hourly call volume (offered) — same report Performance's own trend chart
 * reads, `useQueueSeries`, just plotted here instead of re-fetched with a
 * bespoke query. */
const useCallsTrend = (today: Range) => {
  const { data } = useQueueSeries(today, { granularity: 'hour' });
  return useMemo(() => {
    const series = data?.totals?.series || [];
    return series.map((bucket: any) => ({
      label: moment(bucket.bucket).format('ha'),
      value: Number(bucket.offered) || 0,
    }));
  }, [data]);
};

/** Meetings held per day, from the same `graph_data` the Meetings dashboard
 * itself already charts (chart.js-shaped: parallel `labels`/`datasets[0].data`
 * arrays) — reused rather than re-derived. */
const useMeetingsTrend = (today: Range) => {
  const { data } = useQuery({
    queryKey: ['homeMeetingsTrend', today.from, today.to],
    queryFn: () => videoDashboardStats({ filter_date: { from: today.from, to: today.to } }),
    select: (res: any) => res?.data?.data?.result?.graph_data || res?.data?.data?.graph_data,
    staleTime: 30000,
  });
  return useMemo(() => {
    const labels: string[] = data?.labels || [];
    const values: number[] = data?.datasets?.[0]?.data || [];
    if (!labels.length) return [];
    return labels.map((label, index) => ({ label, value: Number(values[index]) || 0 }));
  }, [data]);
};

/** A tab whose whole content is one number.
 *
 * Messages and AI Agents each have a single figure and no series behind it,
 * and they were rendering as a small chip parked in the top-left of the
 * body -- a number, three words, and a lot of nothing, which reads as a
 * screen someone abandoned halfway. The figure is the content here, so it
 * is given the room: a full-width block with the count at display size and
 * a line underneath saying what it counts and over what window, since "0
 * agents configured" otherwise leaves the reader guessing whether it means
 * none exist or none are busy. */
const CommsHero = ({
  icon,
  color,
  value,
  label,
  note,
  children,
}: {
  /* the same literal union the tab list already carries, so a typo here is
     a build error rather than a missing glyph */
  icon: (typeof TABS)[number]['icon'];
  color: string;
  value: number;
  label: string;
  note: string;
  children?: React.ReactNode;
}) => (
  <div className="comms-hero">
    <div className="comms-hero-fig">
      <span className="comms-hero-ic" style={{ background: `${color}1f`, color }}>
        <Ic n={icon} size={22} />
      </span>
      <div className="comms-hero-body">
        <div className="comms-hero-num num">{value}</div>
        <div className="comms-hero-label">{label}</div>
      </div>
    </div>
    <p className="comms-hero-note">{note}</p>
    {children}
  </div>
);

const CommunicationOverview = ({ today }: { today: Range }) => {
  const [tab, setTab] = useState<TabKey>('calls');

  const callsTrend = useCallsTrend(today);
  const meetingsTrend = useMeetingsTrend(today);

  const { data: smsCount = 0 } = useQuery({
    queryKey: ['homeSmsCount', today.from, today.to],
    queryFn: () =>
      getSmsLogList({ page: 1, limit: 1, filter_date: { from: today.from, to: today.to } }),
    select: (res: any) => Number(res?.data?.data?.result?.totalRecords) || 0,
    staleTime: 30000,
  });

  /* Same request as before -- it was already being fetched and then reduced
     to a single `.length`, throwing away the names. The AI tab can say which
     agents it is counting rather than only how many, which costs nothing
     extra over the wire. */
  const { data: agentRows = [] } = useQuery({
    queryKey: ['homeChatAgentCount'],
    queryFn: () => getChatAgentList(),
    select: (res: any) => res?.data?.data?.result?.rows || [],
    staleTime: 60000,
  });
  const activeAgentCount = agentRows.length;

  const smsAnimated = useAnimatedNumber(smsCount);
  const agentAnimated = useAnimatedNumber(activeAgentCount);

  const callsTotal = useMemo(
    () => callsTrend.reduce((sum, point) => sum + point.value, 0),
    [callsTrend],
  );
  const meetingsTotal = useMemo(
    () => meetingsTrend.reduce((sum, point) => sum + point.value, 0),
    [meetingsTrend],
  );
  const callsTotalAnimated = useAnimatedNumber(callsTotal);
  const meetingsTotalAnimated = useAnimatedNumber(meetingsTotal);

  const active = TABS.find((t) => t.key === tab) || TABS[0];

  return (
    <div className="panel-card comms-overview">
      <div className="pc-head">
        <h3>Communication overview</h3>
        <span className="src pc-right">today</span>
      </div>
      <div className="comms-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`comms-tab${tab === t.key ? ' is-active' : ''}`}
            style={tab === t.key ? ({ '--tab-color': t.color } as any) : undefined}
            onClick={() => setTab(t.key)}
          >
            <Ic n={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>
      <div className="pc-body">
        {tab === 'calls' ? (
          callsTrend.length ? (
            <>
              <div className="comms-total">
                <span className="comms-total-num">{Math.round(callsTotalAnimated)}</span>
                <span className="comms-total-label">calls offered today</span>
              </div>
              <TrendLine data={callsTrend} dataKey="value" color={active.color} unit="calls" />
            </>
          ) : (
            <div className="empty comms-empty">
              <Ic n="phone" />
              <p>No calls have been offered on this account yet today.</p>
            </div>
          )
        ) : null}

        {tab === 'meetings' ? (
          meetingsTrend.length ? (
            <>
              <div className="comms-total">
                <span className="comms-total-num">{Math.round(meetingsTotalAnimated)}</span>
                <span className="comms-total-label">meetings today</span>
              </div>
              <TrendLine data={meetingsTrend} dataKey="value" color={active.color} unit="meetings" />
            </>
          ) : (
            <div className="empty comms-empty">
              <Ic n="video" />
              <p>No meetings have been held yet today.</p>
            </div>
          )
        ) : null}

        {tab === 'messages' ? (
          <CommsHero
            icon="chat"
            color={active.color}
            value={Math.round(smsAnimated)}
            label="messages sent and received today"
            note="Both directions, counted from today's SMS log. There is no hourly breakdown behind this figure, so it is shown as a total rather than a chart."
          />
        ) : null}

        {tab === 'ai' ? (
          <CommsHero
            icon="spark"
            color={active.color}
            value={Math.round(agentAnimated)}
            label="AI agents configured"
            note="How many agents exist on this account, not how busy they are — a configured agent that took no calls today still counts here."
          >
            {agentRows.length ? (
              <div className="comms-agents">
                {agentRows.slice(0, AI_AGENT_CHIPS).map((agent: any, index: number) => (
                  <span className="comms-agent" key={agent?.id ?? index}>
                    <i />
                    {String(agent?.agentName || '').trim() || 'Untitled agent'}
                  </span>
                ))}
                {agentRows.length > AI_AGENT_CHIPS ? (
                  <span className="comms-agent is-more">
                    +{agentRows.length - AI_AGENT_CHIPS} more
                  </span>
                ) : null}
              </div>
            ) : null}
          </CommsHero>
        ) : null}
      </div>
    </div>
  );
};

export default CommunicationOverview;
