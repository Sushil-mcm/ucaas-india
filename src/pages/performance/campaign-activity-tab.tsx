import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { Plus } from 'lucide-react';
import Campaign from '@/pages/auto-dialer/campaign';
import { campaignList } from '@/services/api';
import { capitalizeFirstLetter } from '@/lib/utils';
import { readOutcomes, statusOf } from '@/pages/auto-dialer/campaign/campaign-ui';
import { useCompanyFeatures } from '@/hooks/rbac';
import CampaignKpiCards from './campaign-kpi-cards';
import CampaignAnalyticsCards from './campaign-analytics-cards';
import './campaigns-theme.css';

const parseMembers = (members: any) => {
  try {
    const parsed = typeof members === 'string' ? JSON.parse(members || '[]') : members;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const CampaignActivityTab = ({ globalSearch }: { globalSearch?: string } = {}) => {
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
    /* `perf-warm-backdrop` is shared by half of Performance's tabs (every
       one on the warm theme), so it can't scope anything Campaigns-only.
       This one is added only here — the hook the compact date-dropdown
       restyle (index.css) needs, since that dropdown's open menu renders
       through a portal straight onto `<body>`, outside any DOM ancestor
       this tab's own markup has. */
    document.body.classList.add('perf-campaigns-tab-active');
    return () => {
      document.body.classList.remove('perf-warm-backdrop');
      document.body.classList.remove('perf-campaigns-tab-active');
    };
  }, []);

  const { features } = useCompanyFeatures();
  const canCreateCampaign = !!features?.plan_features?.campaign?.action?.add;

  /* `<Campaign />` keeps owning its create-drawer's open/closed state — this
     just gets a handle to it, so the redesigned header's own "Create
     campaign" button can trigger the same drawer without either component
     needing to know about the other beyond this one function. */
  const [openCreateCampaign, setOpenCreateCampaign] = useState<null | (() => void)>(null);
  const handleCampaignReady = useCallback((fn: () => void) => {
    setOpenCreateCampaign(() => fn);
  }, []);

  const { data: campaigns = [] } = useQuery({
    queryKey: ['performanceCampaignActivityList'],
    queryFn: () => campaignList({ page: 1, limit: 100, filters: [] }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
    refetchInterval: 5000,
  });

  /* One pass over the raw rows into the shape every card below reads —
     the same four outcome counts `readOutcomes` already gives the
     standalone dialer table, so this view can't drift from what that page
     shows for the same campaign. */
  const perCampaign = useMemo(
    () =>
      campaigns.map((c: any) => {
        const outcomes = readOutcomes(c?.campaignAnalytics);
        return {
          id: c?._id || c?.name,
          name: capitalizeFirstLetter(c?.name || 'Untitled campaign'),
          status: String(c?.campaignStatus || 'UNKNOWN').toUpperCase(),
          dialMethod: String(c?.dialMethod || 'UNKNOWN').toUpperCase(),
          createdAt: c?.createdAt,
          members: parseMembers(c?.members),
          ...outcomes,
          connectRate: outcomes.assigned ? Math.round((outcomes.answered / outcomes.assigned) * 100) : 0,
        };
      }),
    [campaigns],
  );

  const totals = useMemo(
    () =>
      perCampaign.reduce(
        (acc: any, c: any) => {
          acc.assigned += c.assigned;
          acc.answered += c.answered;
          acc.noAnswer += c.noAnswer;
          acc.dnc += c.dnc;
          acc.pending += c.pending;
          acc.dialed += c.dialed;
          acc.members += c.members.length;
          return acc;
        },
        { assigned: 0, answered: 0, noAnswer: 0, dnc: 0, pending: 0, dialed: 0, members: 0 },
      ),
    [perCampaign],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    perCampaign.forEach((c: any) => {
      const label = statusOf(c.status).label;
      counts[label] = (counts[label] || 0) + 1;
    });
    return counts;
  }, [perCampaign]);

  const dialMethodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    perCampaign.forEach((c: any) => {
      counts[c.dialMethod] = (counts[c.dialMethod] || 0) + 1;
    });
    return counts;
  }, [perCampaign]);

  const agentAssignment = useMemo(() => {
    const map = new Map<string, { name: string; campaigns: number; leads: number }>();
    perCampaign.forEach((c: any) => {
      c.members.forEach((member: any) => {
        const key = member?.user_uuid || member?.label || JSON.stringify(member);
        const name =
          member?.label || `${member?.first_name || ''} ${member?.last_name || ''}`.trim() || 'Unknown';
        const existing = map.get(key) || { name, campaigns: 0, leads: 0 };
        existing.campaigns += 1;
        existing.leads += c.assigned;
        map.set(key, existing);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 6);
  }, [perCampaign]);

  const connectRate = totals.assigned ? (totals.answered / totals.assigned) * 100 : null;
  const noAnswerRate = totals.assigned ? (totals.noAnswer / totals.assigned) * 100 : null;
  const dncPercent = totals.assigned ? Math.round((totals.dnc / totals.assigned) * 100) : null;
  const membersPerCampaign = campaigns.length ? Math.round(totals.members / campaigns.length) : null;
  const activeCampaigns = statusCounts.Running || 0;
  const completedCampaigns = statusCounts.Completed || 0;

  /* Total Leads' sparkline — each campaign's own assigned-leads count,
     oldest first, so the shape reads as "how the book has grown campaign
     to campaign" rather than a fabricated time series nothing measures. */
  const leadsTrend = useMemo(
    () =>
      [...perCampaign]
        .filter((c) => c.createdAt)
        .sort((a, b) => moment(a.createdAt).valueOf() - moment(b.createdAt).valueOf())
        .map((c) => c.assigned),
    [perCampaign],
  );

  const agentNames = useMemo(() => agentAssignment.map((agent) => agent.name), [agentAssignment]);

  /* The two KPI ring cards' "vs average campaign" trend chip — the mean of
     each campaign's OWN connect/no-answer rate, not the fleet-wide weighted
     rate above it. A real, derived comparison (this campaign book is running
     hotter or colder than a typical campaign in it) rather than a fabricated
     time trend nothing here actually measures. */
  const campaignsWithLeads = useMemo(() => perCampaign.filter((c: any) => c.assigned > 0), [perCampaign]);
  const avgCampaignConnectRate = campaignsWithLeads.length
    ? Math.round(
        campaignsWithLeads.reduce((sum: number, c: any) => sum + c.connectRate, 0) / campaignsWithLeads.length,
      )
    : null;
  const avgCampaignNoAnswerRate = campaignsWithLeads.length
    ? Math.round(
        campaignsWithLeads.reduce((sum: number, c: any) => sum + (c.noAnswer / c.assigned) * 100, 0) /
          campaignsWithLeads.length,
      )
    : null;

  /* `pt-7` lands the first card on the same 28px as every other Performance
     tab (Agents/Calls reach it as a `py-4` root plus the 12px their stat
     grids add via `py-3`). Bottom keeps this tab's own `py-5`. */
  return (
    <div className="perf-campaigns flex w-full flex-col gap-4 px-[22px] pt-7 pb-5">
      <div className="pc-hero-head">
        <div className="pc-hero-title-row">
          <span className="pc-live-dot" aria-hidden="true" />
          <div>
            <div className="pc-hero-title">Campaigns</div>
            <div className="pc-hero-sub">Real-time performance across every outbound campaign</div>
          </div>
        </div>
        {canCreateCampaign && openCreateCampaign && (
          <button type="button" className="pc-create-btn" onClick={() => openCreateCampaign()}>
            <Plus size={15} />
            Create campaign
          </button>
        )}
      </div>

      <CampaignKpiCards
        totalLeads={totals.assigned}
        campaignsCount={campaigns.length}
        answeredLeads={totals.answered}
        assignedLeads={totals.assigned}
        connectRate={connectRate}
        avgCampaignConnectRate={avgCampaignConnectRate}
        noAnswerRate={noAnswerRate}
        noAnswerCount={totals.noAnswer}
        avgCampaignNoAnswerRate={avgCampaignNoAnswerRate}
        dncSkips={totals.dnc}
        dncPercent={dncPercent}
        membersAssigned={totals.members}
        membersPerCampaign={membersPerCampaign}
        agentNames={agentNames}
        activeCampaigns={activeCampaigns}
        completedCampaigns={completedCampaigns}
        leadsTrend={leadsTrend}
      />

      <CampaignAnalyticsCards
        perCampaign={perCampaign}
        totals={totals}
        statusCounts={statusCounts}
        dialMethodCounts={dialMethodCounts}
        agentAssignment={agentAssignment}
      />

      <Campaign embedded globalSearch={globalSearch} onReady={handleCampaignReady} />
    </div>
  );
};

export default CampaignActivityTab;
