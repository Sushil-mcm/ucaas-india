import { useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, Megaphone, Users, PhoneIncoming, Clock, Bot } from 'lucide-react';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { SocketEvents } from '@/context/socket-events-context';
import { useUser } from '@/hooks/use-user';
import { handleDate } from '@/components/custom/date-dropdown/constant';
import { callQueueList, campaignList } from '@/services/api';
import { useAnimatedNumber } from './use-animated-number';
import { useCallStats } from '@/hooks/use-call-stats';
import { formatSecsToClock } from './format';
import PerfStatCard from './stat-card';
import './dashboards-theme.css';

const TODAY_RANGE = handleDate('Today');

const DashboardsTab = () => {
  const { usersOnlineStatus } = useSocketEvents();
  const { campaignAiLiveCallData, getAiLiveWallboardData, isSocketConnected } =
    useContext(SocketEvents);
  const { user } = useUser();

  /* The warm ambient backdrop AND the shared KPI hero band (Waiting /
     Longest wait / Service / Volume / Coverage, rendered by index.tsx one
     level up) both key off this body class — the same convention Queues/
     Agents/Calls/Flows already use. Dashboards is already in
     SHOW_KPI_HEADER_TABS, so toggling this is what actually themes that
     band instead of leaving it on the old plain-card look. */
  useEffect(() => {
    document.body.classList.add('perf-warm-backdrop');
    return () => document.body.classList.remove('perf-warm-backdrop');
  }, []);

  const canRefreshAi = Boolean(
    user?.sip_credentials?.domain &&
    user?.company_info?.uuid &&
    user?.user_info?.uuid &&
    isSocketConnected,
  );

  useEffect(() => {
    if (!canRefreshAi) return;
    getAiLiveWallboardData({
      domain: user?.sip_credentials?.domain,
      company_uuid: user?.company_info?.uuid,
      user_uuid: user?.user_info?.uuid,
    });
  }, [canRefreshAi]);

  const aiContainment = campaignAiLiveCallData?.data?.result?.ai_containment_percent;

  const { data: queues = [] } = useQuery({
    queryKey: ['performanceQueueList'],
    queryFn: () => callQueueList({ page: 1, limit: 200, filters: [], search: '' }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['performanceDashboardCampaignList'],
    queryFn: () => campaignList({ page: 1, limit: 100, filters: [] }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
  });

  // "Answered Today" / AHT previously summed callLogQueueList across all time
  // and labelled it "today". The call log is the real per-day source.
  const callStats = useCallStats(TODAY_RANGE);

  const activeCampaignsCount = campaigns.filter((c: any) =>
    ['ACTIVE', 'PROCESSING', 'RUNNING'].includes(String(c?.campaignStatus || '').toUpperCase()),
  ).length;
  const onlineAgentsCount = (usersOnlineStatus || []).filter((u: any) => u?.online).length;
  const avgHandleTime = callStats.avgHandleSec ?? 0;

  const queuesAnimated = useAnimatedNumber(queues.length);
  const campaignsAnimated = useAnimatedNumber(activeCampaignsCount);
  const agentsAnimated = useAnimatedNumber(onlineAgentsCount);
  const answeredAnimated = useAnimatedNumber(callStats.answeredCalls);
  const ahtAnimated = useAnimatedNumber(avgHandleTime);

  const hasAiContainment = typeof aiContainment === 'number';

  return (
    <div className="perf-dashboards w-full px-[22px] py-4">
      <div className="db-caption">A quick-glance overview across queues, campaigns and agents.</div>

      <div className="db-bento grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <PerfStatCard label="Active Queues" value={String(Math.round(queuesAnimated))} icon={Layers} />
        <PerfStatCard
          label="Active Campaigns"
          value={String(Math.round(campaignsAnimated))}
          sub={`of ${campaigns.length} total`}
          icon={Megaphone}
        />
        <PerfStatCard
          label="Agents Online"
          value={String(Math.round(agentsAnimated))}
          sub={
            <span className="db-live-dot-wrap">
              <span className="db-live-dot" />
              online now
            </span>
          }
          icon={Users}
        />
        <PerfStatCard
          label="Answered Today"
          value={String(Math.round(answeredAnimated))}
          icon={PhoneIncoming}
        />
        <PerfStatCard
          label="Avg Handle Time"
          value={callStats.avgHandleSec === null ? '—' : formatSecsToClock(ahtAnimated)}
          icon={Clock}
        />
        <PerfStatCard
          label="AI Containment"
          value={hasAiContainment ? `${Math.round(aiContainment)}%` : '—'}
          sub="resolved without a human"
          icon={Bot}
        />
      </div>
    </div>
  );
};

export default DashboardsTab;
