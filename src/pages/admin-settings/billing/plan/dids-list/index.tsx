import { formatDate } from '@/lib/utils';
import TableManager from '@/components/custom/table-manager';
import { allNumbersList } from '@/services/api';
import NumberWithFlag from '@/components/custom/number-with-flag';

// const DID_TYPE_MAP = {
//   L: 'LOCAL_DID',
//   M: 'MOBILE_DID',
//   T: 'TOLLFREE_DID',
// } as const;

const DIDList = () => {
  const columnsDIDFree = [
    {
      header: 'DID Number',
      accessorKey: 'did_number',
      cell: ({ row }: any) => <NumberWithFlag number={row?.original?.did_number} />,
    },
    // {
    //   header: 'Site',
    //   accessorKey: 'Site',
    //   cell: ({ row }: any) => <span>{row?.original?.Site?.name || '---'}</span>,
    // },
    {
      header: 'Duration',
      accessorKey: 'buy_date',
      cell: ({ row: { original: data = {} } = {} }: any) => {
        return `${formatDate(data?.buy_date)} - ${formatDate(data?.renewal_date)}`;
      },
    },

    {
      header: 'DID Cost ($)',
      accessorKey: 'monthly_cost',
      cell: ({ row }: any) => {
        const { monthly_cost } = row.original ?? {};

        const parsedCost = Number(monthly_cost);
        const isValidCost = !Number.isNaN(parsedCost);
        const costValue = isValidCost ? parsedCost.toFixed(2) : '--';
        const isFree = isValidCost && parsedCost === 0;

        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{costValue}</span>
            <span
              className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${
                isFree
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                  : 'bg-[var(--color-ucass-active)]/10 text-[var(--color-ucass-active)] border-[var(--color-ucass-active)]/20'
              }`}
            >
              {isFree ? 'Free' : 'Paid'}
            </span>
          </div>
        );
      },
    },
    // {
    //   header: 'Monthly Cost ',
    //   accessorKey: 'monthly_cost',
    // },
  ];

  return (
    <div className="h-full w-full flex flex-col gap-2">
      <TableManager
        {...{
          fetcherKey: 'freeDID',
          fetcherFn: allNumbersList,
          columns: columnsDIDFree,
          isHeightSet: false,
          customClass: 'h-full',
        }}
      />
    </div>
  );
};

export default DIDList;
