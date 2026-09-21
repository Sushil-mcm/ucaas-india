import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Workflow, MapPin, Activity, Flame, Info } from 'lucide-react';
import TableManager from '@/components/custom/table-manager';
import { handleDate } from '@/components/custom/date-dropdown/constant';
import { callList, ivrList } from '@/services/api';
import PerfKpiTile from './perf-kpi-tile';
import { useKpiHistory } from '@/pages/dashboard/home/use-kpi-history';
import './perf-kpi-tile.css';
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

const FlowsTab = ({ globalSearch }: { globalSearch?: string } = {}) => {
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

  /* Same rolling in-memory sampler Queues/Agents/Calls use for their tile
     sparklines and "vs last 30 min" pills — no historical endpoint exists. */
  const { getHistory, getTrend } = useKpiHistory({
    flows: flows.length,
    sites: siteEntries.length,
    entries: totalEntriesToday,
    busiest: busiestFlow ? busiestFlow.count : 0,
  });

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

  /* `pt-7` = the `py-4` root Agents/Calls also use, plus the extra 12px
     their stat grids add via `py-3`. Flows leads with the notice rather than
     a grid, so the offset has to live on the root to land on the same 28px
     as the other tabs. */
  return (
    <div className="perf-flows flex w-full flex-col gap-3 px-[22px] pt-7 pb-4">
      <div className="fl-notice">
        <Info className="fl-notice-icon" />
        <p className="page-note">
          IVR flows for this account. "Entries Today" counts calls routed through each flow's
          extension today — per-path analytics aren't available yet.
        </p>
      </div>
      <div className="perf-kpi-row">
        <PerfKpiTile
          icon={Workflow}
          color="#60a5fa"
          title="Total Flows"
          subtitle={
            siteEntries.length
              ? `across ${siteEntries.length} site${siteEntries.length === 1 ? '' : 's'}`
              : 'no flows yet'
          }
          value={flows.length}
          trend={getTrend('flows')}
          goodWhenUp
          chart={{ type: 'area', data: getHistory('flows') }}
        />
        <PerfKpiTile
          icon={MapPin}
          color="#34d399"
          title="Flows By Site"
          subtitle={
            siteEntries.length
              ? siteEntries.map(([site, count]) => `${site}: ${count}`).join(' · ')
              : 'no sites yet'
          }
          value={siteEntries.length ? siteEntries[0][0] : '—'}
          trend={getTrend('sites')}
          goodWhenUp
          chart={{ type: 'bar', data: getHistory('sites') }}
        />
        <PerfKpiTile
          icon={Activity}
          color="#fb923c"
          title="Entries Today"
          subtitle="across all flows"
          value={totalEntriesToday}
          trend={getTrend('entries')}
          goodWhenUp
          chart={{ type: 'line', data: getHistory('entries') }}
        />
        <PerfKpiTile
          icon={Flame}
          color="#c084fc"
          title="Busiest Flow"
          subtitle={busiestFlow ? `${busiestFlow.count} entries today` : 'nothing routed yet'}
          value={busiestFlow ? busiestFlow.name : '—'}
          trend={getTrend('busiest')}
          goodWhenUp
          chart={{ type: 'bar', data: getHistory('busiest') }}
        />
      </div>
      <TableManager
        columns={columns}
        fetcherKey="performanceFlowsList"
        fetcherFn={ivrList}
        isHeightSet={false}
        emptyTablePlaceholder="No call flows configured"
        descriptionEmptyTable="IVR menus you create show up here."
        splitStickyHeader
        search={globalSearch}
        /* `ivrList`'s generic `search` param isn't guaranteed to match
           against flow name/extension/site server-side (unconfirmed for
           this endpoint) — `clientSideSearch` filters the fetched page
           itself instead, so this stays correct either way. The flows
           list is small (company-wide IVR menus, not per-call records), so
           a single page comfortably holds the full set this filters over. */
        clientSideSearch
      />
    </div>
  );
};

export default FlowsTab;
