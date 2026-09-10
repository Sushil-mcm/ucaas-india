import {
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import TuiCalendar, { TZDate } from 'tui-calendar';
import moment from 'moment';
import './styles.css';
import { Button } from '@/components/ui/button';
import { CalendarProps, CalendarRef, SYNC_BUTTON_LABELS } from './constants';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  disconnectWithGoogleAndOutlook,
  getCalendarAccessToken,
  syncWithGoogleAndOutlook,
} from '@/services/api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Icon } from '@/assets/icons/icon';
import AlertConfirm from '../alert-confirm';
import { capitalizeFirstLetter } from '@/lib/utils';
import { calendarFilterType } from '@/pages/video-meetings/Calender/constants';
import { useUser } from '@/hooks/use-user';

/* Month view's visible viewport is fixed at 5 week-rows regardless of the
   month — a 4-week month (Feb 2026) leaves the 5th row's worth of space
   blank, a 6-week month (Aug 2026) has its 6th row reachable by scrolling,
   and every row is the same height in every case. The library itself has
   no such option: left alone it either forces every month to a fixed
   `visibleWeeksCount` (padding short months with extra weeks of the next
   month, which was the prior behaviour) or auto-sizes the number of DOM
   rows to the real month (0/unset) while stretching or squeezing row
   height to fill whatever container it's given. Getting a FIXED row
   height with a VARIABLE row count needs two nested boxes: an outer one
   sized for exactly 5 rows (`calShellOuterRef`, scrollable), and an inner
   one the library actually renders into (`tuiRef`) whose height this file
   sets imperatively to `weeksNeeded * rowHeight`, so dividing that back
   out during the library's own layout pass always returns the same
   `rowHeight` no matter how many weeks the month needed. */
const MONTH_VISIBLE_ROWS = 5;

/** How many Sunday-start calendar weeks a given month's grid spans (4, 5, or 6) — matches the library's own row count for month view. */
function getWeeksNeededForMonth(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.ceil((firstWeekday + daysInMonth) / 7);
}

const CustomTuiCalendar = forwardRef<CalendarRef, CalendarProps>(
  (
    {
      // height = '760px',
      calendars = [],
      schedules = [],
      suppressNextCreationRef,
      showFilters = false,
      showMenu = false,
      onBeforeCreateSchedule = () => false,
      onBeforeUpdateSchedule = () => false,
      onBeforeDeleteSchedule = () => false,
      handleCategoryFilter = () => false,
      category,
      onRangeChange,
      onCurrentDateChange,
      useInternalDetailsPopup = true,
      onScheduleClick,
      ...rest
    },
    ref,
  ) => {
    const objectRef = ref as React.RefObject<CalendarRef>;
    const calendarInstRef = useRef<any | null>(null);
    /* `calShellOuterRef` is the fixed-for-5-rows viewport the user sees and
       scrolls; `tuiRef` is the plain inner box the library actually
       measures and renders into, whose height gets set imperatively per
       month (see `applyMonthRowHeight` below). */
    const calShellOuterRef = useRef<HTMLDivElement | null>(null);
    const tuiRef = useRef<HTMLDivElement | any>(null);
    const dayNameHeightRef = useRef<number>(32);
    /* Entering month view pins `_renderDate` to the 1st (see
       `enterMonthView`) — the only way to keep that view's grid anchored
       correctly, but it also means the library's own idea of "the current
       date" no longer reflects wherever Day/Week actually was. This is
       the app's own memory of that, read back when switching from month
       into either of them, so today (the initial value) or wherever the
       Day/Week arrows last left it is what reappears — not the 1st. */
    const lastDayWeekDateRef = useRef<Date>(new Date());
    const wrapperRef = useRef<HTMLSpanElement>(null);
    const [open, setOpen] = useState(false);
    const [renderRange, setRenderRange] = useState('');
    const [workweek, setWorkweek] = useState(true);
    /* The calendar always constructs into month view (`defaultView:
       'month'` below), so this needs to start matching that — the view
       switch buttons compare against `'Month'` (not `'Monthly'`, which
       none of them ever set), and this stale value previously meant
       neither the switch buttons nor the day/week-restore logic below
       agreed with the actual starting view. */
    const [type, setType] = useState('Month');
    const [filterSchedules, setFilterSchedules] = useState(schedules);
    const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
    const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);
    const [copiedLink, setCopiedLink] = useState(false);
    const [syncButtonClicked, setSyncButtonClicked] = useState<string | null>(null);
    const [openConfirmModal, setOpenConfirmModal] = useState(false);
    const { user } = useUser();
    const userId = user?.user_info?.uuid || '';

    const queryClient: any = useQueryClient();
    const handleCopy = () => {
      if (selectedSchedule?.body) {
        navigator.clipboard.writeText(selectedSchedule?.body);
        setCopiedLink(true);

        setTimeout(() => {
          setCopiedLink(false);
        }, 3000);
      }
    };
    const handleScheduleClick = (schedule: any, mouseEvent: MouseEvent) => {
      setSelectedSchedule(schedule);
      setPopoverPosition({ x: mouseEvent.pageX, y: mouseEvent.pageY });
    };
    const getScheduleDate = (value: any) => {
      if (!value) return null;
      if (typeof value?.toDate === 'function') return value.toDate();
      return value instanceof Date ? value : new Date(value);
    };
    const openScheduleDetails = (schedule: any) => {
      if (!schedule) return;
      const instance = calendarInstRef.current;
      const normalizedSchedule =
        instance?.getSchedule?.(schedule.id, schedule.calendarId) || schedule;
      const container = tuiRef.current as HTMLDivElement | null;
      const rect = container?.getBoundingClientRect();
      const x = rect ? rect.left + window.scrollX + rect.width * 0.6 : window.scrollX + 300;
      const y = rect ? rect.top + window.scrollY + 160 : window.scrollY + 200;

      setSelectedSchedule(normalizedSchedule);
      setPopoverPosition({ x, y });
    };
    const { data: accessToken = {}, isLoading } = useQuery({
      queryKey: ['getCalendarAccessToken'],
      queryFn: () => getCalendarAccessToken(),
      select: (data) => data?.data?.data?.result || {},
    });
    const { google: googleAccessToken = false, outlook: outlookAccessToken = false } =
      accessToken || {};

    const { mutate: mutateDisconnect, isPending } = useMutation({
      mutationKey: ['disconnectWithGoogleAndOutlook'],
      mutationFn: disconnectWithGoogleAndOutlook,
      onSuccess: () => {
        setSyncButtonClicked(null);
        setOpenConfirmModal(false);
        queryClient.invalidateQueries(['getCalendarAccessToken'], { exact: true });
      },
    });
    const { mutateAsync: syncWith } = useMutation({
      mutationKey: ['syncWithGoogleAndOutlook'],
      mutationFn: syncWithGoogleAndOutlook,
      onSettled: () => setSyncButtonClicked(null),
    });

    useImperativeHandle(ref, () => ({
      getAlert() {
        alert('getAlert from Child');
      },
      suppressNextCreation() {
        suppressNextCreationRef.current = true;
      },
      createSchedule,
      updateSchedule,
      deleteSchedule,
      openScheduleDetails,
      setCurrentDate,
      refreshCalendar,
      resetStuckHover: resetStuckDayHover,
    }));

    /**
     * How many events and tasks fall on each day, keyed 'YYYY-MM-DD'.
     *
     * A ref rather than state because the calendar's templates are handed to
     * the library once at construction; a closure over state would keep
     * reading the first render's value forever. The ref is refreshed
     * whenever the schedules change, just before asking for a re-render.
     */
    const dayCountsRef = useRef<Map<string, { event: number; task: number }>>(new Map());

    useEffect(() => {
      const counts = new Map<string, { event: number; task: number }>();

      (schedules || []).forEach((schedule: any) => {
        const start = moment(
          schedule?.start?.toDate ? schedule.start.toDate() : schedule?.start,
        ).startOf('day');
        if (!start.isValid()) return;

        const rawEnd = moment(schedule?.end?.toDate ? schedule.end.toDate() : schedule?.end).startOf(
          'day',
        );
        /* Anything spanning midnight counts on every day it covers. The
           guard stops a corrupted end date spinning here. */
        const end = rawEnd.isValid() && rawEnd.isAfter(start) ? rawEnd : start;
        const kind =
          String(schedule?.raw?.category || '').toUpperCase() === 'TASK' ? 'task' : 'event';

        const cursor = start.clone();
        let guard = 0;
        while (cursor.isSameOrBefore(end, 'day') && guard < 366) {
          const key = cursor.format('YYYY-MM-DD');
          const entry = counts.get(key) || { event: 0, task: 0 };
          entry[kind] += 1;
          counts.set(key, entry);
          cursor.add(1, 'day');
          guard += 1;
        }
      });

      dayCountsRef.current = counts;
      calendarInstRef.current?.render?.();
    }, [schedules]);

    /* Sets the inner box's height to `weeksNeeded * rowHeight`, where
       `rowHeight` is derived from the OUTER box's own (5-row) height —
       so the library, which divides whatever height it's given by the
       week count it's rendering, always lands back on that same
       `rowHeight` whether the month needs 4, 5, or 6 weeks. Reads the
       day-name row's real rendered height rather than assuming one,
       since that row's height comes from the library's own CSS, not
       from anything this file controls. */
    function applyMonthRowHeight(forDate?: Date) {
      const outer = calShellOuterRef.current;
      const inner = tuiRef.current;
      const instance = calendarInstRef.current;
      if (!outer || !inner) return;

      const date = forDate || (instance ? instance.getDate().toDate() : new Date());
      const weeksNeeded = getWeeksNeededForMonth(date);

      /* Left alone, the library defaults month view to a fixed 6 rows,
         padding any shorter month with extra days borrowed from next
         month rather than actually rendering fewer rows — so a 4- or
         5-week month must be told its real row count explicitly, every
         time the date changes, or it silently renders 6 again. */
      if (instance) {
        instance.setOptions({ month: { visibleWeeksCount: weeksNeeded } }, true);
      }

      const dayNameEl = inner.querySelector?.('.tui-full-calendar-month-dayname');
      const measuredDayNameHeight = dayNameEl?.getBoundingClientRect?.().height;
      if (measuredDayNameHeight) dayNameHeightRef.current = measuredDayNameHeight;
      const headerHeight = dayNameHeightRef.current;

      /* Floored, not just divided: `outerHeight` and `headerHeight` are
         both fractional (`getBoundingClientRect` sub-pixel values), and
         rounding the division UP even by a fraction of a pixel — times 5
         rows — was enough to push row 5's own bottom border a pixel or two
         past the outer viewport's actual edge, clipping it. Flooring the
         per-row height means 5 rows can only ever add up to at or under
         the outer box's real height, never over it. */
      const outerHeight = outer.getBoundingClientRect().height;
      const rowHeight = Math.max(0, Math.floor((outerHeight - headerHeight) / MONTH_VISIBLE_ROWS));

      inner.style.height = `${headerHeight + weeksNeeded * rowHeight}px`;
    }

    /* Day/Week used to just clear this box's height back to `''` (auto),
       on the theory that they'd size themselves against the outer box
       directly. They don't: with no height of its own, this box's height
       becomes whatever its content's natural/intrinsic height is — the
       full 24-hour column, unclipped — and the library's own dayname
       header + scrollable timegrid (`.tui-full-calendar-timegrid-
       container`, sticky-by-construction: it's a sibling of the
       header, not an ancestor) never gets a bounded height to scroll
       *within*. Lacking that, there's nothing here for the library to
       scroll internally, so the outer box (`calShellOuterRef`, already
       height-capped for Month's fixed 5 rows) ends up the thing that
       actually scrolls instead — carrying the header along with it,
       which is what read as the weekday row scrolling out of view.
       Giving this box the outer box's own real height, the same way
       `applyMonthRowHeight` already does for Month, gives the library a
       real number to divide "header + scrollable body" against, so the
       header row stays out of that scroll — through the library's own
       layout, not a new sticky rule layered on top of it. */
    /* Everything up to this function tried to make Day/Week scroll
       correctly by controlling *ancestors* of the library's own scroll
       box — matching `inner`'s height to `outer`'s, then clipping
       `inner` to soak up the difference. Both failed, confirmed live,
       for the same underlying reason: the library's own timegrid
       doesn't reliably respect a height it's handed through its
       ancestors. On a tall window the mismatch was a harmless 6px; on a
       short one it was 206px — the library kept a much taller internal
       minimum than the space `inner` actually had, so `outer` was
       forced to pick up that entire 206px as scroll capacity of its
       own, and `position: sticky` (confirmed live, repeatedly) does not
       hold `.tui-full-calendar-dayname-container` against *that specific
       box's* scroll — the header scrolled fully off-screen, reproducing
       the exact bug this was meant to fix. Clipping the mismatch away
       instead (the previous attempt) avoided that but silently deleted
       however many hours fell past the clip line — worse.

       This instead sizes and scrolls the library's own real scroll
       element directly, `.tui-full-calendar-timegrid-container`, rather
       than negotiating with it indirectly through two ancestors. Its
       available height is `outer`'s height minus the dayname row's own
       measured height (the same subtraction `applyMonthRowHeight`
       already does for Month); setting that height AND `overflow-y:
       auto` on it directly, inline, wins over whatever internal
       minimum-height logic the library was otherwise falling back to,
       so it scrolls within itself instead of overflowing its
       ancestors — which means neither `outer` nor `inner` ever has
       anything of their own to scroll, and the header, a sibling of
       this box rather than a scroll-context descendant of it, simply
       never moves. */
    function applyDayWeekHeight() {
      const outer = calShellOuterRef.current;
      const inner = tuiRef.current as HTMLElement | null;
      if (!outer || !inner) return;

      const daynameEl = inner.querySelector?.(
        '.tui-full-calendar-dayname-container',
      ) as HTMLElement | null;
      const daynameHeight = daynameEl?.getBoundingClientRect?.().height || 0;
      const timegridEl = inner.querySelector?.(
        '.tui-full-calendar-timegrid-container',
      ) as HTMLElement | null;

      const availableHeight = Math.max(0, outer.clientHeight - daynameHeight);
      inner.style.height = `${outer.clientHeight}px`;
      if (timegridEl) {
        timegridEl.style.height = `${availableHeight}px`;
        timegridEl.style.maxHeight = `${availableHeight}px`;
        timegridEl.style.overflowY = 'auto';
      }
    }

    /* Switching into month view used to just call `changeView('month')`
       and leave whatever day was already showing as the library's
       internal "current date" — harmless while Day/Week had no date
       navigation of their own, since that date could only ever be
       whatever the mini calendar last set, which stays within the
       month's first week. Now that the Day/Week arrows can move it to
       any day, that matters: with `visibleWeeksCount` constrained (see
       `applyMonthRowHeight`), the library anchors the grid to the WEEK
       containing that current date rather than to the 1st of the month —
       so leaving it on, say, the 9th made the grid start from the week of
       the 9th, silently dropping the month's first row.

       Tried fixing this through `month.renderMonth` via `setOptions`
       instead of `setDate`, on the theory that it's the grid's own
       separate date reference and wouldn't disturb what day Day/Week
       shows if switched back to — but `changeView` always calls the
       library's own `move(0)` internally, which recomputes that same
       option from `_renderDate` and overwrites it regardless. Confirmed
       live: the `renderMonth` option does not survive `changeView`, so
       `setDate` is the only lever that actually reaches the anchor. The
       trade-off is real but minor next to a grid missing a row: Day/Week
       lands on the 1st of the month, not whatever day they were on
       before switching to Month — the same "moving up a level resets to
       the start of it" most calendar apps already do. */
    function enterMonthView() {
      const instance = calendarInstRef.current;
      if (!instance) return;
      const startOfMonth = moment(instance.getDate().toDate()).startOf('month').toDate();
      instance.setDate(startOfMonth);
      applyMonthRowHeight(startOfMonth);
      instance.changeView('month', true);
    }

    /* Cell hover (styles.css, `.mcm-cell-hover`) used to be a plain
       CSS `:hover` rule. Clicking a schedule or an empty day opens a
       popup (our own Dialog, or the schedule-creation modal) right on
       top of that same cursor position; closing it again, with the
       mouse never having physically moved, leaves that cell exactly as
       shaded as it was — a browser only re-runs `:hover` matching on an
       actual pointer move, never because the DOM changed under a
       stationary cursor. That shaded rectangle, with nothing left to
       click, is what read as a "ghost bar" still sitting on the grid.
       `:hover` itself is opaque to JS — confirmed live: toggling
       `pointer-events` on the element does not change whether it still
       matches `:hover`. So the class is applied by real `mouseover`/
       `mouseout` listeners below instead — visually identical for
       genuine mouse movement, but a plain DOM class we can also remove
       ourselves, unconditionally, the instant a click is about to open
       a popup. */
    function resetStuckDayHover() {
      const container = tuiRef.current as HTMLDivElement | null;
      if (!container) return;
      container
        .querySelectorAll('.mcm-cell-hover')
        .forEach((el) => el.classList.remove('mcm-cell-hover'));
    }

    useLayoutEffect(() => {
      const container = tuiRef.current;
      if (!container) return;

      if (!calendarInstRef.current) {
        /* Size the inner box before the library's very first render, so it
           starts from a close-to-correct height instead of the 0px a bare,
           unstyled div would otherwise render into. */
        applyMonthRowHeight(new Date());

        const ctorOptions = {
          useDetailPopup: false,
          useCreationPopup: false,
          defaultView: 'month',
          taskView: false,
          scheduleView: ['time'],
          calendars,
          /* One preview per day. Enough to say what the day holds without a
             busy cell stacking four clipped titles; anything beyond it is
             reached through the day itself. `visibleWeeksCount` here is the
             initial guess for today's month — `applyMonthRowHeight` above
             already computed it, but the constructor needs its own copy
             since the instance it would otherwise call `setOptions` on
             doesn't exist until this returns. */
          month: {
            visibleScheduleCount: 1,
            visibleWeeksCount: getWeeksNeededForMonth(new Date()),
          },
          template: {
            /* A dot, the title, and the time beneath it. */
            time: (schedule: any) => {
              const title = schedule?.title || '';
              const startDate = (schedule?.start as TZDate)?.toDate();
              const startTime = startDate ? moment(startDate).format('hh:mm A') : '';
              const category = String(schedule?.raw?.category || '').toUpperCase();
              const kind =
                category === 'TASK' ? 'task' : category === 'MEETING' ? 'meeting' : 'event';

              return `<span class="mcm-evt is-${kind}">
                  <span class="mcm-evt-line">
                    <i class="mcm-evt-dot"></i>
                    <span class="mcm-evt-title">${title}</span>
                  </span>
                  ${startTime ? `<span class="mcm-evt-time">${startTime}</span>` : ''}
                </span>`;
            },
            /* The date number on its own. The count pill that used to sit
               here is gone — the cell now previews the day's first entry
               instead, which says more than a tally did. */
            monthGridHeader: (model: any) => {
              /* `model.ymd` is `YYYYMMDD` in this version, not `YYYY-MM-DD`.
                 Parsing it against both shapes and re-formatting is what
                 makes the lookup hit — keyed on the raw value the map never
                 matched, so every day came back empty and no pill rendered.
                 The day number looked right throughout, because moment
                 parses the compact form leniently. */
              const raw =
                model?.ymd || (model?.date?.toDate ? model.date.toDate() : model?.date);
              const parsed = moment(raw, ['YYYY-MM-DD', 'YYYYMMDD', moment.ISO_8601]);
              const ymd = parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
              const dayNumber = parsed.isValid() ? parsed.date() : '';
              const isToday = Boolean(model?.isToday);

              const numberClass = `tui-full-calendar-weekday-grid-date${
                isToday ? ' tui-full-calendar-weekday-grid-date-decorator' : ''
              }`;

              return `<div class="mcm-dayhead" data-ymd="${ymd}">
                  <span class="${numberClass}">${dayNumber}</span>
                </div>`;
            },
            popupDetailDate: (isAllDay: any, start: any, end: any) => {
              const startDate = (start as TZDate).toDate();
              const endDate = (end as TZDate).toDate();
              const isSameDate = moment(startDate).isSame(endDate);
              const endFormat = (isSameDate ? '' : 'YYYY/MM/DD ') + 'HH:mm';
              return isAllDay
                ? `${moment(startDate).format('YYYY/MM/DD')}${isSameDate ? '' : ' - ' + moment(endDate).format('YYYY/MM/DD')}`
                : `${moment(startDate).format('YYYY/MM/DD HH:mm')} - ${moment(endDate).format(endFormat)}`;
            },
            popupDetailBody: (schedule: any) => {
              const link = schedule.body ?? '#';
              return `Join: <a href="${link}" target="_blank" rel="noopener noreferrer" style="color: blue; font-size:11px;">${link}</a>`;
            },
          },
          ...rest,
        };
        const instance = new TuiCalendar(container, ctorOptions);

        calendarInstRef.current = instance;

        instance.on('beforeCreateSchedule', (eventData: any) => {
          resetStuckDayHover();
          onBeforeCreateSchedule(eventData);
        });
        instance.on('beforeUpdateSchedule', onBeforeUpdateSchedule);
        instance.on('beforeDeleteSchedule', onBeforeDeleteSchedule);
        instance.on('clickSchedule', (event: any) => {
          resetStuckDayHover();
          const { schedule, event: mouseEvent } = event;
          if (useInternalDetailsPopup) {
            handleScheduleClick(schedule, mouseEvent);
          }
          if (typeof onScheduleClick === 'function') {
            onScheduleClick({ schedule, mouseEvent });
          }
        });
        instance.on('clickDayname', (event: any) => {
          if (instance.getViewName() === 'week') {
            instance.setDate(new Date(event.date));
            instance.changeView('day', true);
          }
        });

        /* The day-name row now exists, so this re-measures its real height
           (the pre-construction pass above could only guess) and corrects
           the inner box + the library's own layout if that guess was off. */
        applyMonthRowHeight();
        /* `changeView` (used everywhere else this component switches into
           month view) always calls the library's own `move(0)` internally,
           which recomputes its month-grid anchor from `_renderDate` and
           overwrites anything set via `setOptions({ month: { renderMonth
           }} })` beforehand — confirmed live, that approach does not
           survive the switch. `_renderDate` itself defaults to today,
           and with `visibleWeeksCount` constrained the library anchors
           the grid to the WEEK containing it rather than to the 1st of
           the month (see `enterMonthView`) — today being the 7th, which
           isn't in this month's first week, the very first render opened
           with that row already missing. `setDate` is the only lever
           that actually reaches the anchor, so this construction path
           uses it too, same as `enterMonthView` and `setCurrentDate`. */
        instance.setDate(moment().startOf('month').toDate());
        instance.render();
      }
    }, []);

    /* The outer box's own height is CSS-responsive (it uses the same
       viewport-relative classes as before), so a window resize changes how
       tall "5 rows" actually is on screen. The inner box's height is a
       plain inline style snapshot from the last time this ran, so it does
       not follow that on its own — this keeps it in sync. */
    useEffect(() => {
      const handleResize = () => {
        const viewName = calendarInstRef.current?.getViewName();
        if (viewName === 'month') {
          applyMonthRowHeight();
        } else if (viewName === 'day' || viewName === 'week') {
          applyDayWeekHeight();
        } else {
          return;
        }
        calendarInstRef.current.render();
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    /* Delegated rather than one listener per cell: the library tears down
       and recreates every grid-cell node on each render (month navigation,
       filter changes, `instance.render()`), so per-cell listeners would
       need re-attaching after every one of those. One pair of listeners
       on the container, matched against `event.target` on the way past,
       keeps working across all of that for free. This is also what makes
       `resetStuckDayHover` able to fully clear the hover class on demand
       (see the comment on it above) — a real `:hover` match has no such
       escape hatch. */
    useEffect(() => {
      const container = tuiRef.current as HTMLDivElement | null;
      if (!container) return;

      const handleMouseOver = (nativeEvent: MouseEvent) => {
        const cell = (nativeEvent.target as HTMLElement)?.closest?.(
          '.tui-full-calendar-weekday-grid-line',
        );
        cell?.classList.add('mcm-cell-hover');
      };
      const handleMouseOut = (nativeEvent: MouseEvent) => {
        const cell = (nativeEvent.target as HTMLElement)?.closest?.(
          '.tui-full-calendar-weekday-grid-line',
        );
        cell?.classList.remove('mcm-cell-hover');
      };

      container.addEventListener('mouseover', handleMouseOver);
      container.addEventListener('mouseout', handleMouseOut);
      return () => {
        container.removeEventListener('mouseover', handleMouseOver);
        container.removeEventListener('mouseout', handleMouseOut);
      };
    }, []);

    /* The All/Event/Task/Meeting checkboxes above only ever drove their
       own `isChecked` look — `category` reached this component but
       nothing filtered `schedules` with it before handing them to the
       calendar, so picking "Event" still rendered every task and meeting
       right alongside it. Filtering here, against the same `raw.category`
       the checkboxes and the day templates already read, is what makes
       the click actually change what's on the grid. */
    const filteredSchedules = useMemo(() => {
      if (!category || category === 'ALL') return schedules;
      return (schedules || []).filter(
        (schedule: any) => String(schedule?.raw?.category || '').toUpperCase() === category,
      );
    }, [schedules, category]);

    useEffect(() => {
      const instance = calendarInstRef.current;
      if (!instance) return;

      instance.clear();
      instance.createSchedules(filteredSchedules, true);
      instance.render();
      setRenderRangeText();
    }, [filteredSchedules]);

    /* The month grid's `template.time` option is registered correctly
       (verified: it reaches the library with the right function, on the
       right category) but the library never actually calls it for the
       grid's own schedule bars — it falls back to its own bare-title
       rendering instead. Rather than depend on a third-party template
       hook that doesn't fire for reasons its own source doesn't make
       obvious, this patches the bars directly: a MutationObserver
       watches for the plain title spans the library inserts and swaps
       each one's contents for the dot+title+time markup, matched back to
       the real schedule by the `data-schedule-id` the library already
       stamps on the bar. Runs off a ref, not the `filteredSchedules`
       closure, so it stays correct across renders without having to
       tear down and rebuild the observer every time the list changes. */
    const filteredSchedulesRef = useRef(filteredSchedules);
    useEffect(() => {
      filteredSchedulesRef.current = filteredSchedules;
    }, [filteredSchedules]);

    useEffect(() => {
      /* `tuiRef` is typed `HTMLDivElement | any` (see its declaration) so
         other call sites in this file can hand it library instances that
         aren't real DOM nodes — but that same `any` erases the DOM typing
         right here too, which is what made `querySelectorAll<HTMLElement>`
         an "untyped function call" and left `bar` below implicitly `any`.
         Narrowing to the real element type locally fixes both without
         touching the ref's own (intentionally loose) declared type. */
      const container = tuiRef.current as HTMLDivElement | null;
      if (!container) return;

      /* Same three colours as the dot (`.mcm-evt-dot` / `.is-task` /
         `.is-meeting` in styles.css) — kept here too so a multi-day bar's
         tint (below) always matches its own dot's category colour rather
         than drifting from it. */
      const CATEGORY_COLOR: Record<string, string> = {
        event: '#00a9ff',
        task: '#34c38f',
        meeting: '#a78bfa',
      };

      const resolveKind = (schedule: any) => {
        const category = String(schedule?.raw?.category || '').toUpperCase();
        return category === 'TASK' ? 'task' : category === 'MEETING' ? 'meeting' : 'event';
      };

      const buildPreviewHtml = (schedule: any, kind: string) => {
        const title = schedule?.title || '';
        /* `schedule` here is `filteredSchedulesRef.current` — the raw
           `schedules` prop, not the library's own internal model — so
           `.start` isn't reliably a `TZDate`; it's whatever shape the
           caller passed (a plain `Date`, a string, or a real `TZDate`).
           Same ambiguity already handled this way above (the day-count
           effect, ~line 202) — `.toDate` only when it exists, the raw
           value otherwise, both handed to `moment` either way. */
        const startDate = schedule?.start?.toDate ? schedule.start.toDate() : schedule?.start;
        const startTime = startDate ? moment(startDate).format('hh:mm A') : '';

        return `<span class="mcm-evt is-${kind}">
            <span class="mcm-evt-line">
              <i class="mcm-evt-dot"></i>
              <span class="mcm-evt-title">${title}</span>
            </span>
            ${startTime ? `<span class="mcm-evt-time">${startTime}</span>` : ''}
          </span>`;
      };

      const patchMonthEventPreviews = () => {
        const bars = container.querySelectorAll<HTMLElement>(
          '.tui-full-calendar-weekday-schedule[data-schedule-id]:not([data-mcm-patched])',
        );
        if (!bars.length) return;

        bars.forEach((bar) => {
          const scheduleId = bar.getAttribute('data-schedule-id');
          const schedule = filteredSchedulesRef.current.find(
            (item: any) => String(item.id) === scheduleId,
          );
          if (!schedule) return;

          const titleEl = bar.querySelector('.tui-full-calendar-weekday-schedule-title');
          if (!titleEl) return;

          /* One malformed schedule throwing here used to stop `forEach`
             outright, leaving every bar after it — everything still
             carrying the library's plain default title span — unpatched
             for the rest of this pass too. Scoped per-bar so one bad
             schedule only ever costs that one bar its styling. */
          try {
            const kind = resolveKind(schedule);
            titleEl.innerHTML = buildPreviewHtml(schedule, kind);

            /* A schedule spanning more than one day renders as a single
               wide bar across every column it covers — the dot+title
               above only paints where the text actually sits, at the
               bar's left edge (its first day). With the bar's own
               background forced transparent (by design, for the
               single-day case: a dot-and-text list, not the library's
               default coloured block), every day after the first showed
               nothing at all — no dot, no colour, nothing — while still
               carrying its own "N more" badge, which read as that day
               being broken rather than as a continuing event. Detected
               by comparing the bar's own rendered width against one
               day-column's width (a plain day is ~1/7 of the row); for
               a wider one, a light tint of the same colour as its dot
               gives every column it spans a visible presence. Needs
               `!important` here too — inline styles are still beaten by
               an `!important` author rule unless they're `!important`
               themselves. */
            const block = bar.closest(
              '.tui-full-calendar-weekday-schedule-block',
            ) as HTMLElement | null;
            const widthPercent = parseFloat(block?.style.width || '0');
            const isMultiDay = widthPercent > 100 / 7 + 1;
            if (isMultiDay) {
              const color = CATEGORY_COLOR[kind];
              bar.style.setProperty(
                'background-color',
                `color-mix(in srgb, ${color} 22%, #ffffff)`,
                'important',
              );
              bar.style.setProperty('border-radius', '4px', 'important');
            }
          } catch {
            return;
          }
          bar.setAttribute('data-mcm-patched', 'true');
        });
      };

      patchMonthEventPreviews();
      const observer = new MutationObserver(() => patchMonthEventPreviews());
      observer.observe(container, { childList: true, subtree: true });

      return () => observer.disconnect();
    }, []);
    useEffect(() => {
      return () => {
        if (calendarInstRef.current) {
          calendarInstRef.current.destroy();
          calendarInstRef.current = null;
        }
      };
    }, []);
    useEffect(() => {
      document.addEventListener('click', handleClick, false);
      return () => {
        document.removeEventListener('click', handleClick, false);
      };
    });

    const handleClick = (e: any) => {
      if (wrapperRef.current?.contains(e.target)) {
        return;
      }
      setOpen(false);
    };

    function currentCalendarDate(format: string) {
      const currentDate = moment([
        calendarInstRef.current.getDate().getFullYear(),
        calendarInstRef.current.getDate().getMonth(),
        calendarInstRef.current.getDate().getDate(),
      ]);

      return currentDate.format(format);
    }

    const setRenderRangeText = () => {
      const instance = calendarInstRef.current;
      if (!instance) return;
      const viewName = calendarInstRef.current.getViewName();
      let from = '';
      let to = '';
      const html = [];
      /* This string is the page's heading, so it reads as a date rather than
         as a machine format: "12 September 2026" and "September 2026" instead
         of "2026-09-12" and "2026-09". `from`/`to` keep the ISO format — they
         are what the API is queried with. */
      if (viewName === 'day') {
        const date = currentCalendarDate('YYYY-MM-DD');
        html.push(moment(date, 'YYYY-MM-DD').format('D MMMM YYYY'));
        from = to = date;
      } else if (viewName === 'month') {
        /* Used to also require `visibleWeeksCount > 4` (or unset) — a
           guard against a value it never actually saw before, since the
           library always rendered a fixed 6 rows. Now that a real month
           can legitimately need exactly 4 (see `applyMonthRowHeight`),
           that same guard would wrongly fall through to the date-range
           branch below for a 4-week month. Any real month view gets the
           "September 2026" heading regardless of its row count. */
        const date = currentCalendarDate('YYYY-MM');
        html.push(moment(date, 'YYYY-MM').format('MMMM YYYY'));
        const start = instance.getDateRangeStart();
        const end = instance.getDateRangeEnd();
        from = moment(start.getTime()).format('YYYY-MM-DD');
        to = moment(end.getTime()).format('YYYY-MM-DD');
      } else {
        const start = instance.getDateRangeStart();
        const end = instance.getDateRangeEnd();
        from = moment(start.getTime()).format('YYYY-MM-DD');
        to = moment(end.getTime()).format('YYYY-MM-DD');
        const startLabel = moment(start.getTime());
        const endLabel = moment(end.getTime());
        /* Within one month the month name only needs saying once:
           "6 – 12 September 2026", not "6 September 2026 – 12 September". */
        html.push(
          startLabel.isSame(endLabel, 'month')
            ? `${startLabel.format('D')} – ${endLabel.format('D MMMM YYYY')}`
            : `${startLabel.format('D MMM')} – ${endLabel.format('D MMM YYYY')}`,
        );
      }
      setRenderRange(html.join(''));
      if (typeof onRangeChange === 'function') {
        onRangeChange({ from, to });
      }
      if (typeof onCurrentDateChange === 'function') {
        onCurrentDateChange(currentCalendarDate('YYYY-MM-DD'));
      }
    };

    function createSchedule(schedule: any) {
      calendarInstRef.current.createSchedules([schedule]);
      const cloneFilterSchedules = [...filterSchedules];
      setFilterSchedules(() => [...cloneFilterSchedules, schedule]);
    }

    function updateSchedule(schedule: any, changes: any) {
      calendarInstRef.current.updateSchedule(schedule.id, schedule.calendarId, changes);
      const cloneFilterSchedules = [...filterSchedules];
      setFilterSchedules(() =>
        cloneFilterSchedules.map((item) => {
          if (item.id === schedule.id) {
            return { ...item, ...changes };
          }
          return item;
        }),
      );
    }

    function deleteSchedule(schedule: any) {
      calendarInstRef.current.deleteSchedule(schedule.id, schedule.calendarId);
      const cloneFilterSchedules = [...filterSchedules];
      setFilterSchedules(() => cloneFilterSchedules.filter((item) => item.id !== schedule.id));
    }
    function setCurrentDate(date: Date) {
      if (!calendarInstRef.current) return;
      const instance = calendarInstRef.current;
      const isMonthView = instance.getViewName() === 'month';
      /* Month view always shows the whole month regardless of which day
         within it was passed in (e.g. clicking day 15 in the mini
         calendar), so the date handed to the library here is pinned to
         the 1st. With `visibleWeeksCount` constrained (see
         `applyMonthRowHeight`), the library anchors the grid to the WEEK
         containing whatever date it's given rather than to the 1st of the
         month — passing day 15 (a Tuesday, say, in week 3) would silently
         drop the month's first two rows and shift the whole grid down a
         fortnight, not just move a selection within it. (Tried scoping
         this to the month view's own `renderMonth` option instead, so it
         wouldn't touch what day Day/Week shows if switched to — but
         `changeView` always recomputes that option from `_renderDate` via
         the library's own `move(0)`, overwriting it regardless; `setDate`
         is the only lever that actually reaches the anchor.) */
      const anchorDate = isMonthView ? moment(date).startOf('month').toDate() : date;
      /* Sized for the date it's about to show, before triggering the
         library's own re-render — otherwise that render would still read
         the previous month's (possibly different-week-count) height. */
      if (isMonthView) {
        applyMonthRowHeight(anchorDate);
      }
      instance.setDate(anchorDate);
      if (isMonthView) {
        /* `setDate` alone moves the displayed date but does not re-derive
           the month grid's row count from options — it reuses whatever
           `visibleWeeksCount` the view last built with, so navigating from
           a 5-week month to a 6-week one via the mini calendar's arrows
           silently kept rendering only 5 rows. `changeView` on the same
           view name forces month view to rebuild against the option
           `applyMonthRowHeight` just set. */
        instance.changeView('month', true);
      }
      setRenderRangeText();
    }
    function refreshCalendar() {
      if (!calendarInstRef.current) return;
      calendarInstRef.current.render();
      setRenderRangeText();
    }

    /* `prev`/`next` are the library's own step methods — they move by
       whatever unit the CURRENT view already means (a day in day view, a
       week in week view), the same way the mini calendar's month arrows
       move by a month through `setCurrentDate`/`setDate`. Reusing them
       here instead of adding day math keeps this in step with however
       the library itself defines "one step" for a view, rather than a
       second, possibly-diverging idea of it living in this component. */
    function stepView(direction: 1 | -1) {
      const instance = calendarInstRef.current;
      if (!instance) return;
      if (direction === 1) {
        instance.next();
      } else {
        instance.prev();
      }
      lastDayWeekDateRef.current = instance.getDate().toDate();
      setRenderRangeText();
    }

    const handleOutlookOAuthPopup = async (type: string) => {
      setSyncButtonClicked(type);
      if (type === SYNC_BUTTON_LABELS.GOOGLE.google && googleAccessToken) {
        setOpenConfirmModal(true);
        return;
      }
      if (type === SYNC_BUTTON_LABELS.OUTLOOK.outlook && outlookAccessToken) {
        setOpenConfirmModal(true);
        return;
      }
      const response = await syncWith({ type: type });
      const url = response?.data?.data?.result?.[0]?.result;
      if (url) {
        window.location.href = url;
      }
    };
    const validAttendees = Array.isArray(selectedSchedule?.attendees)
      ? selectedSchedule?.attendees?.filter(
          (email: string): email is string => typeof email === 'string' && email.trim() !== '',
        )
      : [];

    const selectedScheduleEndDate = getScheduleDate(selectedSchedule?.end);
    const selectedScheduleStartDate = getScheduleDate(selectedSchedule?.start);
    const isExpired =
      selectedScheduleEndDate !== null ? moment(selectedScheduleEndDate).isBefore(moment()) : false;

    return (
      <div className="w-full">
        <div className="flex flex-col gap-2 px-4 py-3.5">
          {/* Two zones with a wide gap between them, rather than one run of
              items at an even gap. Everything sat in a single line at gap-4 —
              heading, view control, Today, arrows, legend, sync — so nothing
              grouped and the row read as clutter. Now: what you are looking at
              and how you move through it on the left; what you can filter and
              connect on the right. */}
          <div className="mcm-calbar flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center sm:gap-x-8">
            <div className="flex items-center gap-3 flex-wrap">
              {/* The date leads, at heading weight. It used to sit fourth in
                  the row — after the view dropdown, Today and the arrows —
                  styled like a label, so the header had no anchor and read as
                  a strip of controls with a stray date in it.

                  Day/Week get their own step arrows here, flanking the
                  title rather than living beside the view switch — Month
                  already has the mini calendar's arrows for this, and
                  giving it a second pair here would be two controls doing
                  the same job. `.btn.move-day` is tui-calendar's own
                  default toolbar class for exactly this arrow (still
                  defined in styles.css from before those default buttons
                  were removed from this header), so it already carries
                  the right hover/active/focus-visible states and matches
                  the rest of this toolbar for free. */}
              <div className="order-first flex items-center gap-1.5">
                {(type === 'Daily' || type === 'Weekly') && (
                  <button
                    type="button"
                    aria-label={type === 'Daily' ? 'Previous day' : 'Previous week'}
                    className="btn move-day"
                    onClick={() => stepView(-1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <h2 className="mr-1 text-xl font-bold tracking-tight text-mcm-ink whitespace-nowrap">
                  {renderRange}
                </h2>
                {(type === 'Daily' || type === 'Weekly') && (
                  <button
                    type="button"
                    aria-label={type === 'Daily' ? 'Next day' : 'Next week'}
                    className="btn move-day"
                    onClick={() => stepView(1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showMenu && (
                <div className="flex items-center gap-3">
                  {/* Three views, three buttons. As a dropdown you had to open
                      it to find out which view you were in and what the others
                      were; laid out flat, the current one is visible and any
                      other is one click away. */}
                  <div className="mcm-viewswitch" role="group" aria-label="Calendar view">
                    {[
                      { label: 'Day', value: 'Daily', view: 'day' },
                      { label: 'Week', value: 'Weekly', view: 'week' },
                      { label: 'Month', value: 'Month', view: 'month' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={type === option.value}
                        className={`mcm-viewswitch-btn ${type === option.value ? 'is-on' : ''}`}
                        onClick={() => {
                          if (option.view === 'month') {
                            /* Also resets the render date to the 1st of
                               the month — see the comment on this function
                               for why that matters now that Day/Week can
                               leave it on any day. */
                            enterMonthView();
                          } else {
                            /* Coming from month view specifically: that
                               view just pinned the render date to the 1st
                               (see `enterMonthView`), so restore wherever
                               Day/Week actually was rather than opening on
                               the 1st. Switching directly between Day and
                               Week needs no such correction — neither one
                               touches the render date the other way. */
                            if (type === 'Month') {
                              calendarInstRef.current.setDate(lastDayWeekDateRef.current);
                            }
                            calendarInstRef.current.changeView(option.view, true);
                            /* changeView's internal render is deferred via
                               rAF, so the new view's timegrid DOM doesn't
                               exist yet on this tick — wait a frame (plus
                               one more so we land after that render, not
                               racing it) before measuring/sizing it. */
                            requestAnimationFrame(() => {
                              requestAnimationFrame(() => applyDayWeekHeight());
                            });
                          }
                          setType(option.value);
                          setRenderRangeText();
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {/* Weekends is a setting, not a view, so it stays a toggle
                      rather than joining the switch above. */}
                  <button
                    type="button"
                    aria-pressed={workweek}
                    className={`mcm-weekendtoggle ${workweek ? 'is-on' : ''}`}
                    onClick={() => {
                      calendarInstRef.current.setOptions({ month: { workweek } }, true);
                      calendarInstRef.current.setOptions({ week: { workweek } }, true);
                      calendarInstRef.current.changeView(
                        calendarInstRef.current.getViewName(),
                        true,
                      );
                      setWorkweek(!workweek);
                    }}
                  >
                    Weekends
                  </button>

                  <span
                    ref={wrapperRef}
                    style={{ display: 'none' }}
                    /* The old dropdown markup is kept mounted but hidden: the
                       outside-click handler still references this ref. */
                    className={`dropdown ${open ? 'open' : ''}`}
                  >
                    <button
                      id="dropdownMenu-calendarType"
                      className="btn btn-default btn-sm dropdown-toggle"
                      type="button"
                      data-toggle="dropdown"
                      aria-haspopup="true"
                      aria-expanded={open}
                      onClick={() => setOpen(!open)}
                    >
                      <i
                        id="calendarTypeIcon"
                        className="calendar-icon ic_view_week"
                        style={{ marginRight: '4px' }}
                      />
                      <span id="calendarTypeName">{type}</span>&nbsp;
                      <i className="calendar-icon tui-full-calendar-dropdown-arrow" />
                    </button>
                    <ul
                      className="dropdown-menu !rounded-xl !border-primary"
                      role="menu"
                      aria-labelledby="dropdownMenu-calendarType"
                    >
                      <li role="presentation">
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            if (type === 'Month') {
                              calendarInstRef.current.setDate(lastDayWeekDateRef.current);
                            }
                            calendarInstRef.current.changeView('day', true);
                            requestAnimationFrame(() => {
                              requestAnimationFrame(() => applyDayWeekHeight());
                            });
                            setType('Daily');
                            setOpen(false);
                            setRenderRangeText();
                          }}
                          className="dropdown-menu-title"
                          role="menuitem"
                          data-action="toggle-daily"
                        >
                          <i className="calendar-icon ic_view_day" />
                          Daily
                        </div>
                      </li>
                      <li role="presentation">
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            if (type === 'Month') {
                              calendarInstRef.current.setDate(lastDayWeekDateRef.current);
                            }
                            calendarInstRef.current.changeView('week', true);
                            requestAnimationFrame(() => {
                              requestAnimationFrame(() => applyDayWeekHeight());
                            });
                            setType('Weekly');
                            setOpen(false);
                            setRenderRangeText();
                          }}
                          className="dropdown-menu-title"
                          role="menuitem"
                          data-action="toggle-weekly"
                        >
                          <i className="calendar-icon ic_view_week" />
                          Weekly
                        </div>
                      </li>
                      <li role="presentation">
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            enterMonthView();
                            setType('Month');
                            setOpen(false);
                            setRenderRangeText();
                          }}
                          className="dropdown-menu-title"
                          role="menuitem"
                          data-action="toggle-monthly"
                        >
                          <i className="calendar-icon ic_view_month" />
                          Month
                        </div>
                      </li>

                      <li role="presentation" className="dropdown-divider" />
                      <li role="presentation">
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            calendarInstRef.current.setOptions({ month: { workweek } }, true);
                            calendarInstRef.current.setOptions({ week: { workweek } }, true);
                            calendarInstRef.current.changeView(
                              calendarInstRef.current.getViewName(),
                              true,
                            );
                            setWorkweek(!workweek);
                            setOpen(false);
                          }}
                          role="menuitem"
                          data-action="toggle-workweek"
                        >
                          <input
                            type="checkbox"
                            className="tui-full-calendar-checkbox-square"
                            checked={workweek}
                            onChange={() => {}}
                          />
                          <span className="checkbox-title" />
                          Show weekends
                        </div>
                      </li>
                    </ul>
                  </span>

                  {/* The prev/next arrows and the "Today" button both used to
                      sit here and have been removed by request. Stepping
                      through months is now the mini calendar's job — its own
                      arrows drive this view through `setCurrentDate`. Nothing
                      here returns to today in one step any more. */}
                </div>
              )}
            </div>

            {/* Right zone: filter legend, then the connect actions. */}
            <div className="flex items-center justify-end gap-4 flex-wrap">
              {showFilters && (
                <div className="lnb-calendars-d1">
                  {calendars?.map((element) => {
                    const name = element?.name;
                    const isChecked = category === name;
                    return (
                      <div key={element?.id} className="lnb-calendars-item">
                        <label>
                          <input
                            type="checkbox"
                            name="meetingFilter"
                            className="tui-full-calendar-checkbox-round"
                            value={name}
                            checked={isChecked}
                            onChange={() => handleCategoryFilter(name as calendarFilterType)}
                          />
                          <span
                            style={{
                              borderColor: element?.bgColor,
                              backgroundColor: isChecked ? element?.bgColor : 'transparent',
                            }}
                          />
                          <span>{capitalizeFirstLetter(element?.name)}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Separates filtering from connecting — two different kinds of
                  action that were previously only a gap apart. */}
              {showFilters && (
                <span
                  className="hidden h-6 w-px shrink-0 bg-mcm-line sm:block"
                  aria-hidden="true"
                />
              )}
              <div className="flex justify-end gap-2 items-center">
                <Button
                  size={'sm'}
                  variant={'outline'}
                  className="rounded-xl border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all font-semibold px-4 shadow-sm"
                  disabled={isLoading || syncButtonClicked === SYNC_BUTTON_LABELS?.GOOGLE?.google}
                  onClick={() => handleOutlookOAuthPopup(SYNC_BUTTON_LABELS?.GOOGLE?.google)}
                >
                  <Icon name="GoogleIcon" className="w-4 h-4" />
                  {isLoading || syncButtonClicked === SYNC_BUTTON_LABELS.GOOGLE.google
                    ? SYNC_BUTTON_LABELS?.GOOGLE?.loading
                    : googleAccessToken
                      ? SYNC_BUTTON_LABELS?.GOOGLE?.disconnect
                      : SYNC_BUTTON_LABELS?.GOOGLE?.syncWithGoogle}
                </Button>
                <Button
                  size={'sm'}
                  variant={'outline'}
                  className="rounded-xl border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all font-semibold px-4 shadow-sm"
                  disabled={isLoading || syncButtonClicked === SYNC_BUTTON_LABELS?.OUTLOOK?.outlook}
                  onClick={() => handleOutlookOAuthPopup(SYNC_BUTTON_LABELS?.OUTLOOK?.outlook)}
                >
                  <Icon name="OutlookIcon" className="w-5 h-5" />
                  {isLoading || syncButtonClicked === SYNC_BUTTON_LABELS?.OUTLOOK?.outlook
                    ? SYNC_BUTTON_LABELS?.OUTLOOK?.loading
                    : outlookAccessToken
                      ? SYNC_BUTTON_LABELS?.OUTLOOK?.disconnect
                      : SYNC_BUTTON_LABELS?.OUTLOOK?.syncWithOutlook}
                </Button>
              </div>
            </div>
          </div>
        </div>
        {/* `mcm-calshell` is now the fixed-for-5-rows VIEWPORT — its own
            height is the same responsive `calc(100vh-Npx)` sizing as
            before, unchanged. `tuiRef` inside it is the plain box the
            library actually renders into; its height is set imperatively
            per month (see `applyMonthRowHeight`) so a 4-week month leaves
            blank space at the bottom of this same box, and a 6-week month
            overflows it, reachable by this box's own scroll — the library
            never sees a container whose height depends on the month, so
            its own row-height math never stretches or squeezes rows.

            The `lg` reservation was 190px, measured a bit optimistically —
            in practice the header row above this card (date heading, view
            switch, sync buttons) plus its own margins run closer to 200px,
            and the page's `lg:overflow-hidden` wrapper has no scrollbar to
            fall back on, so those extra few pixels were hard-clipping row
            5's own bottom edge rather than just leaving less breathing
            room. 205px leaves a small buffer instead of a razor's edge. */}
        {/* Tried `lg:overflow-hidden` here for Day/Week, on the theory
            that the library's own internal timegrid scroll
            (`.tui-full-calendar-timegrid-container`, genuinely
            scrollable — confirmed live: `scrollHeight` 1248px against a
            593px `clientHeight`, all 24 hours present) should be the
            only scroll path, with this outer box just a fixed frame
            around it. It measurably backfired: with this box
            `overflow-hidden`, a real mouse-wheel scroll over the grid
            did nothing at all — `scrollTop` stayed 0 on both this box
            and the inner timegrid — while directly setting
            `timegrid.scrollTop` via script still worked. Browsers appear
            to stop dispatching wheel input at an `overflow-hidden`
            ancestor rather than passing it through to a scrollable
            descendant, so hours past whatever fit in view (7 PM on a
            typical window) became unreachable by any real scroll
            gesture, only by script. `overflow-auto` here for every view
            — the original, unconditional behaviour — keeps this box
            itself a valid wheel-scroll target, which lets the browser's
            normal scroll-chaining hand the gesture down to the inner
            timegrid correctly. The header staying put no longer depends
            on this box specifically not scrolling — `position: sticky`
            on `.tui-full-calendar-dayname-container` (styles.css) pins
            it to the top of whichever ancestor actually does the
            scrolling, so it's correct either way. */}
        <div
          ref={calShellOuterRef}
          className="mcm-calshell min-h-[calc(100vh-240px)] overflow-visible md:min-h-[calc(100vh-220px)] lg:min-h-[calc(100vh-205px)] lg:max-h-[calc(100vh-205px)] lg:overflow-auto"
        >
          {/* Tried `overflow-hidden` here (Day/Week only) to soak up a
              small mismatch between this box's set height and the
              library's actual rendered content (639px content in a 633px
              box, on a tall window — confirmed live). It backfired worse
              than the problem it solved: on a shorter window, that same
              mismatch was 206px, not a handful — the library keeps some
              internal minimum height for the hour column regardless of
              how little space `applyDayWeekHeight` actually had to give
              it, and clipping here doesn't just trim a few stray px in
              that case, it permanently hides however many real hours
              (and their events) fall past the clip line, with no scroll
              able to reach them ever again. A header that's occasionally
              a few px off is a cosmetic bug; hours silently missing is a
              functional one, and a much worse trade. Left as plain
              `w-full` for every view — the library's own internal
              timegrid scroll (`.tui-full-calendar-timegrid-container`,
              a descendant, its own separate `overflow: scroll` context)
              already reaches everything on its own regardless of what
              this box's height matches. */}
          <div ref={tuiRef} className="w-full" />
        </div>
        {useInternalDetailsPopup && selectedSchedule && popoverPosition && (
          <Popover
            open={true}
            onOpenChange={(open) => {
              if (!open) {
                objectRef?.current?.suppressNextCreation();
                setSelectedSchedule(null);
              }
            }}
          >
            <PopoverTrigger asChild>
              <span
                style={{ position: 'absolute', left: popoverPosition.x, top: popoverPosition.y }}
              />
            </PopoverTrigger>
            <PopoverContent
              side="left"
              align="center"
              className="w-[350px] p-0 border-t-4 rounded-lg shadow-md z-[1010]"
              style={{ borderTopColor: selectedSchedule?.borderColor }}
            >
              <div className="flex flex-col gap-2 p-3">
                <h4 className="font-semibold">{selectedSchedule?.title}</h4>
                <div className="flex items-center gap-1">
                  <div className="w-5">
                    <Icon name="TimerIcon" className="w-5 h-5" />
                  </div>
                  <p className="text-sm">
                    {selectedScheduleStartDate
                      ? moment(selectedScheduleStartDate).format('YYYY/MM/DD HH:mm')
                      : '-'}
                    {selectedSchedule?.raw?.category === 'EVENT' &&
                      selectedScheduleEndDate &&
                      ` - ${moment(selectedScheduleEndDate).format('YYYY/MM/DD HH:mm')}`}
                  </p>
                </div>

                {validAttendees?.length > 0 && (
                  <div className="flex items-start gap-1">
                    <div className="w-5">
                      <Icon name="UsersGroup" className="w-5 h-5 text-gray-600 dark:text-mcm-ink-3" />
                    </div>
                    <div className="flex flex-wrap gap-1 text-xs">
                      {validAttendees?.map((email: string, index: number) => (
                        <span
                          key={index}
                          className="bg-gray-200 dark:bg-mcm-surface-3 px-1.5 py-1 rounded text-foreground"
                        >
                          {email.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <Icon name="CategoryIcon" className="w-5" />
                  <p
                    style={{ backgroundColor: selectedSchedule?.bgColor }}
                    className="text-xs text-white p-1 rounded-sm "
                  >
                    {capitalizeFirstLetter(selectedSchedule?.raw?.category || '')}
                  </p>
                </div>
                {selectedSchedule?.body && selectedSchedule?.calendarId === '2' && !isExpired && (
                  <div className="flex items-center gap-1">
                    <div className="w-5 flex justify-center">
                      <Icon name="VideocameraAdd" className="w-4 h-4" />
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <Link to={selectedSchedule?.body} target="_blank">
                        <Button variant={'outline'} size={'sm'} className="w-fit  rounded-full">
                          Join Meet
                        </Button>
                      </Link>
                      <Button
                        variant={'ghost'}
                        size={'sm'}
                        className="hover:text-black dark:hover:text-mcm-ink cursor-pointer"
                        onClick={handleCopy}
                      >
                        {copiedLink ? (
                          <>
                            Copied{' '}
                            <Icon name="CheckMarkIcon" className="w-4 h-4 text-emerald-600" />
                          </>
                        ) : (
                          <>Copy</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                {selectedSchedule?.raw?.reminderMode?.length > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-5">
                      <Icon name="Bell" className="w-4 h-4" />
                    </div>
                    <span className="text-xs">
                      {Array.isArray(selectedSchedule?.raw?.reminderMode)
                        ? selectedSchedule?.raw?.reminderMode
                            .map((item: string) => capitalizeFirstLetter(item || ''))
                            .join(', ')
                        : capitalizeFirstLetter(selectedSchedule?.raw?.reminderMode || '')}
                    </span>
                  </div>
                )}

                {selectedSchedule?.raw?.description && (
                  <div className="flex items-start gap-1">
                    <div className="w-5">
                      <Icon name="DescriptionIcon" className="w-4 h-4" />
                    </div>
                    <div className="text-xs">{selectedSchedule?.raw?.description}</div>
                  </div>
                )}
                {selectedSchedule?.raw?.createdById === userId && (
                  <div className="flex justify-between pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-sm hover:text-black dark:hover:text-mcm-ink cursor-pointer"
                      onClick={() => {
                        onBeforeUpdateSchedule({ schedule: selectedSchedule });
                        setSelectedSchedule(null);
                      }}
                      disabled={isExpired}
                    >
                      Edit
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-sm"
                      onClick={() => {
                        onBeforeDeleteSchedule({ schedule: selectedSchedule });
                        setSelectedSchedule(null);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
        <AlertConfirm
          {...{
            apiLoading: isPending,
            open: openConfirmModal,
            setOpen: setOpenConfirmModal,
            onCancel: () => setSyncButtonClicked(null),
            onConfirm: () => mutateDisconnect({ type: syncButtonClicked }),
            descriptionTextComp: `Are you sure, you want to disconnect with ${syncButtonClicked ?? ''}?`,
          }}
        />
      </div>
    );
  },
);

export default CustomTuiCalendar;
