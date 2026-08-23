import TableManager from '@/components/custom/table-manager';
import { getAgentBillingList } from '@/services/api';
import { useQuery } from '@tanstack/react-query';

type AgentBillingApiRow = {
  agent_uuid?: string;
  agentName?: string;
  channel?: string;
  cost_total_usd?: number;
  used_minutes?: number;
  used_messages?: number;
};

type AgentUsage = {
  id: string;
  agentId?: string;
  agentName?: string;
  channel?: string;
  totalCostUSD?: number;
  usedMinutes?: number;
  usedMessages?: number;
};

const getAgentBillingRows = (response: any): AgentBillingApiRow[] => {
  const result =
    response?.data?.data?.result ??
    response?.data?.result ??
    response?.result ??
    response?.data?.agents ??
    response?.data ??
    [];

  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result?.agents)) return result.agents;

  return [];
};

const columns = [
  {
    header: 'Agent Name',
    accessorKey: 'agentName',
    cell: ({ row }: any) => {
      const isDeleted = row?.original?.deletedAt || row?.original?.deleted_at;
      return (
        <span className="flex items-center gap-2 max-w-full overflow-hidden">
          <span
            className="font-medium text-gray-900 truncate max-w-[170px] inline-block"
            title={row?.original?.agentName || 'Unknown'}
          >
            {row?.original?.agentName || 'Unknown'}
          </span>
          {isDeleted ? (
            <span className="inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-ucass-red/10 text-ucass-red border border-ucass-red/20 select-none">
              Deleted
            </span>
          ) : null}
        </span>
      );
    },
  },
  {
    header: 'Type',
    accessorKey: 'channel',
    cell: ({ row }: any) => <span className="capitalize">{row?.original?.channel || '--'}</span>,
  },
  {
    header: 'Total USD',
    accessorKey: 'totalCostUSD',
    cell: ({ row }: any) => {
      const amount = Number(row?.original?.totalCostUSD || 0);
      return <span>${amount.toFixed(5)}</span>;
    },
  },
  {
    header: 'Used Minutes',
    accessorKey: 'usedMinutes',
    cell: ({ row }: any) => {
      const minutes = Number(row?.original?.usedMinutes || 0);
      return <span>{minutes.toLocaleString()}</span>;
    },
  },
  {
    header: 'Used Messages',
    accessorKey: 'usedMessages',
    cell: ({ row }: any) => {
      const messages = Number(row?.original?.usedMessages || 0);
      return <span>{messages.toLocaleString()}</span>;
    },
  },
];

const AgentCosting = () => {
  const { data: agentList = [], isLoading } = useQuery({
    queryKey: ['getAgentBillingList'],
    queryFn: getAgentBillingList,
    select: getAgentBillingRows,
  });

  const rows: AgentUsage[] = agentList.map((agent) => ({
    ...agent,
    id: agent?.agent_uuid || '',
    agentId: agent?.agent_uuid || '',
    agentName: agent?.agentName || '--',
    channel: agent?.channel || '--',
    totalCostUSD: Number(agent?.cost_total_usd ?? 0),
    usedMinutes: Number(agent?.used_minutes ?? 0),
    usedMessages: Number(agent?.used_messages ?? 0),
  }));

  return (
    <div className="h-full w-full">
      <TableManager
        {...{
          columns,
          staticData: rows,
          enabled: false,
          loading: isLoading,
          showPagination: false,
          customClass: 'h-full',
          emptyTablePlaceholder: 'No Agent Usage Found!',
        }}
      />
    </div>
  );
};

export default AgentCosting;
