import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import ReactDatePicker from 'react-datepicker';
import moment from 'moment';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Icon } from '@/assets/icons/icon';
import { handleDate } from './constant';
import CustomSelect from '../custom-select';
import { Button } from '@/components/ui/button';
import './date-picker-theme.css';

/** Month/year picker in the calendar header — a hand-built dropdown
 *  instead of `CustomSelect` (react-select). react-select's own
 *  value-container/indicator padding couldn't be trimmed enough to match
 *  a native `<select>`'s footprint, so using it here kept widening this
 *  calendar past its own day-grid — tried twice, reverted both times.
 *  This trigger is sized identically to the native select it replaces
 *  (same box, border, chevron); only the open list — the one part CSS
 *  could never restyle on a native `<select>` — is actually new here. */
const MiniMonthYearSelect = ({
  value,
  options,
  onChange,
  variant,
}: {
  value: number;
  options: { label: string; value: number }[];
  onChange: (value: number) => void;
  /* "September" needs real width; "2026" doesn't — sizing both the same
     either clips the month name or gives the year control that much
     unused space, widening the header (and with it the calendar) past
     what it needs. */
  variant: 'month' | 'year';
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={rootRef} className="mcm-mini-select">
      <button
        type="button"
        className={`mcm-mini-select-trigger mcm-mini-select-trigger-${variant}${isOpen ? ' is-open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {selected?.label}
      </button>
      {isOpen && (
        <div className="mcm-mini-select-menu">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`mcm-mini-select-option${option.value === value ? ' is-selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const MONTH_OPTIONS = moment.months().map((label, value) => ({ label, value }));
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 12 }, (_, index) => CURRENT_YEAR - index).map(
  (year) => ({ label: String(year), value: year }),
);

const renderDatePickerHeader = ({
  date,
  changeYear,
  changeMonth,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}: any) => (
  <div className="mcm-datepicker-header">
    <button
      type="button"
      className="mcm-datepicker-nav"
      onClick={decreaseMonth}
      disabled={prevMonthButtonDisabled}
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
    <MiniMonthYearSelect
      value={date.getMonth()}
      options={MONTH_OPTIONS}
      onChange={changeMonth}
      variant="month"
    />
    <MiniMonthYearSelect
      value={date.getFullYear()}
      options={YEAR_OPTIONS}
      onChange={changeYear}
      variant="year"
    />
    <button
      type="button"
      className="mcm-datepicker-nav"
      onClick={increaseMonth}
      disabled={nextMonthButtonDisabled}
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  </div>
);

/** The label lives inside the same bordered box as the value — one card
 *  reading "FROM / Sep 2, 2026" — rather than a label floating above a
 *  separate input, which is what `react-datepicker`'s own `customInput`
 *  slot is for. A plain div rather than a `<button>`: the browser's own
 *  button reset (transparent background, no border) was landing after this
 *  component's own CSS in the bundle and winning, so the card's background
 *  and border were being silently stripped back to nothing. */
const DateFieldInput = forwardRef<
  HTMLDivElement,
  { label: string; value?: string; onClick?: () => void; placeholder?: string }
>(({ label, value, onClick, placeholder }, ref) => (
  <div
    ref={ref}
    onClick={onClick}
    role="button"
    tabIndex={0}
    aria-label={label}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') onClick?.();
    }}
    className="mcm-date-input"
  >
    <span className={`mcm-date-field-value${value ? '' : ' is-placeholder'}`}>
      {value || placeholder || 'Select date'}
    </span>
  </div>
));
DateFieldInput.displayName = 'DateFieldInput';

/* The closed pill shows this instead of the full option label — "Last 30
   Days" becomes "30 Days" — for callers tight on horizontal space (the
   phone console's calls-tabs-row). The open menu is unaffected: it always
   lists the full label. */
const shortenDateLabel = (label: string) => String(label || '').replace(/^Last\s+/i, '');

export type DateDropdownHandle = {
  /** Opens the Date Range floating panel — for a caller-rendered element
   *  (the toolbar's own "Sep 2 – Sep 3" pill, outside this component's own
   *  DOM) to trigger it in one click instead of needing the preset select
   *  reopened and "Date Range" re-picked from it. No-op when the current
   *  preset isn't 'Custom' at all, since there is nothing to open. */
  openRangePanel: () => void;
};

const DateDropdown = forwardRef<DateDropdownHandle, any>(
  (
    {
      dropdownVal,
      setDropdownVal = () => {},
      customPickerPlacement = 'inline',
      shortenSelectedLabel = false,
      // Callers that embed this as the first segment of a pill (Performance's
      // filter pill) need the scoped `.mcm-date-preset` rules in index.css —
      // transparent background, rounded only on the left. Everywhere else
      // that's a standalone box, that reads as broken (see-through, half
      // square), so this is a prop rather than a hardcoded default.
      inputClass = 'mcm-date-preset',
    }: any,
    forwardedRef,
  ) => {
    const showCustomPickerBelow = customPickerPlacement === 'bottom';
    const toDatePickerRef = useRef<any>(null);
    // `date_type` stays 'Custom' after Apply (it's what keeps the preset
    // select showing "Date Range"), so the panel's own open/closed state
    // can't just follow it — this tracks that separately. Re-picking "Date
    // Range" from the preset select (even when it's already selected) opens
    // it again via updateDateState below.
    const [isRangePanelOpen, setIsRangePanelOpen] = useState(false);
    const [dateRange, setDateRange] = useState<any>({
      from: moment().format('YYYY-MM-DD'),
      to: moment().format('YYYY-MM-DD'),
    });

    const [timeRange, setTimeRange] = useState({
      from: '',
      to: '',
    });

    const { dateOptions = [], date_type = '' } = dropdownVal;

    const rangePanelRef = useRef<HTMLDivElement | null>(null);
    const presetTriggerRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(
      forwardedRef,
      () => ({
        openRangePanel: () => {
          if (date_type !== 'Custom') return;
          setIsRangePanelOpen(true);
        },
      }),
      [date_type],
    );

    // Click-outside-to-dismiss: a mousedown anywhere that isn't the panel
    // itself, the preset select that reopens it, or the calendar popup
    // (rendered through `portalId="mcm-datepicker-portal"` — physically
    // outside this component's own DOM subtree, in a body-level portal
    // node, so `rangePanelRef` alone would never contain a click on a day
    // in the calendar) closes the panel. Only wired up while the panel is
    // actually open, so it costs nothing the rest of the time.
    useEffect(() => {
      if (!isRangePanelOpen) return;
      const handlePointerDown = (event: MouseEvent) => {
        const target = event.target as Node;
        if (rangePanelRef.current?.contains(target)) return;
        if (presetTriggerRef.current?.contains(target)) return;
        if (document.getElementById('mcm-datepicker-portal')?.contains(target)) return;
        setIsRangePanelOpen(false);
      };
      document.addEventListener('mousedown', handlePointerDown);
      return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [isRangePanelOpen]);

    const updateDateState = (value: any) => {
      setDropdownVal((prev: any) => ({
        ...prev,
        date_type: value,
        value: ['Custom', 'Custom Date/Time'].includes(value) ? prev.value : handleDate(value),
      }));
      if (value === 'Custom') {
        setIsRangePanelOpen(true);
      }
      if (value === 'Custom Date/Time') {
        setDateRange((prev: any) => ({
          ...prev,
          from: moment().format('YYYY-MM-DD'),
          to: moment().format('YYYY-MM-DD'),
        }));
        setTimeRange((prev) => ({ ...prev, from: '', to: '' }));
      }
    };

    const isValidTime = (time: any) => {
      return moment(time, 'HH:mm', true).isValid();
    };

    // Rendered once, referenced from both the single-row (bottom-placement)
    // and the original wrapped-row (inline-placement) layouts below — the
    // pickers themselves are identical either way, only the surrounding
    // structure differs, so this avoids two drifting copies of the same
    // ReactDatePicker markup.
    const fromPicker = (
      <ReactDatePicker
        placeholderText="Select date"
        selected={dateRange.from ? new Date(dateRange.from) : null}
        onChange={(date) => {
          setDateRange((prev: any) => ({
            ...prev,
            from: date,
            to: prev.to && date && new Date(prev.to) < date ? date : prev.to,
          }));
          // Picking a start date is step one of two — open the "To"
          // calendar right away instead of making the user reach for
          // it themselves. The timeout lets this picker's own popper
          // finish closing first.
          window.setTimeout(() => toDatePickerRef.current?.setOpen(true), 0);
        }}
        maxDate={moment().toDate()}
        renderCustomHeader={renderDatePickerHeader}
        dateFormat="MMM d, yyyy"
        calendarClassName="mcm-datepicker"
        className="mcm-date-input"
        customInput={<DateFieldInput label="From" />}
        popperPlacement={showCustomPickerBelow ? 'bottom-start' : undefined}
        portalId="mcm-datepicker-portal"
      />
    );
    const toPicker = (
      <ReactDatePicker
        ref={toDatePickerRef}
        placeholderText="Select date"
        selected={dateRange.to ? new Date(dateRange.to) : null}
        onChange={(date) => setDateRange((prev: any) => ({ ...prev, to: date }))}
        minDate={dateRange.from ? new Date(dateRange.from) : undefined}
        maxDate={moment().toDate()}
        renderCustomHeader={renderDatePickerHeader}
        dateFormat="MMM d, yyyy"
        calendarClassName="mcm-datepicker"
        className="mcm-date-input"
        customInput={<DateFieldInput label="To" />}
        popperPlacement={showCustomPickerBelow ? 'bottom-end' : undefined}
        portalId="mcm-datepicker-portal"
      />
    );

    const applyRange = () => {
      setDropdownVal((prev: any) => ({
        ...prev,
        value: handleDate(date_type, dateRange),
      }));
      setIsRangePanelOpen(false);
    };

    return (
      <div className="relative flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <div ref={presetTriggerRef} className="w-full min-w-0 sm:w-40 lg:w-44">
          <CustomSelect
            options={dateOptions.map(({ label, value }: any) => ({ label, value }))}
            value={dateOptions?.find((opt: any) => opt.value === date_type) || null}
            handleChange={(selectedOption) => {
              updateDateState(selectedOption?.value);
            }}
            // A fixed, short preset list (Today, Last 7 Days, Date Range…) —
            // click-to-pick reads as a real dropdown; a text cursor inside it
            // invited typing that this list was never built to search.
            isSearchable={false}
            // Scopes the rendered menu/option classes to
            // `.mcm-date-preset.custom-react-select__*` (date-picker-theme.css)
            // instead of the app-wide `.custom-react-select__*` rules — this
            // is the one select where all 7 options should always fit without
            // its own scrollbar, which the shared 200px cap doesn't allow.
            inputClass={inputClass}
            FormatOptionLabel={
              shortenSelectedLabel
                ? ({ option, context }: any) => (
                    <span>
                      {context === 'value' ? shortenDateLabel(option?.label) : option?.label}
                    </span>
                  )
                : null
            }
          />
        </div>
        {date_type && date_type === 'Custom' && isRangePanelOpen ? (
          showCustomPickerBelow ? (
            // Single sleek row — From, To, Reset, Apply all on one line,
            // rather than the From/To pair stacked over a second row of
            // Clear/Apply. A slim ~46px glass bar instead of a taller,
            // two-line card.
            <div
              ref={rangePanelRef}
              className="mcm-date-range-bar absolute right-0 top-full z-50 mt-2 flex w-fit flex-row flex-nowrap items-center gap-2 whitespace-nowrap rounded-2xl border border-[rgba(225,200,165,0.9)] bg-[#fdfbf8] px-2.5 py-2 shadow-lg"
            >
              <div className="mcm-date-field w-[120px] flex-none">{fromPicker}</div>
              <div className="mcm-date-field w-[120px] flex-none">{toPicker}</div>
              <button
                type="button"
                title="Clear"
                className="mcm-date-clear-btn flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[rgba(225,200,165,0.9)] bg-white text-[#9A948F] transition-colors hover:border-primary hover:text-primary"
                onClick={() => setDateRange((prev: any) => ({ ...prev, from: '', to: '' }))}
              >
                <Icon name="CloseIcon" className="h-3.5 w-3.5" />
              </button>
              <Button
                variant={'primary'}
                disabled={!dateRange?.to}
                className="mcm-date-apply-btn h-7 min-h-7 max-h-7 shrink-0 rounded-full px-3.5 py-0"
                onClick={applyRange}
              >
                Apply
              </Button>
            </div>
          ) : (
            <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
              {/* Two independent single-month pickers rather than one connected
                  two-month range calendar — "From" only ever opens its own
                  calendar, "To" its own, so picking a start date never leaves a
                  second month sitting open beside it. */}
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
                <div className="mcm-date-field">{fromPicker}</div>
                <div className="mcm-date-field">{toPicker}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  title="Clear"
                  className="mcm-date-clear-btn flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[rgba(225,200,165,0.9)] bg-white text-[#9A948F] transition-colors hover:border-primary hover:text-primary"
                  onClick={() => setDateRange((prev: any) => ({ ...prev, from: '', to: '' }))}
                >
                  <Icon name="CloseIcon" className="h-3.5 w-3.5" />
                </button>
                <Button
                  variant={'primary'}
                  disabled={!dateRange?.to}
                  className="mcm-date-apply-btn h-9 min-h-9 max-h-9 shrink-0 rounded-lg px-2.5 py-0"
                  onClick={applyRange}
                >
                  Apply
                </Button>
              </div>
            </div>
          )
        ) : date_type && date_type === 'Custom Date/Time' ? (
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
            <div className="min-w-0 flex-1 sm:w-36 sm:flex-none">
              <ReactDatePicker
                placeholderText="Select time"
                selected={dateRange.from ? new Date(dateRange.from) : undefined}
                onChange={(date) => {
                  setDateRange((prev: any) => ({
                    ...prev,
                    from: date,
                    to: date,
                  }));
                }}
                className="h-9 w-full min-w-0 rounded-lg border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 text-sm shadow-none hover:border-primary focus:border-primary focus:outline-none"
                showMonthDropdown
                showYearDropdown
                peekNextMonth
                dropdownMode="select"
                dateFormat="yyyy-MM-dd"
                maxDate={moment().toDate()}
              />
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-none">
              <ReactDatePicker
                placeholderText="Start"
                selected={
                  isValidTime(timeRange.from) ? moment(timeRange.from, 'HH:mm').toDate() : null
                }
                onChange={(time) => {
                  const formattedStartTime = moment(time).format('HH:mm');
                  const newEndTime = moment(time).add(15, 'minutes').format('HH:mm');
                  setTimeRange((prev) => ({
                    ...prev,
                    from: formattedStartTime,
                    to: newEndTime,
                  }));
                }}
                className="h-9 w-full min-w-0 rounded-lg border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 text-sm shadow-none hover:border-primary focus:border-primary focus:outline-none"
                showTimeSelect
                showTimeSelectOnly
                timeFormat="HH:mm"
                timeIntervals={15}
                timeCaption="Start Time"
                dateFormat="HH:mm"
              />
              <ReactDatePicker
                placeholderText="End"
                selected={isValidTime(timeRange.to) ? moment(timeRange.to, 'HH:mm').toDate() : null}
                onChange={(time) => {
                  setTimeRange((prev) => ({
                    ...prev,
                    to: moment(time).format('HH:mm'),
                  }));
                }}
                className="h-9 w-full min-w-0 rounded-lg border border-[rgba(225,200,165,0.9)] bg-[rgba(251,249,246,0.88)] backdrop-blur-[12px] px-3 text-sm shadow-none hover:border-primary focus:border-primary focus:outline-none"
                showTimeSelect
                showTimeSelectOnly
                timeFormat="HH:mm"
                timeIntervals={15}
                timeCaption="End Time"
                minTime={
                  timeRange.from
                    ? moment(timeRange.from, 'HH:mm').add(1, 'minute').toDate()
                    : undefined
                }
                maxTime={
                  timeRange.from
                    ? moment(timeRange.from, 'HH:mm').hours(23).minutes(59).toDate()
                    : undefined
                }
                dateFormat="HH:mm"
                disabled={!timeRange.from}
              />
            </div>

            <Button
              variant={'outline'}
              className="h-9 min-h-9 max-h-9 shrink-0 rounded-lg px-3 py-0"
              disabled={
                !dateRange.from ||
                !timeRange.from ||
                !timeRange.to ||
                [timeRange.from, timeRange.to].includes('Invalid date')
              }
              onClick={() =>
                setDropdownVal((prev: any) => ({
                  ...prev,
                  value: handleDate(date_type, dateRange, timeRange),
                }))
              }
            >
              Apply
            </Button>
          </div>
        ) : null}
      </div>
    );
  },
);
DateDropdown.displayName = 'DateDropdown';

export default DateDropdown;
