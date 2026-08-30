/* Every charge raised on the account, and what each one covered.
 *
 * Three things changed here and each was a wrong fact rather than a rough edge:
 *
 * **Amounts printed as "$0"** when the tax record was missing, because the cell
 * fell back to a literal zero. On an invoice list a zero is not a placeholder -
 * it says "you were charged nothing", and somebody reconciling their books
 * against it will believe it. Missing figures now say so.
 *
 * **Dates printed as 2026-08-29, 05:52 AM.** Fine for a log, wrong for a
 * document a finance team reads: the time of day is noise, and the numeric form
 * is ambiguous across countries. Dates are spelled out.
 *
 * **The tax was invisible** unless you opened a modal. A row now opens in place
 * and itemises tax on the line, because "how much of this was tax" is the
 * single most common question asked about a bill.
 *
 * The page moved onto the shared admin shell at the same time, so Billing looks
 * like the rest of the settings area rather than like an older screen that
 * nobody got round to.
 */

import { Icon } from '@/assets/icons/icon';
import { handleAlert } from '@/lib/utils';
import { getInvoice } from '@/services/api';
import TableManager from '@/components/custom/table-manager';
import { useMemo, useRef, useState } from 'react';
import InvoiceDetails from './invoice-details';
import InvoiceLines from './invoice-lines';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dropdownInitialVal } from '@/components/custom/date-dropdown/constant';
import DateDropdown from '@/components/custom/date-dropdown';
import CustomSelect from '@/components/custom/custom-select';
import useDebounce from '@/hooks/use-debounce';
import { SearchLine } from '@/assets/icons';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { AdminPage } from '@/pages/admin-settings/page-shell';
import { UNAVAILABLE, dateOrUnavailable, moneyOrUnavailable } from '@/lib/billing-money';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/* Status as a pill rather than coloured text. Colour alone is not a label -
   somebody who cannot separate red from green still needs to know which of
   these charges failed. */
const StatusPill = ({ value }: { value: string }) => {
  const key = String(value ?? '').toLowerCase();
  const tone =
    key === 'completed'
      ? 'bg-green-100 text-green-700'
      : key === 'failed' || key === 'cancel'
        ? 'bg-red-100 text-red-700'
        : key === 'refunded'
          ? 'bg-blue-100 text-blue-700'
          : key === 'processing' || key === 'pending'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${tone}`}>
      {value || 'Unknown'}
    </span>
  );
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

/* Whole years, newest first, plus the escape hatch.
 *
 * Finance work happens in years — closing one, reconciling last one — and
 * setting a from/to date twice to see a whole year is a chore nobody should
 * have to repeat. Five years back covers anything the platform can hold. */
const yearOptions = () => {
  const now = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => now - i).map((y) => ({
    label: String(y),
    value: String(y),
  }));
  return [{ label: 'All time', value: '' }, ...years];
};

const Invoice = () => {
  const tableRef = useRef<any>(null);
  const [drawerState, setDrawerState] = useState<any>(false);
  const [rowData, setRowData] = useState({});
  const [search, setSearch] = useState<string>('');
  const [dropdownVal, setDropdownVal] = useState(dropdownInitialVal);
  const [year, setYear] = useState<any>({ label: 'All time', value: '' });
  const [failureDetails, setFailureDetails] = useState<{
    billNumber: string;
    description: string;
  } | null>(null);
  const debouncedSearch = useDebounce(search, 1000);

  const years = useMemo(yearOptions, []);

  /* The year filter and the date picker both narrow the same thing, so only one
     can be in charge at a time. Picking a year clears the date range and picking
     a range clears the year — two controls silently fighting over one filter is
     how somebody ends up convinced the platform has lost their invoices. */
  const activeRange = useMemo(() => {
    if (year?.value) {
      return { from: `${year.value}-01-01`, to: `${year.value}-12-31` };
    }
    return { from: dropdownVal?.value?.from, to: dropdownVal?.value?.to };
  }, [year, dropdownVal]);

  const columns = [
    {
      header: 'Date',
      accessorKey: 'created_at',
      cell: ({ getValue }: any) => (
        <span className="whitespace-nowrap">{dateOrUnavailable(getValue())}</span>
      ),
    },
    {
      header: 'Invoice number',
      accessorKey: 'bill_no',
      cell: ({ getValue }: any) => (
        <span className="tabular-nums">{getValue() || UNAVAILABLE}</span>
      ),
    },
    {
      header: 'Amount',
      accessorKey: 'tax_detail.total_amount',
      meta: { textAlign: 'right' },
      cell: ({ row }: any) => (
        <span className="block text-right tabular-nums font-medium text-gray-900">
          {moneyOrUnavailable(
            row?.original?.tax_detail?.total_amount ?? row?.original?.total_amount,
          )}
        </span>
      ),
    },
    {
      header: 'Description',
      accessorKey: 'desc',
      cell: ({ getValue }: any) => <TruncatedDescriptionCell value={getValue()} />,
    },
    {
      header: 'Paid with',
      accessorKey: 'mode',
      cell: ({ getValue }: any) => getValue() || UNAVAILABLE,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }: any) => <StatusPill value={getValue()} />,
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

    const headers = ['Date', 'Invoice number', 'Net', 'Tax', 'Total', 'Description', 'Paid with', 'Status'];
    const csvRows = tableData.map((row: any) => [
      dateOrUnavailable(row?.created_at),
      row?.bill_no ?? '',
      row?.tax_detail?.sub_total ?? '',
      row?.tax_detail?.tax_amount ?? '',
      row?.tax_detail?.total_amount ?? row?.total_amount ?? '',
      row?.desc ?? '',
      row?.mode ?? '',
      row?.status ?? '',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvRows.map((row: any) =>
        row.map((cell: any) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');

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
    setYear({ label: 'All time', value: '' });
    setSearch('');
  };

  return (
    <AdminPage
      section="Billing"
      title="Invoices"
      description="Every charge raised on the account, with its tax broken out. Open a row to see what it covered."
      actions={
        <Button
          className="cursor-pointer flex items-center justify-center min-h-9 min-w-9 max-w-9 max-h-9 rounded-lg w-9 h-9 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
          onClick={handleDownloadCSV}
          title="Download as CSV"
        >
          <Icon name="DownloadIcon" className="w-5 h-5" />
        </Button>
      }
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search by invoice number"
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
          <div className="min-w-[9rem]">
            <CustomSelect
              options={years}
              value={year}
              placeholder="Year"
              handleChange={(option: any) => {
                setYear(option ?? { label: 'All time', value: '' });
                /* Choosing a year takes over from the date range, so the two
                   cannot quietly contradict each other. */
                if (option?.value) setDropdownVal(dropdownInitialVal);
              }}
            />
          </div>
          <DateDropdown
            {...{
              dropdownVal,
              setDropdownVal: (next: any) => {
                setYear({ label: 'All time', value: '' });
                setDropdownVal(next);
              },
            }}
          />
          <Button className="min-h-9" variant={'outline'} onClick={handleReset}>
            Reset
          </Button>
        </div>
      }
    >
      <TableManager
        {...{
          tableRef,
          columns,
          fetcherKey: 'getInvoice',
          fetcherFn: getInvoice,
          extraParams: {
            filter: [{ key: 'bill_no', value: debouncedSearch }],
            filter_date: activeRange,
          },
          /* The row opens in place instead of sending somebody to a modal. The
             expander needs a fetcher to exist, but the lines are already on the
             row, so nothing is requested — this returns an empty result so the
             shared table's success handler has the shape it expects. */
          hasSubRows: true,
          showMoreData: () => true,
          subRowsMutateKey: 'invoice-lines',
          subRowsMutateFn: async () => ({ data: { data: { result: { data: [] } } } }),
          renderSubComponent: (invoice: any) => <InvoiceLines invoice={invoice} />,
          emptyTablePlaceholder: 'No invoices yet',
          descriptionEmptyTable:
            'Charges appear here once your first payment goes through. If you expected something, widen the year or date range.',
        }}
      />

      {drawerState && <InvoiceDetails {...{ info: rowData, drawerState, setDrawerState }} />}

      {failureDetails && (
        <Dialog open={true} onOpenChange={(open) => !open && setFailureDetails(null)}>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden bg-white">
            <DialogHeader>
              <DialogTitle>Why this payment did not go through</DialogTitle>
              <DialogDescription>
                {failureDetails.billNumber
                  ? `Invoice ${failureDetails.billNumber}`
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
    </AdminPage>
  );
};

export default Invoice;
