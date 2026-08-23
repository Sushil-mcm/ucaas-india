import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import TableManager from '@/components/custom/table-manager';
import { handleDate } from '@/components/custom/date-dropdown/constant';
import { callList, ivrList } from '@/services/api';
import PerfStatCard from './stat-card';

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

  const columns = [
    { header: 'Flow', accessorKey: 'name' },
    { header: 'Extension', accessorKey: 'extension' },
    {
      header: 'Site',
      accessorKey: 'site',
      cell: ({ row }: any) => getSiteLabel(row.original?.site),
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
    <div className="flex w-full flex-col gap-3 px-[22px] py-4">
      <p className="page-note">
        IVR call flows configured for this account. "Entries Today" counts calls routed through each
        flow's extension today — deeper per-path (which key was pressed, where callers dropped off)
        analytics aren't wired up yet.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <PerfStatCard label="Total flows" value={String(flows.length)} />
        <PerfStatCard
          label="Flows by site"
          value={siteEntries.length ? siteEntries[0][0] : '—'}
          sub={
            siteEntries.length
              ? siteEntries.map(([site, count]) => `${site}: ${count}`).join(' · ')
              : undefined
          }
        />
      </div>
      <TableManager
        columns={columns}
        fetcherKey="performanceFlowsList"
        fetcherFn={ivrList}
        emptyTablePlaceholder="No call flows configured"
        descriptionEmptyTable="IVR menus you create show up here."
      />
    </div>
  );
};

export default FlowsTab;
