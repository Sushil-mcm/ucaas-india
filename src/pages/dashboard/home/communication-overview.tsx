import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { Ic } from '@/components/mcm/icons';
import { useQueueSeries } from '@/hooks/use-queue-series';
import { videoDashboardStats, getSmsLogList, getChatAgentList } from '@/services/api';
import { useAnimatedNumber } from '@/pages/performance/use-animated-number';
import { TrendArea } from './charts';

type Range = { from: string; to: string };

const TABS = [
  { key: 'calls', label: 'Calls', icon: 'phone', color: 'var(--accent)' },
  { key: 'meetings', label: 'Meetings', icon: 'video', color: '#0d9488' },
  { key: 'messages', label: 'Messages', icon: 'chat', color: '#7c3aed' },
  { key: 'ai', label: 'AI Agents', icon: 'spark', color: '#c96f1f' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

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

  const { data: activeAgentCount = 0 } = useQuery({
    queryKey: ['homeChatAgentCount'],
    queryFn: () => getChatAgentList(),
    select: (res: any) => (res?.data?.data?.result?.rows || []).length,
    staleTime: 60000,
  });

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
              <TrendArea data={callsTrend} dataKey="value" color={active.color} />
            </>
          ) : (
            <div className="empty">
              <Ic n="phone" />
              <p>No call activity yet today.</p>
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
              <TrendArea data={meetingsTrend} dataKey="value" color={active.color} />
            </>
          ) : (
            <div className="empty">
              <Ic n="video" />
              <p>No meeting activity yet today.</p>
            </div>
          )
        ) : null}

        {tab === 'messages' ? (
          <div className="comms-stat">
            <span
              className="comms-stat-icon"
              style={{ background: `${active.color}1f`, color: active.color }}
            >
              <Ic n="chat" size={20} />
            </span>
            <div>
              <div className="comms-stat-num">{Math.round(smsAnimated)}</div>
              <div className="comms-stat-label">messages sent/received today</div>
            </div>
          </div>
        ) : null}

        {tab === 'ai' ? (
          <div className="comms-stat">
            <span
              className="comms-stat-icon"
              style={{ background: `${active.color}1f`, color: active.color }}
            >
              <Ic n="spark" size={20} fill />
            </span>
            <div>
              <div className="comms-stat-num">{Math.round(agentAnimated)}</div>
              <div className="comms-stat-label">AI agents configured</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CommunicationOverview;
