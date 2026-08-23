import { Icon } from '@/assets/icons/icon';
import { convertDateFormateApis, handleAlert } from '@/lib/utils';
import { getInvoice } from '@/services/api';
import TableManager from '@/components/custom/table-manager';
import { useRef, useState } from 'react';
import InvoiceDetails from './invoice-details';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dropdownInitialVal } from '@/components/custom/date-dropdown/constant';
import DateDropdown from '@/components/custom/date-dropdown';
import useDebounce from '@/hooks/use-debounce';
import { SearchLine } from '@/assets/icons';
import CustomTooltip from '@/components/custom/custom-tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
// import Breadcrumb from '@/components/custom/breadcrumb';

const InvoiceStatusMap: any = {
  Completed: 'text-green-600 font-medium',
  completed: 'text-green-600 font-medium',
  Failed: 'text-red-600 font-medium',
  failed: 'text-red-600 font-medium',
  Processing: 'text-amber-500 font-medium',
  processing: 'text-amber-500 font-medium',
};

const TruncatedDescriptionCell = ({ value }: { value: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!value) return null;
  if (value.length <= 45) {
    return <span>{value}</span>;
  }

  return (
    <div className="flex flex-col gap-0.5 items-start">
      <span className="whitespace-normal break-words max-w-[320px]">
        {isExpanded ? value : `${value.slice(0, 45)}...`}
      </span>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
      >
        {isExpanded ? 'Read Less' : 'Read More'}
      </button>
    </div>
  );
};
// const breadcrumbData = [{ label: 'Billing' }, { label: 'Invoices' }];

const Invoice = () => {
  const tableRef = useRef<any>(null);
  const [drawerState, setDrawerState] = useState<any>(false);
  const [rowData, setRowData] = useState({});
  const [search, setSearch] = useState<string>('');
  const [dropdownVal, setDropdownVal] = useState(dropdownInitialVal);
  const [failureDetails, setFailureDetails] = useState<{
    billNumber: string;
    description: string;
  } | null>(null);
  const debouncedSearch = useDebounce(search, 1000);

  const columns = [
    {
      header: 'Paid On',
      accessorKey: 'created_at',
      cell: ({ getValue }: any) => convertDateFormateApis(getValue(), 'YYYY-MM-DD, hh:mm A'),
    },
    {
      header: 'Invoice #',
      accessorKey: 'bill_no',
    },
    {
      header: 'Amount($)',
      accessorKey: 'tax_detail.total_amount',
      cell: ({ row }: any) =>
        `$${row?.original?.tax_detail?.total_amount || row?.original?.total_amount || 0}`,
    },

    {
      header: 'Description',
      accessorKey: 'desc',
      cell: ({ getValue }: any) => <TruncatedDescriptionCell value={getValue()} />,
    },
    {
      header: 'Payment Mode',
      accessorKey: 'mode',
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }: any) => {
        const value = getValue();
        return (
          <span className={`capitalize ${InvoiceStatusMap[value] || 'text-gray-600 font-medium'}`}>
            {value || '---'}
          </span>
        );
      },
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: ({ row }: any) => {
        const invoice = row?.original;
        const isPaymentCompleted =
          String(invoice?.status || '')
            .trim()
            .toLowerCase() === 'completed';

        return (
          <span className="flex gap-2 items-center">
            <CustomTooltip
              text={isPaymentCompleted ? 'View Invoice' : 'View Failure Description'}
              side="top"
            >
              <span
                className="cursor-pointer flex items-center justify-center rounded-full w-8 h-8 bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white"
                onClick={() => {
                  if (isPaymentCompleted) {
                    setRowData(invoice);
                    setDrawerState(true);
                    return;
                  }

                  setFailureDetails({
                    billNumber: String(invoice?.bill_no || ''),
                    description: String(
                      invoice?.desc || invoice?.description || 'No failure reason available.',
                    ),
                  });
                }}
              >
                <Icon name="EyeLine" className="w-5 h-5" />
              </span>
            </CustomTooltip>
            {/* <span onClick={() => downloadCSVFile(row?.original)}>
              <Icon
                name="Download"
                className="w-5 h-5"
              />
            </span> */}
          </span>
        );
      },
    },
  ];

  const handleDownloadCSV = () => {
    if (!tableRef?.current) return;
    const tableData = tableRef?.current?.getTableData();
    if (!tableData || tableData?.length === 0) {
      handleAlert({ text: 'No data to download', type: 'warning' });
      return;
    }

    // Filter out Action column and format data according to table columns
    const csvColumns = columns.filter((col: any) => col.accessorKey !== 'action');
    const headers = csvColumns.map((col: any) => col.header);

    const csvRows = tableData.map((row: any) => {
      return csvColumns.map((col: any) => {
        const value = row[col.accessorKey];

        // Handle specific field formatting based on column definitions
        if (col.accessorKey === 'created_at') {
          return convertDateFormateApis(value, 'YYYY-MM-DD, hh:mm A');
        }

        if (col.accessorKey === 'status') {
          // Format status with capitalized first letter (same as table display)
          return value ? String(value)?.charAt(0).toUpperCase() + String(value).slice(1) : '';
        }

        // For other columns, return the raw value
        return value || '';
      });
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvRows.map((row: any) =>
        row
          .map((cell: any) => {
            // Escape commas and quotes in cell values
            const cellValue = String(cell || '').replace(/"/g, '""');
            return `"${cellValue}"`;
          })
          .join(','),
      ),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    handleAlert({ text: 'CSV file downloaded successfully', type: 'success' });
  };

  const handleReset = () => {
    setDropdownVal(dropdownInitialVal);
    setSearch('');
  };
  return (
    <section className="w-full overflow-x-auto overflow-y-hidden">
      {/* <Breadcrumb breadcrumbs={breadcrumbData} /> */}

      <div className="flex flex-col sm:flex-row items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
        <p className="text-gray-900 font-semibold text-lg flex items-center gap-1">
          Billing
          <div className="-rotate-90 text-gray-800">
            <Icon name="ChevronIcon" className="w-5 h-5" />
          </div>
          <span className="text-primary text-md">Invoices</span>
        </p>
        <div className="flex gap-2 filters">
          <Input
            placeholder="Search"
            className="pl-10 min-h-9 rounded-lg"
            IconPosition="left-0 pl-2 inset-y-0"
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              if (value.startsWith(' ')) return;
              setSearch(e.target.value);
            }}
            Icon={<SearchLine className=" text-gray-700" />}
          />
          <DateDropdown
            {...{
              dropdownVal,
              setDropdownVal,
            }}
          />

          <Button className="min-h-9" variant={'outline'} onClick={handleReset}>
            Reset
          </Button>
          <Button
            className="cursor-pointer flex items-center justify-center min-h-9 min-w-9 max-w-9 max-h-9 rounded-lg w-9 h-9 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
            onClick={handleDownloadCSV}
          >
            <Icon name="DownloadIcon" className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="w-full p-3 flex flex-col gap-2">
        <TableManager
          {...{
            tableRef,
            columns,
            fetcherKey: 'getInvoice',
            fetcherFn: getInvoice,
            extraParams: {
              filter: [{ key: 'bill_no', value: debouncedSearch }],
              filter_date: { from: dropdownVal?.value?.from, to: dropdownVal?.value?.to },
            },
            emptyTablePlaceholder: 'No invoices for the selected filters',
            descriptionEmptyTable: 'Try adjusting filters or date range.',
          }}
        />

        {drawerState && <InvoiceDetails {...{ info: rowData, drawerState, setDrawerState }} />}
      </div>

      {failureDetails && (
        <Dialog open={true} onOpenChange={(open) => !open && setFailureDetails(null)}>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden bg-white">
            <DialogHeader>
              <DialogTitle>Payment Failure Description</DialogTitle>
              <DialogDescription>
                {failureDetails.billNumber
                  ? `Invoice #${failureDetails.billNumber}`
                  : 'Payment details'}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-800">
                {failureDetails.description}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
};

export default Invoice;
