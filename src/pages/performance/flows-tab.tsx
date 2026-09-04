import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Workflow, MapPin, Activity, Flame, Info } from 'lucide-react';
import TableManager from '@/components/custom/table-manager';
import { handleDate } from '@/components/custom/date-dropdown/constant';
import { callList, ivrList } from '@/services/api';
import PerfStatCard from './stat-card';
import './flows-theme.css';

const TODAY_RANGE = handleDate('Today');

const getSiteLabel = (site: unknown) => {
  if (typeof site !== 'string' || !site) return '—';
  try {
    return JSON.parse(site)?.label || '—';
  } catch {
    return '—';
  }
};

const FlowsTab = () => {
  /* The warm ambient backdrop renders one level up, in the Performance page
     shell (index.tsx) — flagging the document while this tab is open is
     what lets flows-theme.css reach it, the same convention Queues/Agents/
     Calls already use. */
  useEffect(() => {
    document.body.classList.add('perf-warm-backdrop');
    return () => document.body.classList.remove('perf-warm-backdrop');
  }, []);

  const { data: flows = [] } = useQuery({
    queryKey: ['performanceFlowsSummary'],
    queryFn: () => ivrList({ page: 1, limit: 200 } as any),
    select: (res: any) => res?.data?.data?.result?.rows || [],
  });

  const { data: todayCalls = [] } = useQuery({
    queryKey: ['performanceFlowsTodayCalls', TODAY_RANGE.from, TODAY_RANGE.to],
    queryFn: () =>
      callList({
        page: 1,
        limit: 200,
        filter_date: TODAY_RANGE,
      }),
    select: (res: any) => res?.data?.data?.result?.rows || [],
    refetchInterval: 5000,
  });

  const entriesByExtension = useMemo(() => {
    const map: Record<string, number> = {};
    todayCalls
      .filter((call: any) => String(call?.forward_type || '').toUpperCase() === 'IVR')
      .forEach((call: any) => {
        const extension = String(call?.destination_number || call?.via_did || '');
        if (!extension) return;
        map[extension] = (map[extension] || 0) + 1;
      });
    return map;
  }, [todayCalls]);

  const siteEntries = useMemo(() => {
    const map: Record<string, number> = {};
    flows.forEach((flow: any) => {
      const site = getSiteLabel(flow?.site);
      map[site] = (map[site] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [flows]);

  const totalEntriesToday = useMemo(
    () => Object.values(entriesByExtension).reduce((sum, count) => sum + count, 0),
    [entriesByExtension],
  );

  const busiestFlow = useMemo(
    () =>
      flows.reduce((top: any, flow: any) => {
        const count = entriesByExtension[String(flow?.extension || '')] ?? 0;
        if (count <= 0) return top;
        if (!top || count > top.count) return { name: flow?.name || '—', count };
        return top;
      }, null),
    [flows, entriesByExtension],
  );

  const columns = [
    {
      header: 'Flow',
      accessorKey: 'name',
      cell: ({ row }: any) => <span className="fl-flow-name">{row.original?.name || '—'}</span>,
    },
    {
      header: 'Extension',
      accessorKey: 'extension',
      cell: ({ row }: any) => (
        <span className="fl-extension num">{row.original?.extension || '—'}</span>
      ),
    },
    {
      header: 'Site',
      accessorKey: 'site',
      cell: ({ row }: any) => <span className="fl-site">{getSiteLabel(row.original?.site)}</span>,
    },
    {
      header: 'Entries Today',
      accessorKey: 'entriesToday',
      cell: ({ row }: any) => {
        const extension = String(row.original?.extension || '');
        return entriesByExtension[extension] ?? 0;
      },
    },
  ];

  return (
    <div className="perf-flows flex w-full flex-col gap-3 px-[22px] py-4">
      <div className="fl-notice">
        <Info className="fl-notice-icon" />
        <p className="page-note">
          IVR flows for this account. "Entries Today" counts calls routed through each flow's
          extension today — per-path analytics aren't available yet.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <PerfStatCard label="Total flows" value={String(flows.length)} icon={Workflow} />
        <PerfStatCard
          label="Flows by site"
          value={siteEntries.length ? siteEntries[0][0] : '—'}
          sub={
            siteEntries.length
              ? siteEntries.map(([site, count]) => `${site}: ${count}`).join(' · ')
              : undefined
          }
          icon={MapPin}
        />
        <PerfStatCard
          label="Entries today"
          value={String(totalEntriesToday)}
          sub="across all flows"
          icon={Activity}
        />
        <PerfStatCard
          label="Busiest flow"
          value={busiestFlow ? busiestFlow.name : '—'}
          sub={busiestFlow ? `${busiestFlow.count} entries today` : 'nothing routed yet'}
          icon={Flame}
        />
      </div>
      <TableManager
        columns={columns}
        fetcherKey="performanceFlowsList"
        fetcherFn={ivrList}
        isHeightSet={false}
        emptyTablePlaceholder="No call flows configured"
        descriptionEmptyTable="IVR menus you create show up here."
      />
    </div>
  );
};

export default FlowsTab;
