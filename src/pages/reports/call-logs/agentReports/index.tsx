import { useRef, useState } from 'react';
import { ReportsPageLayout } from '../../reports-content-layout';
// import { useGetExtensions } from '@/hooks/common';
import useDebounce from '@/hooks/use-debounce';
import { callReportAgentList } from '@/services/api';
import DateDropdown from '@/components/custom/date-dropdown';
import { dropdownCallInitialVal } from '@/components/custom/date-dropdown/constant';
import { Loader2 } from 'lucide-react';
import TableManager from '@/components/custom/table-manager';
import { Input } from '@/components/ui/input';
import { SearchLine } from '@/assets/icons';
import { Button } from '@/components/ui/button';
import { Icon } from '@/assets/icons/icon';

const AgentReports = () => {
  const tableRef = useRef<any>(null);
  // const extensionObj: any = {};
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [dropdownVal, setDropdownVal] = useState(dropdownCallInitialVal);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 1000);
  // const { data: dataExtensionsList } = useGetExtensions({
  //   page: 1,
  //   limit: 99999,
  //   filters: [],
  //   search: '',
  //   displayType: 'dropdown',
  // });

  const [isLoading, setIsLoading] = useState(false);

  const handleRefetchTableData = async () => {
    if (tableRef?.current) {
      setIsLoading(true);
      try {
        await tableRef.current.refetchTable();
      } finally {
        setIsLoading(false);
      }
    }
  };

  // dataExtensionsList?.forEach(
  //   (item: any) =>
  //     (extensionObj[item?.extension] =
  //       `${item?.first_name}${item?.last_name ? ` ${item?.last_name}` : ''}`),
  // );

  const columns = [
    {
      header: 'Name',
      accessorKey: 'first_name',
      cell: ({ row }: any) => {
        const data = row?.original;
        return data?.first_name + ' ' + data?.last_name || '';
      },
    },
    {
      header: 'Total Calls',
      accessorKey: 'stats',
      cell: ({ row }: any) => {
        const data = row?.original;
        return data?.stats?.total_calls || 0;
      },
    },
    {
      header: 'Outgoing Calls',
      accessorKey: 'stats',
      cell: ({ row }: any) => {
        const data = row?.original;
        return data?.stats?.outgoing_calls || 0;
      },
    },
    {
      header: 'Answered Calls',
      accessorKey: 'stats',
      cell: ({ row }: any) => {
        const data = row?.original;
        return data?.stats?.answered_calls || 0;
      },
    },

    {
      header: 'Time on Calls (mm:ss)',
      accessorKey: 'stats',
      cell: ({ row }: any) => {
        const data = row?.original;
        return data?.stats?.time_on_calls_minutes || 0;
      },
    },

    {
      header: 'Incoming Calls',
      accessorKey: 'stats',
      cell: ({ row }: any) => {
        const data = row?.original;
        return data?.stats?.incoming_calls || 0;
      },
    },
    {
      header: 'Incoming Answered Calls',
      accessorKey: 'stats',
      cell: ({ row }: any) => {
        const data = row?.original;
        return data?.stats?.incoming_answered_calls || 0;
      },
    },
    {
      header: 'Time on Incoming Calls (mm:ss)',
      accessorKey: 'stats',
      cell: ({ row }: any) => {
        const data = row?.original;
        return data?.stats?.time_on_incoming_calls_minutes || 0;
      },
    },
  ];
  const Filters = (
    <div className="flex items-center gap-2 filters">
      <div className="w-full sm:w-52 lg:w-60">
        <Input
          placeholder="Search"
          className="pl-10 h-9 min-h-9 rounded-lg"
          value={search}
          onChange={(e) => {
            const value = e.target.value;
            if (value.startsWith(' ')) return;
            setSearch(e.target.value);
          }}
          IconPosition="left-0 pl-2 inset-y-0"
          Icon={<SearchLine className=" text-gray-700" />}
        />
      </div>
      <DateDropdown
        {...{
          dropdownVal,
          setDropdownVal,
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => handleRefetchTableData()}
        className="cursor-pointer flex items-center justify-center min-h-9 min-w-9 max-w-9 max-h-9 rounded-lg w-9 h-9 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
      >
        {isLoading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Icon name="Refresh" className="w-5 h-5" />
        )}
      </Button>
    </div>
  );

  return (
    <ReportsPageLayout filters={Filters}>
      <div className="w-full  p-3 flex flex-col gap-2">
        <TableManager
          {...{
            tableRef,
            fetcherKey: 'callAgentList',
            fetcherFn: callReportAgentList,
            columns,
            select: (data: any) => data?.data?.data?.result?.rows,
            extraParams: {
              timezone: browserTimezone,
              filter_date: {
                from: dropdownVal?.value?.from,
                to: dropdownVal?.value?.to,
              },
              filter: debouncedSearch
                ? [
                    {
                      key: 'first_name',
                      value: debouncedSearch,
                    },
                  ]
                : [],
            },
            emptyTablePlaceholder: 'No agent reports found',
            // descriptionEmptyTable: 'Start making or receiving calls to generate call logs.',
          }}
        />
      </div>
    </ReportsPageLayout>
  );
};

export default AgentReports;
