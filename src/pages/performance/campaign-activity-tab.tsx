import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  PhoneIncoming,
  CheckCircle2,
  PhoneOff,
  ShieldAlert,
  UserCheck,
  Activity,
  PhoneForwarded,
} from 'lucide-react';
import Campaign from '@/pages/auto-dialer/campaign';
import { campaignList } from '@/services/api';
import PerfStatCard from './stat-card';
import './campaigns-theme.css';

const parseMembers = (members: any) => {
  try {
    const parsed = typeof members === 'string' ? JSON.parse(members || '[]') : members;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const CampaignActivityTab = () => {
  /**
   * `perf-warm-backdrop` flags the document so campaigns-theme.css can paint
   * the full-page ambient gradient and the live-queue KPI band — done on
   * `.perf-campaigns` itself rather than through the generic `.mcm-page`
   * rule, since the embedded `<Campaign />` below renders its own nested
   * `.mcm-page` panel.
   *
   * The toolbar itself (`perf-warm-toolbar`) is now toggled once in the
   * parent `Performance` component (index.tsx), since the toolbar renders
   * unconditionally there for every tab — adding it here too would race
   * with the parent's own toggle on tab switches.
   */
  useEffect(() => {
    document.body.classList.add('perf-warm-backdrop');
    return () => document.body.classList.remove('perf-warm-backdrop');
  }, []);

  const { data: campaigns = [] } = useQuery({
    queryKey: ['performanceCampaignActivityList'],
    queryFn: () => campaignList({ page: 1, limit: 100, filters: [] }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
    refetchInterval: 5000,
  });

  const totals = useMemo(() => {
    const acc = {
      assignedLeads: 0,
      answeredLeads: 0,
      totalCallNotAnswered: 0,
      totalDnc: 0,
      members: 0,
      byStatus: {} as Record<string, number>,
      byDialMethod: {} as Record<string, number>,
    };
    campaigns.forEach((campaign: any) => {
      const analytics = campaign?.campaignAnalytics || {};
      acc.assignedLeads += Number(analytics?.assignedLeads) || 0;
      acc.answeredLeads += Number(analytics?.answeredLeads) || 0;
      acc.totalCallNotAnswered += Number(analytics?.totalCallNotAnswered) || 0;
      acc.totalDnc += Number(analytics?.totalDnc) || 0;
      acc.members += parseMembers(campaign?.members).length;

      const status = String(campaign?.campaignStatus || 'UNKNOWN').toUpperCase();
      acc.byStatus[status] = (acc.byStatus[status] || 0) + 1;

      const dialMethod = String(campaign?.dialMethod || 'UNKNOWN').toUpperCase();
      acc.byDialMethod[dialMethod] = (acc.byDialMethod[dialMethod] || 0) + 1;
    });
    return acc;
  }, [campaigns]);

  const connectRate = totals.assignedLeads
    ? (totals.answeredLeads / totals.assignedLeads) * 100
    : null;
  const noAnswerRate = totals.assignedLeads
    ? (totals.totalCallNotAnswered / totals.assignedLeads) * 100
    : null;

  const statusEntries = Object.entries(totals.byStatus).sort((a, b) => b[1] - a[1]);
  const dialMethodEntries = Object.entries(totals.byDialMethod).sort((a, b) => b[1] - a[1]);

  return (
    <div className="perf-campaigns flex w-full flex-col gap-4 px-[22px] py-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <PerfStatCard
          label="Total leads"
          value={String(totals.assignedLeads)}
          sub={`across ${campaigns.length} campaigns`}
          icon={Users}
        />
        <PerfStatCard
          label="Answered leads"
          value={String(totals.answeredLeads)}
          icon={PhoneIncoming}
        />
        <PerfStatCard
          label="Connect rate"
          value={connectRate === null ? '—' : `${Math.round(connectRate)}%`}
          sub="answered ÷ assigned"
          icon={CheckCircle2}
        />
        <PerfStatCard
          label="No-answer rate"
          value={noAnswerRate === null ? '—' : `${Math.round(noAnswerRate)}%`}
          tone={noAnswerRate !== null && noAnswerRate > 50 ? 'warning' : 'default'}
          icon={PhoneOff}
        />
        <PerfStatCard label="DNC skips" value={String(totals.totalDnc)} icon={ShieldAlert} />
        <PerfStatCard
          label="Members assigned"
          value={String(totals.members)}
          icon={UserCheck}
        />
        <PerfStatCard
          label="Top status"
          value={
            statusEntries.length
              ? `${statusEntries[0][0].charAt(0)}${statusEntries[0][0].slice(1).toLowerCase()}`
              : '—'
          }
          sub={
            statusEntries.length
              ? statusEntries
                  .map(
                    ([status, count]) =>
                      `${status.charAt(0)}${status.slice(1).toLowerCase()}: ${count}`,
                  )
                  .join(' · ')
              : undefined
          }
          icon={Activity}
        />
        <PerfStatCard
          label="Top dial method"
          value={
            dialMethodEntries.length
              ? `${dialMethodEntries[0][0].charAt(0)}${dialMethodEntries[0][0].slice(1).toLowerCase()}`
              : '—'
          }
          sub={
            dialMethodEntries.length
              ? dialMethodEntries
                  .map(
                    ([method, count]) =>
                      `${method.charAt(0)}${method.slice(1).toLowerCase()}: ${count}`,
                  )
                  .join(' · ')
              : undefined
          }
          icon={PhoneForwarded}
        />
      </div>
      <Campaign embedded />
    </div>
  );
};

export default CampaignActivityTab;
