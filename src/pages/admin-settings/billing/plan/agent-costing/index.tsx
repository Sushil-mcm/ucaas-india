import TableManager from '@/components/custom/table-manager';
import { getAgentBillingList } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { UNAVAILABLE, knownNumber } from '@/lib/billing-money';

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
      /* An agent whose cost did not come back has not cost nothing — nobody
         sent us a figure. Shown as such rather than as $0.00000, which reads as
         "this agent is free" on a page headed Billing. Five decimal places
         because AI usage is genuinely priced in fractions of a cent. */
      const amount = knownNumber(row?.original?.totalCostUSD);
      return <span>{amount === null ? UNAVAILABLE : `$${amount.toFixed(5)}`}</span>;
    },
  },
  {
    header: 'Used Minutes',
    accessorKey: 'usedMinutes',
    cell: ({ row }: any) => {
      const minutes = knownNumber(row?.original?.usedMinutes);
      return <span>{minutes === null ? UNAVAILABLE : minutes.toLocaleString()}</span>;
    },
  },
  {
    header: 'Used Messages',
    accessorKey: 'usedMessages',
    cell: ({ row }: any) => {
      const messages = knownNumber(row?.original?.usedMessages);
      return <span>{messages === null ? UNAVAILABLE : messages.toLocaleString()}</span>;
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
    /* Passed through unconverted, so a missing figure stays missing all the way
       to the cell that has to say so. */
    totalCostUSD: knownNumber(agent?.cost_total_usd) ?? undefined,
    usedMinutes: knownNumber(agent?.used_minutes) ?? undefined,
    usedMessages: knownNumber(agent?.used_messages) ?? undefined,
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
