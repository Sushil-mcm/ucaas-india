import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCcw,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import useDebounce from '@/hooks/use-debounce';
// import { Icon } from '@/assets/icons/icon';
import NotFound from '@/assets/images/not-found-img.svg';
import CustomSelect from './custom-select';
import Loader from './loader';
import { MemoizedTableManagerRow } from './table-manager-row';
import CommonFilter from './custom-filter';
import { handleAlert, normalizeSearchText } from '@/lib/utils';

const pageNumberListLimit = 5;
const perPagesArr = [25, 50, 100, 200];
const defaultSelect = (data: any) => data?.data?.data?.result?.rows;
const defaultOnSuccess = (data: any) => data;
const defaultFetcher = () => {};
const defaultGetSelectedRows = () => null;
const defaultGetRowClassName = () => '';
const defaultSubRowsMutateFn = () => null;
const defaultMakeSubRowPayload = () => null;
const defaultShowMoreData = () => null;
const defaultHandleFilterChange = () => null;
const defaultHandleReset = () => null;
const defaultHandleFilterSelect = () => null;

function TableManager({
  columns,
  onSuccess = defaultOnSuccess,
  loading = false,
  fetcherKey = '',
  fetcherFn = defaultFetcher,
  select = defaultSelect,
  customHeader = null,
  getSelectedRows = defaultGetSelectedRows,
  initiallySelectedRows = {},
  extraParams = {},
  search = '',
  emptyAction,
  staticData,
  showPagination = true,
  loaderTableClass = '',
  type = '',
  getRowClassName = defaultGetRowClassName,
  emptyTablePlaceholder = 'Nothing here yet',
  tableRef,
  isHeightSet = true,
  tableMaxHeight = null,
  hasSubRows = false,
  subRowsMutateKey = '',
  subRowsMutateFn = defaultSubRowsMutateFn,
  makeSubRowPayload = defaultMakeSubRowPayload,
  showMoreData = defaultShowMoreData,
  enabled = true,
  isFilter = false,
  filterFields = [],
  handleFilterChange = defaultHandleFilterChange,
  handleReset = defaultHandleReset,
  filterRef,
  handleFilterSelect = defaultHandleFilterSelect,
  customClass = '',
  descriptionEmptyTable = '',
  imageSize = 'min-w-44  max-w-44',
  clientSideSearch = false,
  renderSubComponent,
  splitStickyHeader = false,
  stickyHeader = true,
  fixedPageRows,
  visibleRowCount,
  defaultPageSize,
  perPageOptions = perPagesArr,
}: Readonly<{
  columns: any;
  loading?: boolean;
  onSuccess?: (data: any) => void;
  customHeader?: any;
  getSelectedRows?: (selectedRows: any, rows: any) => void;
  fetcherKey?: any;
  fetcherFn?: (data: any) => any;
  select?: (response: any) => any;
  initiallySelectedRows?: { [key: string]: boolean };
  getTblData?: any;
  tableRef?: any;
  extraParams?: object;
  search?: string;
  loaderTableClass?: string;
  staticData?: any[];
  showPagination?: boolean;
  type?: string;
  emptyTablePlaceholder?: string;
  /* The button that fixes an empty screen. Shown only when the list is
     genuinely empty, never when a search found nothing - adding something is
     not the answer to a search that missed. */
  emptyAction?: React.ReactNode;
  getRowClassName?: (row: any) => string;
  isHeightSet?: boolean;
  tableMaxHeight?: any;
  hasSubRows?: boolean;
  subRowsMutateKey?: string;
  subRowsMutateFn?: (payload?: any) => any;
  makeSubRowPayload?: (row: any) => any;
  showMoreData?: (row: any) => any;
  enabled?: boolean;
  isFilter?: boolean;
  filterFields?: any[];
  handleFilterChange?: (data: Record<string, any>) => void;
  handleReset?: () => void;
  filterRef?: any;
  handleFilterSelect?: any;
  customClass?: string;
  descriptionEmptyTable?: string;
  imageSize?: string;
  clientSideSearch?: boolean;
  renderSubComponent?: (rowOriginal: any) => React.ReactNode;
  /* Opt-in only — every other caller of this component is completely
     unaffected. Default: the header is `position: sticky` *inside* the
     same scrolling box as the rows, which is what every other page here
     already relies on and still gets. The native vertical scrollbar that
     produces is honest about it, but its track necessarily runs the full
     height of that one scrolling box, header included — no CSS can trim
     where a real scrollbar starts (styled or not, it paints in the
     browser's own compositing layer, above the whole page's stacking
     context, immune to z-index).
     When true: the header renders in its own non-scrolling box above a
     separately-scrolling body, so the real scrollbar only ever spans the
     rows. Column widths are measured off the rendered header cells once
     mounted and pinned to both tables via a shared `<colgroup>`, so an
     otherwise-independent header table and body table still land on the
     same column boundaries. */
  splitStickyHeader?: boolean;
  /* `position: sticky` on the header, combined with its own border-radius
     corner cells, doesn't reliably clip in Chromium once an ancestor also
     has a `transform` — a centered Dialog's `translate(-50%, -50%)` is
     exactly that, so a table dropped into a modal shows square header
     corners poking past the wrapper's rounded ones despite the same
     corner-rounding classes that work everywhere else outside a transformed
     ancestor. Opt out here for that case; every existing caller keeps the
     sticky header (default true) since the bug only shows up combined with
     a transformed ancestor, not on its own. */
  stickyHeader?: boolean;
  /* Opt-in, and only meaningful together with splitStickyHeader. Locks the
     page size to this many rows (hides the "per page" picker, which would
     otherwise contradict "exactly N"), and pads a short last page out with
     blank filler rows so the body always renders exactly this many <tr>s.
     That fixed row count is what removes the scrollbar entirely — the box
     never holds more rows than fit, so it never has anything to scroll.
     Page changes move through data with the pager instead. */
  fixedPageRows?: number;
  /* Opt-in, and only meaningful together with splitStickyHeader (and never
     together with fixedPageRows — that already fixes the row count another
     way). Caps the scroll box's own height to exactly this many rows, using
     the same per-row height fixedPageRows measures, so a page holding more
     rows than this (pagination's own page size, set separately — see
     defaultPageSize) scrolls inside that fixed window instead of growing
     the box to fit all of them. The two numbers are genuinely independent:
     this is "how many rows show before you'd need to scroll," pagination's
     page size is "how many rows are loaded onto the page at all." */
  visibleRowCount?: number;
  /* Opt-in. The pager's own page-size state starts at this value instead
     of the hardcoded 25 — unlike fixedPageRows, the "per page" picker
     stays visible and this number stays fully changeable through it. Pass
     it in perPageOptions too (below) if it should stay reachable from the
     picker after switching away from it. */
  defaultPageSize?: number;
  /* Choices offered by the "per page" picker — defaults to the same
     [25, 50, 100, 200] every other caller already gets. Override when a
     caller's defaultPageSize isn't one of those (e.g. 8), so switching
     away from it and back again is still possible through the picker
     itself rather than only being reachable at first mount. */
  perPageOptions?: number[];
}>) {
  const [rowSelection, setRowSelection] = useState(initiallySelectedRows);
  /* A demo/cached refetch can resolve in well under 100ms - too fast for the
     spin animation to register as "this button did something" rather than a
     flicker. Holding the icon spinning for a minimum stretch makes the click
     visibly land every time, independent of how fast the fetch actually is. */
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [maxPageNumberListLimit, setMaxPageNumberListLimit] = useState(5);
  const [minPageNumberListLimit, setMinPageNumberListLimit] = useState(0);
  const [{ pageIndex, pageSize }, setPagination] = useState({
    pageIndex: 0,
    pageSize: fixedPageRows || defaultPageSize || 25,
  });
  const [perPage, setPerPage] = useState<any>({
    label: fixedPageRows || defaultPageSize || 25,
    value: fixedPageRows || defaultPageSize || 25,
  });
  const debouncedSearch = useDebounce(search, 1000);
  const normalizedSearch = normalizeSearchText(debouncedSearch);
  const [paginationSearch, setPaginationSearch] = useState(normalizedSearch);
  const hasSearchChanged = normalizedSearch !== paginationSearch;
  const effectivePageIndex = hasSearchChanged ? 0 : pageIndex;
  const pagination = useMemo(
    () => ({
      pageIndex: effectivePageIndex,
      pageSize,
    }),
    [effectivePageIndex, pageSize],
  );
  const usesStaticData = staticData !== undefined;
  const hasRemoteFetcher = fetcherFn !== defaultFetcher;
  const isRemoteQueryEnabled = enabled && !usesStaticData && hasRemoteFetcher;

  const payload = {
    page: effectivePageIndex + 1,
    limit: pageSize,
    ...(clientSideSearch ? {} : { search: normalizedSearch || undefined }),
    ...(type && { type }),
    ...extraParams,
  };

  useEffect(() => {
    if (!hasSearchChanged) return;

    setPagination((current) => ({ ...current, pageIndex: 0 }));
    setPaginationSearch(normalizedSearch);
    setMinPageNumberListLimit(0);
    setMaxPageNumberListLimit(pageNumberListLimit);
  }, [hasSearchChanged, normalizedSearch]);

  const {
    data: tbldata,
    isLoading,
    refetch,
    isFetching,
  }: any = useQuery({
    queryFn: ({ queryKey }) => fetcherFn(queryKey[1] || {}),
    queryKey: [`${fetcherKey}`, { ...payload }],
    refetchOnWindowFocus: false,
    retry: false,
    enabled: isRemoteQueryEnabled,
  });

  const tableData = useMemo(() => {
    const rows = usesStaticData ? staticData || [] : select(tbldata) || [];

    if (!clientSideSearch || !normalizedSearch) return rows;

    return rows.filter((row: any) =>
      Object.values(row || {}).some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(normalizedSearch.toLowerCase()),
      ),
    );
  }, [tbldata, staticData, select, normalizedSearch, clientSideSearch, usesStaticData]);

  const table = useReactTable({
    onRowSelectionChange: setRowSelection,
    columns,
    // data: staticData?.length > 0 ? staticData : select(tbldata) || [],
    data: tableData,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row: any, index: number) =>
      String(row?._id ?? row?.id ?? row?.uuid ?? row?.value ?? index),
    /* Static mode has no fetch response to read totalPages off of — it never
       runs the remote query at all, so this always fell through to -1
       ("unknown page count" to react-table), which renders zero page-number
       buttons no matter how many rows there are. Computed from the data
       itself instead, the same fallback the record-count footer already
       uses in this mode. */
    pageCount: usesStaticData
      ? Math.max(1, Math.ceil((tableData?.length || 0) / pageSize))
      : tbldata?.data?.data?.result?.totalPages
        ? tbldata?.data?.data?.result?.totalPages
        : -1,
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination,
      rowSelection,
    },
    onPaginationChange: setPagination,
    /* manualPagination assumes the caller already sliced `data` down to one
       page — true for the remote-fetch modes, where the server returns just
       that page. Static mode hands over its full filtered list every time,
       so with manualPagination left on nothing ever sliced it: every row
       rendered regardless of page size or which page number was "selected".
       Turning it off here lets react-table's own getPaginationRowModel do
       the slicing it already has the state to do.
       Only when pagination is actually shown, though — several callers pass
       staticData with showPagination={false} specifically to render one
       full scrollable list with no pager, relying on nothing slicing it.
       Enabling real slicing there would silently cap them at one page size
       with no control left to reach the rest. */
    manualPagination: !(usesStaticData && showPagination),
    enableRowSelection: true,
  });
  const hasRows = table.getRowModel().rows.length > 0;
  const showInitialLoader = !hasRows && (isLoading || loading);

  /* The data underneath a refresh is often unchanged (demo data, or a real
     list that just hasn't moved) - with no feedback, clicking refresh and
     seeing the exact same rows reads as the button doing nothing. The nudge
     animation fires the instant the click registers (not gated on the fetch
     resolving); the toast confirms once the fetch actually completes. This
     is only wired to the manual refresh icon below, not to `refetchTable()`
     on `tableRef` - that imperative handle is also called after mutations
     (delete/create) that already show their own success toast, and doubling
     up there would stack an unrelated "Refreshed" on top. */
  const handleManualRefetch = () => {
    setIsManualRefreshing(true);
    setTimeout(() => setIsManualRefreshing(false), 450);
    refetch().then(() => handleAlert({ text: 'Refreshed', type: 'success' }));
  };

  const handleNextPage = () => {
    table?.nextPage();
    if (pageIndex === table?.getPageCount() - 1) {
      return false;
    } else {
      if (pageIndex + 2 > maxPageNumberListLimit) {
        setMaxPageNumberListLimit(maxPageNumberListLimit + pageNumberListLimit);
        setMinPageNumberListLimit(minPageNumberListLimit + pageNumberListLimit);
      }
    }
  };
  const handlePreviousPage = () => {
    table?.previousPage();
    if (pageIndex === 0) {
      return;
    } else {
      if (pageIndex % pageNumberListLimit === 0) {
        setMaxPageNumberListLimit(maxPageNumberListLimit - pageNumberListLimit);
        setMinPageNumberListLimit(minPageNumberListLimit - pageNumberListLimit);
      }
    }
  };
  const handleLastPage = () => {
    table?.setPageIndex(table?.getPageCount() - 1);
    const min = table.getPageCount() - 5;
    const max = table.getPageCount();

    setMaxPageNumberListLimit(max);
    setMinPageNumberListLimit(min);
  };
  const handleFirstPage = () => {
    table?.setPageIndex(0);
    const min = 0;
    const max = 5;
    setMaxPageNumberListLimit(max);
    setMinPageNumberListLimit(min);
  };

  useEffect(() => {
    getSelectedRows(rowSelection, select(tbldata));
  }, [rowSelection, tbldata]);

  useEffect(() => {
    onSuccess(tbldata);
  }, [tbldata]);

  useImperativeHandle(
    tableRef,
    () => ({
      refetchTable: () => refetch(),
      getTableData: () => select(tbldata),
      getTableDataCounts: () => tbldata?.data?.data?.result || {},
      getTotal: () => tbldata?.data?.data?.result?.total || 0,
      clearSelection: () => setRowSelection({}),
    }),
    [tbldata, isFetching],
  );

  const [tableHeight, setTableHeight] = useState<number>(350);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  /* splitStickyHeader only: the header table and body table are two
     independent <table>s once the header moves out of the scrolling box,
     so nothing keeps their columns lined up on its own — a <colgroup> with
     matching pixel widths on both is what does that, and these are where
     those widths come from: the body's own first rendered row, measured
     while both tables still lay out normally (auto, unconstrained) — a
     table's auto layout already sizes every column to fit every row in
     it, so one row's rendered cell widths already reflect what the whole
     body needs. (The header's own cells are the wrong source: "NAME" is
     narrower than any actual name, so a header-measured width starves the
     body — that was the bug this replaced.) The header's own natural
     width is still folded in per column, in case a header label is ever
     the widest thing in its column. Once measured, both tables switch to
     `table-layout: fixed` with this shared <colgroup>, which is what
     makes the widths actually hold rather than just hint. Re-measures on
     resize; a column's content width changing after mount (e.g. a badge
     that got longer on some row scrolled out of view) is not watched, since
     it does not happen for any column on the two pages that use this. */
  const headerRowRef = useRef<HTMLTableRowElement | null>(null);
  const [splitColumnWidths, setSplitColumnWidths] = useState<number[]>([]);
  /* fixedPageRows only: a blank filler row (no content) naturally renders
     at the cell's own min-height, which is shorter than a real row here —
     these templates always show a two-line name+subtitle, so every real
     row is taller than that minimum. Measured off the same real body row
     already read above, and pinned onto every filler row below, so a
     short last page still comes out exactly as tall as a full one instead
     of visibly shrinking. */
  const [fixedRowHeight, setFixedRowHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!splitStickyHeader) return;
    const measure = () => {
      const headerRow = headerRowRef.current;
      const bodyContainer = tableScrollRef.current;
      if (!headerRow || !bodyContainer) return;
      const columnCount = headerRow.children.length;
      // A summary/subcomponent/filler row uses colSpan and has fewer <td>s
      // than there are columns — not representative, skip measuring it.
      const bodyRows = Array.from(bodyContainer.querySelectorAll('table > tbody > tr')).filter(
        (row) => row.children.length === columnCount,
      ) as HTMLTableRowElement[];
      const firstBodyRow = bodyRows[0];

      /* scrollWidth, not getBoundingClientRect().width — measured before
         table-layout: fixed is ever applied, the table is still auto-layout
         but still capped at `w-full` (100% of its container), so if every
         column's true content need already added up to more than that
         (nowrap actions icons are the usual culprit), auto-layout had
         already quietly compressed this cell to fit *before* we ever
         measured it. getBoundingClientRect() reports that already-shrunk
         box; scrollWidth reports what the content inside actually needs
         regardless of how the box around it got sized, which is the
         number a fixed column should actually be given. Skipping this
         step is exactly how the Actions column ended up permanently ~20px
         too narrow: it kept getting re-measured off its own prior
         (already too-narrow) rendered width instead of its content's real
         requirement, and every remeasure just echoed the same number
         back.
         Also the MAX across every currently-rendered row, not just the
         first: a column's content isn't guaranteed to be the same width
         on every row (Actions can show a different icon set depending on
         a template's applied-status; Name's subtext length varies), and a
         fixed column never grows to fit a cell that turns out to need
         more than whichever row happened to be measured. */
      const widths = Array.from(headerRow.children).map((headerCell, index) => {
        const headerWidth = (headerCell as HTMLElement).scrollWidth;
        const maxBodyWidth = bodyRows.reduce((max, row) => {
          const cell = row.children[index] as HTMLElement | undefined;
          return cell ? Math.max(max, cell.scrollWidth) : max;
        }, 0);
        return Math.max(headerWidth, maxBodyWidth);
      });
      /* Percent of the row's own total, not raw pixels. Pixels go stale the
         moment table-layout:fixed is applied: a later remeasure at a
         narrower viewport just reads back the cells' current (already
         fixed) width instead of what they'd naturally need now, so the
         table stayed pinned at its first-measured width and started
         overflowing/cutting off text the moment the window was narrower
         than that. A ratio of the total scales down with it for free —
         every cell shrinks by the same factor, so the ratio itself never
         goes stale, measured again or not. */
      const totalWidth = widths.reduce((sum, w) => sum + w, 0) || 1;
      const percentWidths = widths.map((w) => (w / totalWidth) * 100);

      setSplitColumnWidths((current) =>
        current.length === percentWidths.length &&
        current.every((w, i) => Math.abs(w - percentWidths[i]) < 0.1)
          ? current
          : percentWidths,
      );

      if ((fixedPageRows || visibleRowCount) && firstBodyRow) {
        const height = firstBodyRow.getBoundingClientRect().height;
        setFixedRowHeight((current) => (current && Math.abs(current - height) < 1 ? current : height));
      }
    };
    measure();
    const raf = window.requestAnimationFrame(measure);
    const resizeObserver = new ResizeObserver(measure);
    if (headerRowRef.current) resizeObserver.observe(headerRowRef.current);
    if (tableScrollRef.current) resizeObserver.observe(tableScrollRef.current);
    window.addEventListener('resize', measure);
    return () => {
      window.cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [splitStickyHeader, columns, fixedPageRows, visibleRowCount, pageIndex]);

  const splitColGroup =
    splitStickyHeader && splitColumnWidths.length ? (
      <colgroup>
        {splitColumnWidths.map((width, index) => (
          <col key={index} style={{ width: `${width}%` }} />
        ))}
      </colgroup>
    ) : null;

  const adjustTableHeight = () => {
    const windowHeight = window.innerHeight;
    const offsetTop = tableScrollRef.current?.getBoundingClientRect()?.top || 0;
    const nextHeight = Math.max(windowHeight - offsetTop - 58 - 8, 260);

    setTableHeight((currentHeight) => (currentHeight === nextHeight ? currentHeight : nextHeight));
  };

  useEffect(() => {
    let resizeRaf = 0;
    const scheduleAdjustTableHeight = () => {
      if (resizeRaf) {
        window.cancelAnimationFrame(resizeRaf);
      }

      resizeRaf = window.requestAnimationFrame(() => {
        resizeRaf = 0;
        adjustTableHeight();
      });
    };

    adjustTableHeight();
    window.addEventListener('resize', scheduleAdjustTableHeight);

    const resizeObserver = new ResizeObserver(scheduleAdjustTableHeight);

    if (tableScrollRef.current) {
      resizeObserver.observe(tableScrollRef.current);
    }

    if (tableScrollRef.current?.parentElement) {
      resizeObserver.observe(tableScrollRef.current.parentElement);
    }

    return () => {
      window.removeEventListener('resize', scheduleAdjustTableHeight);
      if (resizeRaf) {
        window.cancelAnimationFrame(resizeRaf);
      }
      resizeObserver.disconnect();
    };
  }, []);
  /* Shared by both the split-header table and (when splitStickyHeader is
     false) the ordinary single-table header — kept as one definition so the
     two render paths can't drift out of sync with each other.
     extraThClass carries the non-split path's own header styling (solid
     header background + corners rounded to match its outer clipping
     wrapper — see that branch below for why) without baking it into the
     split-header path, which paints its header box a different colour and
     rounds its own outer corners already. */
  const renderHeaderRow = (extraThClass = '') =>
    table.getHeaderGroups().map((headerGroup) => (
      <TableRow key={headerGroup.id} ref={splitStickyHeader ? headerRowRef : undefined}>
        {hasSubRows && (
          <TableHead
            className={`px-2 xl:px-4 py-2 font-bold border-b border-[#EEE7DD] last-of-type:border-r-0 text-black ${extraThClass}`}
          ></TableHead>
        )}
        {headerGroup.headers.map((header: any, headerIndex: number) => {
          const textAlign =
            header.id === 'action' ? 'center' : header.column.columnDef?.meta?.textAlign;
          /* Tailwind's compiler only picks up complete class-name
             strings it can find in source — `text-${textAlign}`
             never matched anything, so every "center"/"right"
             alignment on every table in the app silently rendered
             as left the whole time (the class was in the DOM, the
             CSS rule just never got generated). A literal ternary
             gives it the whole class names to find.
             Even fixed, a plain class still loses: `.mcm-page th`
             (mcm-page.css) sets text-align:left on every <th> in
             the app at higher specificity than a single utility
             class. The `!` modifier forces !important so a
             column's own alignment choice actually wins. */
          const alignClass =
            textAlign === 'center'
              ? '!text-center'
              : textAlign === 'right'
                ? '!text-right'
                : 'text-left';

          return (
            <TableHead
              key={`${header.id}_${headerIndex}`}
              className={`px-2 xl:px-4 py-2 font-bold ${alignClass} border-b  border-[#EEE7DD] last-of-type:border-r-0 text-black ${extraThClass}`}
            >
              {header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, header.getContext())}
            </TableHead>
          );
        })}
      </TableRow>
    ));
  const headerRowContent = renderHeaderRow();

  const bodyContent = (
    <>
      {isFilter && !splitStickyHeader && (
        <CommonFilter
          fields={filterFields}
          onFilterChange={handleFilterChange}
          handleReset={handleReset}
          handleFilterSelect={handleFilterSelect}
          ref={filterRef}
        />
      )}

      <Table
        className="w-full text-xs xxl:text-sm text-[#2E2D35] h-full "
        style={splitColGroup ? { tableLayout: 'fixed' } : undefined}
      >
        {splitColGroup}
        {!splitStickyHeader && (
          <TableHeader
            className={`bg-[#FBE2C8] text-black ${stickyHeader ? 'sticky top-0 left-0 z-10 isolate' : ''}`}
            style={{ backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
          >
            {/* bg-[#FBE2C8] + first/last:rounded-*-xl on each cell (not just
                the shared TableHeader row above) — this header sits inside
                the same clipped-corner wrapper the non-split scroll box
                got below, and a sticky descendant can't inherit an
                ancestor's corner clip in Chromium (position:sticky +
                overflow + border-radius), so the corner cells round
                themselves to match instead. */}
            {renderHeaderRow('bg-[#FBE2C8] first:rounded-tl-xl last:rounded-tr-xl')}
          </TableHeader>
        )}

        <TableBody className="divide-y divide-[#EEE7DD] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] h-full w-full font-normal">
          {hasRows
              ? table.getRowModel().rows.map((row) => {
                  const isSummaryRow = row.original?.isSummary;

                  if (isSummaryRow) {
                    return (
                      <TableRow key={row.id}>
                        <TableCell
                          colSpan={columns.length - 1}
                          className="px-2 xl:px-4 py-2 border-b  border-[#EEE7DD] text-right font-normal"
                        >
                          {row.original.desc}
                        </TableCell>
                        <TableCell className="px-4 py-2 border-b  border-[#EEE7DD] font-normal">
                          {row.original.total_price}
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <MemoizedTableManagerRow
                      row={row}
                      key={row?.id}
                      hasSubRows={hasSubRows}
                      subRowsMutateFn={subRowsMutateFn}
                      subRowsMutateKey={subRowsMutateKey}
                      makeSubRowPayload={makeSubRowPayload}
                      columns={columns}
                      getRowClassName={getRowClassName}
                      showMoreData={showMoreData}
                      renderSubComponent={renderSubComponent}
                    />
                  );
                })
              : null}
            {/* A short last page (or any page, once the data runs out) still
                fills out to fixedPageRows <tr>s so the box's height never
                changes between pages — that constant height is the whole
                reason fixedPageRows removes the scrollbar. Blank, not
                borrowed content: inventing placeholder text here would read
                as real, empty rows. */}
            {fixedPageRows && hasRows && table.getRowModel().rows.length < fixedPageRows
              ? Array.from({ length: fixedPageRows - table.getRowModel().rows.length }).map(
                  (_, fillerIndex) => (
                    <TableRow key={`filler_${fillerIndex}`} className="pointer-events-none">
                      <TableCell
                        colSpan={columns.length + (hasSubRows ? 1 : 0)}
                        className="h-11 min-h-11 border-b border-gray-200"
                        style={fixedRowHeight ? { height: fixedRowHeight } : undefined}
                      />
                    </TableRow>
                  ),
                )
              : null}
          </TableBody>
        </Table>
        {showInitialLoader ? (
          <div
            className={`flex flex-col justify-center items-center gap-2 ${fixedPageRows ? '' : 'h-[calc(100%_-_45px)]'} w-full mx-auto ${loaderTableClass}`}
            style={fixedPageRows ? { height: fixedPageRows * (fixedRowHeight || 44) } : undefined}
          >
            <Loader variant="blue" />
          </div>
        ) : !hasRows ? (
          /* A search that found nothing and an account with nothing in it looked
             identical, so somebody who mistyped a name was told the same thing as
             somebody who has not set anything up. They are different problems and
             need different words - and offering "add your first one" to somebody
             whose search simply missed would be actively unhelpful. */
          <div
            className={`mx-auto flex ${fixedPageRows ? '' : 'h-[calc(100%_-_45px)]'} w-full flex-col items-center justify-center gap-2 py-5 text-center`}
            style={fixedPageRows ? { height: fixedPageRows * (fixedRowHeight || 44) } : undefined}
          >
            <img src={NotFound} alt="" className={imageSize} />
            {String(search || '').trim() ? (
              <>
                <p className="text-md font-medium text-[#2E2D35]">
                  Nothing matches &ldquo;{String(search).trim()}&rdquo;
                </p>
                <p className="max-w-md text-sm text-[#2E2D35]">
                  Check the spelling, or clear the search to see everything.
                </p>
              </>
            ) : (
              <>
                <p className="text-md font-medium text-[#2E2D35]">{emptyTablePlaceholder}</p>
                {descriptionEmptyTable ? (
                  <p className="max-w-md text-sm text-[#2E2D35]">{descriptionEmptyTable}</p>
                ) : null}
                {emptyAction ? <div className="pt-2">{emptyAction}</div> : null}
              </>
            )}
          </div>
        ) : null}

        {/* {!table.getRowModel().rows?.length && !isLoading && !isFetching && (
          <div className="flex flex-col justify-center items-center gap-1 py-5 h-[calc(100%_-_45px)] w-full mx-auto">
            <Icon name="NotFound" className="text-gray-500 w-15 h-15" />
            <p className="text-sm text-gray-700">{emptyTablePlaceholder}</p>
          </div>
        )}
        {((!table.getRowModel().rows?.length && isLoading && isFetching) ||
          (!table.getRowModel().rows?.length && loading)) && (
          <div className="flex flex-col justify-center items-center gap-2 h-[calc(100%_-_45px)] w-full mx-auto">
            <Loader variant="blue" />
          </div>
        )} */}
    </>
  );

  return (
    <>
      {customHeader && (
        <div className="border-b border-b-[#EEE7DD] ">
          <div className="px-3 py-2 ">{customHeader}</div>
        </div>
      )}

      {splitStickyHeader ? (
        /* Header and body are two separately-laid-out <table>s stacked in a
           non-scrolling outer box, so the real vertical scrollbar (owned by
           the inner box below) only ever spans the rows — it can no longer
           run through the header, because the header isn't inside the same
           scrolling element any more. splitColGroup keeps their column
           boundaries pinned to each other despite that split. */
        <div
          /* fixedPageRows must always show its full 8 rows — never
             compress. h-full/min-h-0 (stretching this box down to match a
             sibling panel's bounded height) is only right for the plain
             scrolling case; under fixedPageRows it was squeezing the box
             shorter than 8 real rows whenever the row it shares with an
             insights panel didn't have quite enough height, which is
             exactly what forced a scrollbar back into a table that was
             supposed to never have one. Left at its natural content height
             instead, so it can't be compressed — a sibling panel's own
             h-full then simply matches whatever that natural height turns
             out to be. */
          /* flex-1, not h-full: this box has a sibling below it now
             whenever pagination shows (the pager bar, rendered after this
             whole splitStickyHeader block) — h-full claims 100% of
             .templates-table's own height regardless of what that sibling
             needs, squeezing the pager out of the visible area entirely.
             flex-1 fills whatever's actually left once the pager (its own
             natural height, shrink-0 in templates-table.css) has taken
             its share. */
          className={`flex flex-col overflow-hidden rounded-[20px] border border-[#efe2cf] bg-white ${
            fixedPageRows || visibleRowCount ? '' : 'flex-1 min-h-0'
          } ${customClass}`}
          style={{ boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(20,20,20,0.06))' }}
        >
          <div className="shrink-0 bg-[#faf5ee]">
            <Table
              className="w-full text-xs xxl:text-sm text-[#2E2D35]"
              style={splitColGroup ? { tableLayout: 'fixed' } : undefined}
            >
              {splitColGroup}
              <TableHeader
                className="bg-[#faf5ee] text-black"
                style={{ backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
              >
                {headerRowContent}
              </TableHeader>
            </Table>
          </div>
          <div
            ref={tableScrollRef}
            /* Sized by flex (fills whatever height the row it shares with a
               sibling panel actually has), not by the window-height-minus-
               offset arithmetic `adjustTableHeight` uses for the default
               (non-split) path below. That JS math measures offsetTop from
               this div, which used to be the same box the header sat
               inside — now the header sits above it in its own box, so the
               same formula came out ~header-height too tall here, letting
               the table overrun its row and drag a sibling panel (e.g. an
               insights column) into the page's own scroll along with it
               instead of each scrolling on its own. flex-1/min-h-0 lets the
               browser settle the real height instead of guessing at it. An
               explicit tableMaxHeight still wins when a caller sets one.
               fixedPageRows skips all of that: with the row count pinned to
               exactly fixedPageRows (real rows padded out with blanks,
               below), the box's natural height never exceeds what fits, so
               there is nothing to scroll and no height to compute.
               visibleRowCount is the other explicit case: however many
               rows pagination actually loads onto the page (its own page
               size, independent of this number), only visibleRowCount of
               them show before the rest scroll — height pinned to
               visibleRowCount * a real measured row height, same
               fixedRowHeight fixedPageRows measures. */
            className={
              fixedPageRows
                ? 'table-scroll bg-white'
                : `overflow-auto table-scroll bg-white ${
                    tableMaxHeight || visibleRowCount ? '' : 'min-h-0 flex-1'
                  }`
            }
            style={
              fixedPageRows
                ? undefined
                : tableMaxHeight
                  ? { height: tableMaxHeight }
                  : visibleRowCount && fixedRowHeight
                    ? { height: visibleRowCount * fixedRowHeight }
                    : undefined
            }
          >
            {bodyContent}
          </div>
        </div>
      ) : (
        /* The rounded corner + clip live on this outer, non-scrolling
           wrapper. Putting them on the scrollable element itself let the
           sticky header's own background escape the corner clip in
           Chromium (a known overflow+border-radius+position:sticky
           interaction), leaving a sliver of the wrapper's paler background
           showing through at the top corners. A sticky descendant can't
           escape an ancestor that isn't also the scroll container, so this
           clips reliably. */
        <div className="rounded-xl border border-[rgba(225,200,165,0.9)] overflow-hidden">
          {/* `rounded-xl` repeated here, matching the outer wrapper — a
              second, distinct Chromium quirk from the sticky-header one
              above: this div's own `overflow-auto` promotes it to a
              scrolling layer, and that layer's paint doesn't reliably
              respect an ANCESTOR's border-radius clip at the bottom edge
              even when the ancestor's overflow-hidden works everywhere
              else. Giving the scroller its own matching radius clips its
              content directly instead of relying on the parent to do it. */}
          <div
            ref={tableScrollRef}
            className={`overflow-auto table-scroll rounded-xl bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] ${customClass}`}
            style={
              isHeightSet && showPagination ? { height: tableMaxHeight || `${tableHeight}px` } : {}
            }
          >
            {bodyContent}
          </div>
        </div>
      )}

      {showPagination && (
        // Upstream's warm card treatment for the bar. `sm:w-full` on the
        // inner wrapper below is kept: it hugged its contents, so
        // `justify-between` had no slack and both groups bunched at the
        // left instead of the pager sitting out at the right corner.
        <div className="z-10 flex w-full flex-col gap-2 rounded-xl border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-2 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:w-full sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 font-semibold sm:gap-3">
              <div className="flex flex-wrap items-center gap-3 sm:divide-x sm:divide-[#EEE7DD]">
                {!fixedPageRows && (
                  <div className="flex items-center gap-2">
                    <div className="w-20 tableSelect">
                      <CustomSelect
                        options={perPageOptions?.map((page) => ({
                          label: page,
                          value: page,
                        }))}
                        handleChange={(value) => {
                          setPerPage(value);
                          setPagination({
                            pageIndex: 0,
                            pageSize: value.value,
                          });
                          setMinPageNumberListLimit(0);
                          setMaxPageNumberListLimit(pageNumberListLimit);
                        }}
                        value={perPage}
                        menuPlacement="top"
                      />
                    </div>
                    <Label className="text-[#2E2D35]/80 sm:pr-3">per page</Label>
                  </div>
                )}
                <Label className="text-[#2E2D35]/80 sm:pl-3">
                  {/* Static mode has no fetch response to read a total off of —
                      tableData is already the caller's full (filtered) list in
                      that case, so its length IS the total. */}
                  {tbldata?.data?.data?.result?.totalItems ||
                    tbldata?.data?.data?.result?.total ||
                    (usesStaticData ? tableData?.length : 0) ||
                    0}{' '}
                  record(s)
                </Label>
              </div>
              <Button
                className="table-refresh-btn cursor-pointer text-[#2E2D35]/80 hover:text-white rounded-full border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px]"
                type="button"
                variant={'ghost'}
                onClick={() => handleManualRefetch()}
              >
                <RefreshCcw
                  width={16}
                  height={16}
                  className={`cursor-pointer ${isManualRefreshing ? 'animate-refresh-nudge' : ''}`}
                />
              </Button>
            </div>
            <div className="mcm-pager flex flex-wrap items-center justify-between gap-1 sm:justify-end">
              <Button
                className="mcm-pager-btn"
                variant={'ghost'}
                type="button"
                onClick={() => handleFirstPage()}
                disabled={!table?.getCanPreviousPage()}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                className="mcm-pager-btn"
                variant={'ghost'}
                type="button"
                onClick={() => handlePreviousPage()}
                disabled={!table?.getCanPreviousPage()}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {table?.getPageOptions()?.map((page, index) => {
                let start = pageIndex - Math.floor(pageNumberListLimit / 2);
                let end = pageIndex + Math.ceil(pageNumberListLimit / 2);
                if (start < 0) {
                  end += Math.abs(start);
                  start = 0;
                }
                if (page < end && page >= start) {
                  return (
                    <div
                      /* The pager's sizing and states live in `.mcm-pager-*`
                         so every control in the group shares one size and
                         radius; upstream's inline classes styled the page
                         number differently from the arrows beside it. */
                      className={`mcm-pager-page ${
                        table?.getState()?.pagination?.pageIndex === index ? 'is-current' : ''
                      }`}
                      key={page}
                      onClick={() => table?.setPageIndex(index)}
                    >
                      {page + 1}
                    </div>
                  );
                } else {
                  return null;
                }
              })}

              <Button
                className="mcm-pager-btn"
                type="button"
                variant={'ghost'}
                onClick={() => handleNextPage()}
                disabled={!table?.getCanNextPage()}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                className="mcm-pager-btn"
                type="button"
                variant={'ghost'}
                onClick={() => handleLastPage()}
                disabled={!table?.getCanNextPage()}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
const MemoizedTableManager = memo(TableManager);
export default MemoizedTableManager;
