import { useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, Headset, Megaphone, PhoneCall, Timer as TimerIcon, Users } from 'lucide-react';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { SocketEvents } from '@/context/socket-events-context';
import { useUser } from '@/hooks/use-user';
import { handleDate } from '@/components/custom/date-dropdown/constant';
import { callQueueList, campaignList } from '@/services/api';
import { useAnimatedNumber } from './use-animated-number';
import { useCallStats } from '@/hooks/use-call-stats';
import { formatSecsToClock } from './format';

const TODAY_RANGE = handleDate('Today');

const StatCard = ({
  index,
  label,
  value,
  sub,
  Icon,
}: {
  index: number;
  label: string;
  value: string;
  sub?: string;
  Icon: any;
}) => (
  <div className="animate-dashboard-card-in stat" style={{ animationDelay: `${index * 70}ms` }}>
    <div className="flex items-start justify-between gap-2">
      <span className="k">{label}</span>
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full"
        style={{ background: 'var(--accent-wash)', color: 'var(--accent-ink)' }}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
    </div>
    <div className="v num">{value}</div>
    {sub && (
      <div className="d" style={{ color: 'var(--ink-3)', fontWeight: 500 }}>
        {sub}
      </div>
    )}
  </div>
);

const DashboardsTab = () => {
  const { usersOnlineStatus } = useSocketEvents();
  const { campaignAiLiveCallData, getAiLiveWallboardData, isSocketConnected } =
    useContext(SocketEvents);
  const { user } = useUser();

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

  return (
    <div className="w-full px-[22px] py-4">
      <style>{`
        @keyframes dashboard-card-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-dashboard-card-in {
          animation: dashboard-card-in 0.4s ease-out both;
        }
      `}</style>
      <p className="page-note" style={{ marginBottom: 12 }}>
        A quick-glance overview across queues, campaigns and agents.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard
          index={0}
          label="Active Queues"
          value={String(Math.round(queuesAnimated))}
          Icon={Headset}
        />
        <StatCard
          index={1}
          label="Active Campaigns"
          value={String(Math.round(campaignsAnimated))}
          sub={`of ${campaigns.length} total`}
          Icon={Megaphone}
        />
        <StatCard
          index={2}
          label="Agents Online"
          value={String(Math.round(agentsAnimated))}
          Icon={Users}
        />
        <StatCard
          index={3}
          label="Answered Today"
          value={String(Math.round(answeredAnimated))}
          Icon={PhoneCall}
        />
        <StatCard
          index={4}
          label="Avg Handle Time"
          value={callStats.avgHandleSec === null ? '—' : formatSecsToClock(ahtAnimated)}
          Icon={TimerIcon}
        />
        <StatCard
          index={5}
          label="AI Containment"
          value={typeof aiContainment === 'number' ? `${Math.round(aiContainment)}%` : '—'}
          sub="resolved without a human"
          Icon={Bot}
        />
      </div>
    </div>
  );
};

export default DashboardsTab;
