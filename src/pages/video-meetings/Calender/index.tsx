import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import TableManager from '@/components/custom/table-manager.tsx';
import '@/components/custom/calendar-component/styles.css';
import CustomTuiCalendar from '@/components/custom/calendar-component/CustomTuiCalendar.tsx';
import { CalendarRef } from '@/components/custom/calendar-component/constants.ts';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  assignMembers,
  calendarMeetingList,
  deleteEventAndTask,
  meetingDelete,
  saveAccessToken,
  updateEventTaskStatus,
} from '@/services/api/index.tsx';
import AssignMembersStandaloneModal from '../send-invites/assign-members-standalone';
import {
  calendars,
  colors,
  deleteMessages,
  ExtendedEvent,
  findColors,
  MeetingRawData,
  Schedule,
  SCHEDULEMEETING,
} from './constants.ts';
import moment from 'moment';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { handleAlert } from '@/lib/utils.ts';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ScheduleModal from './Modal/index.tsx';

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  FileText,
  ListTodo,
  List,
  LayoutGrid,
  Pencil,
  Tag,
  Trash2,
  X,
  Users,
  Video,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  Phone,
  Plus,
} from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { useDialpad } from '@/hooks/use-dialpad';
import CustomTooltip from '@/components/custom/custom-tooltip.tsx';
import { CountdownTimer } from '@/components/custom/callback-reminder/countdown-timer';
import AlertConfirm from '@/components/custom/alert-confirm';
import { Button } from '@/components/ui/button.tsx';
import { FilterIcon } from '@/assets/icons/index.tsx';

const getInitials = (name: string) => {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0])?.toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

const getLocalScheduleMoment = (item: any, type: 'start' | 'end') => {
  const localValue = item?.[`${type}TimeLocal`];
  if (localValue) return moment(localValue);

  const utcValue = item?.[`${type}Time`];
  return utcValue ? moment.utc(utcValue).local() : null;
};

const getScheduleTimezone = (item: any): string => {
  const timezone = item?.timezone ?? item?.raw?.timezone;
  if (!timezone) return '';
  if (typeof timezone === 'string') return timezone;
  return String(timezone?.label || timezone?.value || '');
};

const formatDateTimeInTimezone = (value: unknown, timezone: string): string => {
  if (!value || !timezone) return '';

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const getPart = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value || '';

    return `${getPart('year')}/${getPart('month')}/${getPart('day')} ${getPart('hour')}:${getPart('minute')}`;
  } catch {
    return '';
  }
};

/**
 * The month grid draws by start date.
 *
 * tui-calendar treats any schedule whose start and end fall on different
 * dates as a multi-day booking: it spans the cells as a bar, repeats it on
 * both sides of a week boundary, and renders it through the multi-day path
 * rather than the single-day preview template. A 23:30 call running half an
 * hour past midnight is not a two-day event to a reader scanning the month,
 * and because the grid shows one preview per day, that bar also takes the
 * only slot and pushes the day's real entry behind a "1 more".
 *
 * So the end is pulled back to the close of the day it started on, for the
 * grid only. `raw` keeps the true times, and the detail popup reads them
 * from there, so nothing downstream loses the real finish time.
 */
const clampScheduleToStartDay = (schedule: Schedule): Schedule => {
  const start = moment(schedule.start as Date);
  const end = moment(schedule.end as Date);
  if (!start.isValid() || !end.isValid() || start.isSame(end, 'day')) return schedule;
  return { ...schedule, end: start.clone().endOf('day').toDate() };
};

const transformEventTaskToSchedule = (item: MeetingRawData): Schedule => {
  const { _id = '', name = '', category, assignTo = [] } = item;

  const attendees = assignTo.map((m) => m.email);
  const start = getLocalScheduleMoment(item, 'start') || moment();
  const end = getLocalScheduleMoment(item, 'end') || start;
  const { meetingId = '' } = item?.meetings?.[0] || {};
  return {
    id: _id,
    calendarId: findColors[category as keyof typeof findColors] || '1',
    category: 'time',
    title: name,
    start: start.toDate(),
    end: end.toDate(),
    body: `${window.location.origin}/video-meet?meetCode=${meetingId}`,
    isVisible: true,
    attendees,
    raw: {
      ...item,
      assignTo,
      meetingId,
      category,
      _id,
    },
  };
};

// const getMonthDateRange = (date: any) => {
//   const current = moment(date);
//   return {
//     from: current.clone().startOf('month').format('YYYY-MM-DD'),
//     to: current.clone().endOf('month').format('YYYY-MM-DD'),
//   };
// };

const CalendarPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [detailsModal, setDetailsModal] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [event, setEvent] = useState<ExtendedEvent | null>(null);
  console.log(event, detailsModal);

  const [mainView, setMainView] = useState<'calendar' | 'task-list'>('calendar');
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'grid'>('list');
  const childRef = useRef<CalendarRef | null>(null);
  const lastCreateTriggerAtRef = useRef<number>(0);
  const suppressNextCreationRef = useRef(false);
  const [category, setCategory] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
  const queryClient: any = useQueryClient();
  const { user } = useUser();
  const { makeCall, sessions } = useDialpad();

  const iamOnCall = Object.values(sessions || {}).some((session: any) => {
    const status = String(session?.status || '').toLowerCase();
    return ['ringing', 'connecting', 'confirmed', 'calling'].includes(status);
  });

  const userId = user?.user_info?.uuid || '';
  const { from, to } = dateRange || {};
  const todayDate = moment().format('YYYY-MM-DD');
  const [gridData, setGridData] = useState([]);
  const [miniCurrentDate, setMiniCurrentDate] = useState<any>(moment());
  const [miniPickerOpen, setMiniPickerOpen] = useState(false);
  const [miniPickerMode, setMiniPickerMode] = useState<'year' | 'month'>('year');
  const [miniPickerSelectedYear, setMiniPickerSelectedYear] = useState<number>(moment().year());
  const [taskListDateRange, setTaskListDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  });
  const [createdDateRange, setCreatedDateRange] = useState<{
    from_created: string;
    to_created: string;
  }>({
    from_created: '',
    to_created: '',
  });

  const filters = [
    ...(category !== 'ALL' ? [{ key: 'category', value: category }] : []),
    ...(from && to
      ? [
          { key: 'from', value: from },
          { key: 'to', value: to },
        ]
      : []),
  ];
  //calendar
  const { data: calendarMeetingListData } = useQuery({
    queryKey: ['calendarMeetingList', dateRange, category],
    queryFn: () => calendarMeetingList({ page: 1, limit: 999, filters }),
    select: (data) => data?.data?.data?.result?.rows || [],
    enabled: !!dateRange,
  });

  const { mutate: mutateUpdateStatus } = useMutation({
    mutationFn: updateEventTaskStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarMeetingList'] });
      queryClient.invalidateQueries({ queryKey: ['calendarMeetingListTodayEvents'] });
      queryClient.invalidateQueries({ queryKey: ['calendarMeetingListTaskList'] });
      handleAlert({ text: 'Status updated successfully', type: 'success' });
    },
  });

  //today scheudle
  const { data: todayTaskListData = [], isLoading: isTodayTaskListLoading } = useQuery({
    queryKey: ['calendarMeetingListTodayEvents', todayDate],
    queryFn: () =>
      calendarMeetingList({
        filters: [
          { key: 'from', value: todayDate },
          { key: 'to', value: todayDate },
        ],
      }),
    select: (data) => data?.data?.data?.result?.rows || [],
  });

  /* Everything on today, not only the EVENT category. This filtered to
     EVENT alone, so a day's tasks and meetings never reached the panel and
     it reported a fraction of what the grid showed for the same date. */
  const todayEventSchedules = useMemo(
    () =>
      todayTaskListData
        ?.map((item: MeetingRawData) => transformEventTaskToSchedule(item))
        ?.sort(
          (a: Schedule, b: Schedule) => moment(a.start).valueOf() - moment(b.start).valueOf(),
        ) || [],
    [todayTaskListData],
  );
  const { from: taskListFrom, to: taskListTo } = taskListDateRange;
  const { from_created, to_created } = createdDateRange;
  // const taskListFilters = [
  //   { key: 'category', value: 'TASK' },
  //   ...(taskListFrom && taskListTo
  //     ? [
  //       { key: 'from', value: taskListFrom },
  //       { key: 'to', value: taskListTo },
  //     ]
  //     : []),
  // ];
  // const { data: taskListData = [], isLoading: isTaskListLoading } = useQuery({
  //   queryKey: ['calendarMeetingListTaskList', taskListDateRange],
  //   queryFn: () => calendarMeetingList({ filters: taskListFilters }),
  //   select: (data) => data?.data?.data?.result?.rows || [],
  //   enabled: mainView === 'task-list' && !!taskListFrom && !!taskListTo,
  // });
  // const taskListSchedules = useMemo(
  //   () =>
  //     taskListData
  //       ?.map((item: MeetingRawData) => transformEventTaskToSchedule(item))
  //       ?.sort(
  //         (a: Schedule, b: Schedule) => moment(a.start).valueOf() - moment(b.start).valueOf(),
  //       ) || [],
  //   [taskListData],
  // );

  /**
   * How many events and tasks fall on each day, so the mini calendar shows
   * something the month grid beside it cannot: where the month is busy.
   *
   * Keyed off `schedules` — the same list the big calendar renders — so the
   * two never disagree, and the category filter above applies to both. The
   * dot colours match that calendar's legend: events blue, tasks green,
   * meetings violet.
   */
  const miniDayMarkers = useMemo(() => {
    const byDay = new Map<string, { event: number; task: number; meeting: number }>();

    schedules.forEach((schedule) => {
      const start = moment(schedule.start).startOf('day');
      if (!start.isValid()) return;

      const rawEnd = moment(schedule.end).startOf('day');
      /* Anything spanning midnight is marked on every day it covers, not
         just the day it started. The guard is for end dates that arrive
         corrupted — without it a bad year would spin here. */
      const end = rawEnd.isValid() && rawEnd.isAfter(start) ? rawEnd : start;
      const category = String(schedule?.raw?.category || '').toUpperCase();
      const kind =
        category === 'TASK' ? 'task' : category === 'MEETING' ? 'meeting' : 'event';

      const cursor = start.clone();
      let guard = 0;
      while (cursor.isSameOrBefore(end, 'day') && guard < 366) {
        const key = cursor.format('YYYY-MM-DD');
        const entry = byDay.get(key) || { event: 0, task: 0, meeting: 0 };
        entry[kind] += 1;
        byDay.set(key, entry);
        cursor.add(1, 'day');
        guard += 1;
      }
    });

    return byDay;
  }, [schedules]);

  const miniCalendarDays = useMemo(() => {
    const start = miniCurrentDate.clone().startOf('month').startOf('week');
    const end = miniCurrentDate.clone().endOf('month').endOf('week');
    const days: { date: any; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const cursor = start.clone();

    while (cursor.isSameOrBefore(end, 'day')) {
      days.push({
        date: cursor.clone(),
        isCurrentMonth: cursor.month() === miniCurrentDate.month(),
        isToday: cursor.isSame(moment(), 'day'),
      });
      cursor.add(1, 'day');
    }
    return days;
  }, [miniCurrentDate]);
  const miniMonthOptions = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const miniYearOptions = useMemo(() => {
    const centerYear = miniCurrentDate.year();
    return Array.from({ length: 31 }, (_, index) => centerYear - 15 + index);
  }, [miniCurrentDate]);

  const { mutate: mutateSaveAccessToken } = useMutation({
    mutationKey: ['saveAccessToken'],
    mutationFn: saveAccessToken,
    onSuccess: () => queryClient.invalidateQueries(['getCalendarAccessToken'], { exact: true }),
    onSettled: () => navigate(window.location.pathname, { replace: true }),
  });

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const hasScope = searchParams.has('scope');
    const hasClientInfo = searchParams.has('client_info');
    if (error) {
      handleAlert({
        text: 'Calendar sync was cancelled.',
        type: 'warning',
      });
      navigate('/calendar?view=calendar', { replace: true });
      return;
    }
    if (code) {
      const type = hasScope ? 'google' : hasClientInfo ? 'outlook' : 'unknown';
      mutateSaveAccessToken({ type, token: code });
    }
  }, [searchParams]);

  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'task-list') {
      setMainView('task-list');
    } else if (view === 'calendar') {
      setMainView('calendar');
    }
  }, [searchParams]);

  const { mutateAsync: mutateEventTaskDelete, isPending: isDeleting } = useMutation({
    mutationFn: deleteEventAndTask,
    onSuccess: (data) => {
      const category = data?.data?.data?.result?.category?.toLowerCase();
      const newText = deleteMessages[category] || 'Item deleted successfully';
      handleAlert({ text: newText, type: 'success' });
    },
  });

  const { mutateAsync: mutateMeetingDelete, isPending: isMeetingDeleting } = useMutation({
    mutationFn: meetingDelete,
  });

  const toggle = () => {
    setModal(!modal);
    setEvent(null);
  };
  useEffect(() => {
    if (!calendarMeetingListData) return;

    if (calendarMeetingListData?.length === 0) {
      setSchedules([]);
      return;
    }

    const transformedSchedules = calendarMeetingListData?.map((item: MeetingRawData) =>
      clampScheduleToStartDay(transformEventTaskToSchedule(item)),
    );

    setSchedules(transformedSchedules);
  }, [calendarMeetingListData]);
  useEffect(() => {
    setMiniPickerSelectedYear(miniCurrentDate.year());
  }, [miniCurrentDate]);
  // Disable automatic date range selection from the mini calendar so the user can choose themselves
  // useEffect(() => {
  //   setTaskListDateRange(getMonthDateRange(miniCurrentDate));
  // }, [miniCurrentDate]);
  useEffect(() => {
    if (mainView !== 'calendar') return;
    const timer = window.setTimeout(() => {
      childRef.current?.refreshCalendar?.();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mainView]);

  const [assignMemberState, setAssignMemberState] = useState<{ open: boolean; schedule: any }>({
    open: false,
    schedule: null,
  });
  const [deleteConfirmState, setDeleteConfirmState] = useState<{ open: boolean; schedule: any }>({
    open: false,
    schedule: null,
  });

  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);

  const { mutate: mutateAssignMembers, isPending: isAssigningMembers } = useMutation({
    mutationFn: assignMembers,
    onSuccess: () => {
      handleAlert({ text: 'Members assigned successfully', type: 'success' });
      setAssignMemberState({ open: false, schedule: null });
      queryClient.invalidateQueries({ queryKey: ['calendarMeetingList'] });
      queryClient.invalidateQueries({ queryKey: ['calendarMeetingListTodayEvents'] });
      queryClient.invalidateQueries({ queryKey: ['calendarMeetingListTaskList'] });
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.error?.message || 'Failed to assign members';
      handleAlert({ text: errMsg, type: 'error' });
    },
  });

  const onOpenAssignMember = (schedule: any) => {
    const members = (schedule?.assignTo || []).map((m: any) => ({
      user_uuid: m.userId || m.user_uuid,
      email: m.email,
      name: m.name,
      type: m.type,
    }));
    setSelectedMembers(members);
    setAssignMemberState({ open: true, schedule });
  };

  const assignFormInstance = {
    watch: (key: string) => (key === 'members' ? selectedMembers : []),
    setValue: (key: string, value: any) => {
      if (key === 'members') setSelectedMembers(value);
    },
    formState: { errors: {} },
  };

  const onBeforeCreateSchedule = useCallback((event: any) => {
    const nowTs = Date.now();
    if (nowTs - lastCreateTriggerAtRef.current < 150) return;
    lastCreateTriggerAtRef.current = nowTs;

    setDetailsModal(null);
    if (suppressNextCreationRef.current) {
      suppressNextCreationRef.current = false;
      event?.guide?.clearGuideElement?.();
      return;
    }
    const startDate =
      typeof event?.start?.toDate === 'function' ? event.start.toDate() : event?.start;
    const start = moment(startDate);
    const now = moment();
    if (start.isBefore(now, 'day')) {
      event?.guide?.clearGuideElement?.();
      return;
    }

    event?.guide?.clearGuideElement?.();
    setModal(true);
    setEvent(event);
  }, []);

  const onBeforeUpdateSchedule = useCallback((event: any) => {
    const { schedule, changes } = event;
    if (changes?.start || changes?.end) {
      return;
    }

    const result = true;
    if (result) {
      childRef.current?.updateSchedule(schedule, changes);
    }

    setModal(true);
    setEvent(event);
  }, []);

  const onBeforeDeleteSchedule = useCallback(
    async (event: any) => {
      const { schedule } = event;
      const eventTaskId = schedule?._id || schedule?.id;

      const category = schedule?.raw?.category || schedule?.category;
      const referenceId = schedule?.raw?.referenceId || schedule?.referenceId;

      if (category !== 'TASK' && referenceId) {
        await mutateMeetingDelete(referenceId);
      }

      if (eventTaskId) {
        const response = await mutateEventTaskDelete({ eventTaskId });
        const result = response?.status === 200;

        if (result) {
          childRef.current?.deleteSchedule(schedule);
          queryClient.invalidateQueries({ queryKey: ['calendarMeetingList'], refetchType: 'all' });
          queryClient.invalidateQueries({
            queryKey: ['calendarMeetingListTodayEvents'],
            refetchType: 'all',
          });
          queryClient.invalidateQueries({
            queryKey: ['calendarMeetingListTaskList'],
            refetchType: 'all',
          });
        }
      }

      return true;
    },
    [mutateEventTaskDelete, mutateMeetingDelete, queryClient],
  );

  const formatCalendars = calendars.map((element) => ({
    ...colors?.find((element2) => element2?.id === element?.id),
    ...element,
  }));

  const handleCategoryFilter = (category: string) => setCategory(category);
  const handleTaskListDateFilterChange = (field: 'from' | 'to', value: string) => {
    setTaskListDateRange((prev) => {
      const next = { ...prev, [field]: value };
      if (next.from && next.to && next.from > next.to) {
        if (field === 'from') {
          next.to = value;
        } else {
          next.from = value;
        }
      }
      return next;
    });
  };
  const handleCreatedDateFilterChange = (field: 'from_created' | 'to_created', value: string) => {
    setCreatedDateRange((prev) => {
      const next = { ...prev, [field]: value };
      if (next.from_created && next.to_created && next.from_created > next.to_created) {
        if (field === 'from_created') {
          next.to_created = value;
        } else {
          next.from_created = value;
        }
      }
      return next;
    });
  };
  const getScheduleDate = (value: any) => {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    return value instanceof Date ? value : new Date(value);
  };
  const openCustomDetailsPopup = useCallback((schedule: any) => {
    console.log(schedule, 'schedule????');

    setCopiedLink(false);
    setDetailsModal(schedule);
  }, []);

  const handleTodayTaskClick = useCallback(
    (schedule: Schedule) => {
      openCustomDetailsPopup(schedule);
    },
    [openCustomDetailsPopup],
  );

  const handleCopyLink = () => {
    if (!detailsModal?.raw?.referenceId && !detailsModal?.referenceId) return;
    const meetUrl = `${window.location.origin}/video-meet?meetCode=${detailsModal?.raw?.referenceId || detailsModal?.referenceId}`;
    navigator.clipboard.writeText(meetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };
  /* Off `raw` first. A schedule that crossed midnight has had its `end`
     pulled back to 23:59 for the month grid, so reading the schedule here
     would report the wrong finish time on the very events the clamp
     touched. `raw` is the untouched record. */
  const detailsStartDate =
    getScheduleDate(getLocalScheduleMoment(detailsModal?.raw, 'start')?.toDate()) ??
    getScheduleDate(detailsModal?.start);
  const detailsEndDate =
    getScheduleDate(getLocalScheduleMoment(detailsModal?.raw, 'end')?.toDate()) ??
    getScheduleDate(detailsModal?.end);
  const detailsTimezone = getScheduleTimezone(detailsModal?.raw || detailsModal);
  const detailsCategory = String(detailsModal?.raw?.category || '')?.toUpperCase();
  const isEvent = detailsCategory === 'EVENT';
  const loggedInUserTimezone = user?.settings?.operational_hours?.regional?.timezone?.value || '';
  const detailsRaw = detailsModal?.raw || detailsModal;
  const detailsStartInUserTimezone = formatDateTimeInTimezone(
    detailsRaw?.startTime || detailsRaw?.startUtc,
    loggedInUserTimezone,
  );
  const detailsEndInUserTimezone = formatDateTimeInTimezone(
    detailsRaw?.endTime || detailsRaw?.endUtc,
    loggedInUserTimezone,
  );
  const validAttendees = Array.isArray(detailsModal?.attendees)
    ? detailsModal?.attendees?.filter(
        (email: string): email is string => typeof email === 'string' && email.trim() !== '',
      )
    : [];

  console.log(validAttendees);

  const isExpired = detailsEndDate ? moment(detailsEndDate).isBefore(moment()) : false;
  const isOngoing =
    detailsStartDate && detailsEndDate
      ? moment().isSameOrAfter(moment(detailsStartDate)) &&
        moment().isBefore(moment(detailsEndDate))
      : false;
  const syncBigCalendarToDate = (targetDate: any) => {
    setMiniCurrentDate(targetDate.clone());
    childRef.current?.setCurrentDate(targetDate.toDate());
  };
  /* One control for month and year, and it opens on the year.
     Narrowing year first and then month follows how a date is actually
     chosen — the year is the coarser decision, and picking it first means
     the months you are then shown are the right twelve. `handleMiniYearSelect`
     advances to the month grid, so it reads as one continuous step. */
  const handleMiniPeriodClick = () => {
    setMiniPickerSelectedYear(miniCurrentDate.year());
    setMiniPickerMode('year');
    setMiniPickerOpen((prev) => !prev);
  };
  const handleMiniYearSelect = (year: number) => {
    setMiniPickerSelectedYear(year);
    setMiniPickerMode('month');
  };
  const handleMiniMonthSelect = (monthIndex: number) => {
    const targetDate = miniCurrentDate
      .clone()
      .year(miniPickerSelectedYear)
      .month(monthIndex)
      .date(1);
    syncBigCalendarToDate(targetDate);
    setMiniPickerOpen(false);
  };
  const handleMiniDateClick = (targetDate: any) => {
    setMiniPickerOpen(false);
    syncBigCalendarToDate(targetDate);
    setMainView('calendar');
    setSearchParams((prev) => {
      prev.set('view', 'calendar');
      return prev;
    });
    const now = moment();
    const roundedMinute = now.minute() <= 30 ? 0 : 30;
    const startMoment = targetDate
      .clone()
      .hour(now.hour())
      .minute(roundedMinute)
      .second(0)
      .millisecond(0);
    const endMoment = startMoment.clone().add(1, 'hour');
    const asTzLikeDate = (dateValue: Date) => ({
      toDate: () => dateValue,
    });

    setDetailsModal(null);
    setEvent({
      start: asTzLikeDate(startMoment.toDate()),
      end: asTzLikeDate(endMoment.toDate()),
      isAllDay: false,
      triggerEventName: 'click',
    });
    setModal(true);
  };
  const isMiniDateDisabled = (targetDate: any) => targetDate.isBefore(moment(), 'day');

  const columns = useMemo(
    () => [
      {
        header: 'Created On',
        accessorKey: 'createdAt',
        cell: ({ row }: any) => {
          const createdAt = row.original?.createdAt;
          return (
            <div className="mcm-task-when">
              <span className="mcm-task-date">{moment(createdAt).format('MMM DD, YYYY')}</span>
              <span className="mcm-task-time">{moment(createdAt).format('hh:mm A')}</span>
            </div>
          );
        },
      },
      {
        header: 'Title',
        accessorKey: 'name',
        /* Truncation is left to the column width rather than a fixed max-width.
           The caps here were 100px/160px, so the title clipped even once the
           column had room to show it. */
        cell: ({ row }: any) => (
          <span className="mcm-task-title" title={row.original.name || ''}>
            {row.original.name}
          </span>
        ),
      },
      /* No Category column. On a task list the value is either absent or the
         constant "TASK", so the column held a dash on every row while taking
         width from Title, which was truncating. */
      // {
      //   header: "Scheduled At",
      //   accessorKey: "startTime",
      //   cell: ({ row }: any) => {
      //     const date = row?.original?.startTime;
      //     return (
      //       <div className="flex flex-col">
      //         <span className="text-stone-900 dark:text-foreground">
      //           {moment(date).format("MMM D, YYYY")}
      //         </span>
      //         <span className="text-xs text-stone-500 dark:text-muted-foreground">
      //           {moment(date).format("hh:mm A")}
      //           {row?.original?.end &&
      //             row?.original?.raw?.category !== "TASK" &&
      //             ` - ${moment(row?.original?.end).format("hh:mm A")}`}
      //         </span>
      //       </div>
      //     );
      //   },
      // },
      {
        header: 'Scheduled At',
        accessorKey: 'startTimeLocal',
        cell: ({ row }: any) => {
          const start = getLocalScheduleMoment(row.original, 'start');
          const timezone = getScheduleTimezone(row.original);
          const isToday = start?.isSame(moment(), 'day');
          return (
            <div className="mcm-task-when">
              <span className="mcm-task-date">
                {start?.isValid() ? start.format('MMM DD, YYYY') : '—'}
              </span>
              {/* Time and countdown share one line. As a third line the badge
                  made this row 69px against 49px for every other row, so the
                  list had no vertical rhythm. */}
              <span className="mcm-task-time">
                {start?.isValid() ? start.format('hh:mm A') : '—'}
                {timezone ? ` (${timezone})` : ''}
                {isToday &&
                  row.original.status !== 'COMPLETED' &&
                  row.original.category === 'TASK' &&
                  start?.isAfter(moment()) && <CountdownTimer targetDate={start.toISOString()} />}
              </span>
            </div>
          );
        },
      },
      /* No Created By column. `createdByDetails` is absent on every task the
         list endpoint returns, so the column rendered an empty cell on all 12
         rows while holding 94px -- width Title needed, since Title was
         truncating at 134px. Same reasoning as Category and Call above. */
      {
        header: 'Source',
        // accessorKey: 'source',
        cell: ({ row }: any) => (
          <span className="mcm-task-source">
            {row.original?.source === 'CALENDAR' ? 'Meeting' : row?.original?.source?.toLowerCase()}
          </span>
        ),
      },
      {
        header: 'Assigned to',
        accessorKey: 'assignTo',
        cell: ({ row }: any) => {
          const assignTo = row?.original?.assignTo || [];
          return (
            <div className="flex items-center">
              {assignTo.length > 0 ? (
                <div className="flex -space-x-2.5 overflow-hidden">
                  {assignTo.slice(0, 4).map((member: any, i: number) => {
                    const name = member.name || member.email || 'Unknown';
                    return (
                      <CustomTooltip key={i} text={name} side="top">
                        <div className="w-8 h-8 flex items-center justify-center border border-white rounded-full bg-slate-100 cursor-pointer shadow-sm">
                          <div className="w-full h-full flex items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-600 text-[10px] font-bold uppercase">
                            {getInitials(name)}
                          </div>
                        </div>
                      </CustomTooltip>
                    );
                  })}
                  {assignTo.length > 4 && (
                    <div className="w-8 h-8 flex items-center justify-center border border-white rounded-full bg-slate-100 shadow-sm">
                      <div className="w-full h-full flex items-center justify-center rounded-full border border-slate-300 bg-slate-200 text-slate-700 text-[10px] font-bold">
                        +{assignTo.length - 4}
                      </div>
                    </div>
                  )}
                </div>
              ) : row.original?.category === 'TASK' ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAssignMember(row.original);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[11px] font-bold uppercase tracking-wider hover:bg-[var(--primary)]/20 transition-all active:scale-95 border border-[var(--primary)]/20"
                >
                  <Plus className="w-3 h-3" />
                  Assign
                </button>
              ) : (
                <span className="mcm-task-empty">—</span>
              )}
            </div>
          );
        },
      },
      {
        header: 'Status',
        accessorKey: '_id',
        cell: ({ row }: any) => {
          const isCompleted = row?.original?.status?.toUpperCase() === 'COMPLETED';
          const isPast = getLocalScheduleMoment(row?.original, 'start')?.isBefore(moment());
          const isOverdue = !isCompleted && isPast;

          return (
            <div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : isOverdue
                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                }`}
              >
                {isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'Scheduled'}
              </span>
            </div>
          );
        },
      },
      // {
      //   id: 'makeCall',
      //   header: 'Make Call',
      //   cell: ({ row }: any) => {
      //     const schedule = row.original;
      //     if (schedule.mode !== 'CALL') return <span className="text-xs text-slate-400">--</span>;
      //     return (
      //       <button
      //         onClick={() => {
      //           if (schedule.contactPhone) {
      //             makeCall(schedule.contactPhone, {
      //               extraHeaders: [`X-ContactName: ${schedule.contactName || ' '}`],
      //             });
      //           } else {
      //             handleAlert({ text: 'Phone number not available', type: 'error' });
      //           }
      //         }}
      //         className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-ucass-active-bg text-ucass-active hover:bg-ucass-active-bg transition-colors"
      //         title="Make Call"
      //       >
      //         <Phone className="h-4 w-4" />
      //       </button>
      //     );
      //   },
      // },
      /* No Call column. It rendered a dash whenever the task had no
         contactPhone, which was every row in practice, and the same call
         action is available from the Actions menu beside it. */
      {
        id: 'action',
        header: 'Actions',
        meta: { textAlign: 'right' },
        cell: ({ row }: any) => {
          const schedule = row.original;
          return (
            <div className="text-right" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
                  <DropdownMenuItem
                    onClick={() => setDetailsModal(transformEventTaskToSchedule(schedule))}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <span>View Details</span>
                  </DropdownMenuItem>

                  {schedule.details?.contactPhone && schedule?.status !== 'COMPLETED' && (
                    <DropdownMenuItem
                      disabled={iamOnCall}
                      onClick={() => {
                        console.log(schedule, 'scheduleschedule dropdown');
                        if (schedule.details?.contactPhone) {
                          makeCall(schedule.details.contactPhone, {
                            extraHeaders: [`X-ContactName: ${schedule.details.contactName || ' '}`],
                          });
                        } else {
                          handleAlert({ text: 'Phone number not available', type: 'error' });
                        }
                      }}
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      <span>Make Call</span>
                    </DropdownMenuItem>
                  )}

                  {schedule.mode === 'VIDEO' && schedule?.referenceId && (
                    <DropdownMenuItem
                      onClick={() => {
                        if (schedule.referenceId) {
                          window.open(`/video-meet?meetCode=${schedule.referenceId}`, '_blank');
                        } else {
                          handleAlert({ text: 'Meeting code not available', type: 'error' });
                        }
                      }}
                    >
                      <Video className="mr-2 h-4 w-4 text-[var(--primary)]" />
                      <span>Join Meet</span>
                    </DropdownMenuItem>
                  )}

                  {schedule?.category === 'TASK' && (
                    <DropdownMenuItem
                      onClick={() =>
                        mutateUpdateStatus({
                          eventTaskId: schedule._id,
                          status: schedule.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED',
                        })
                      }
                    >
                      {schedule.status === 'COMPLETED' ? (
                        <>
                          <Circle className="mr-2 h-4 w-4" />
                          <span className="whitespace-nowrap">Mark as Uncompleted</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          <span>Mark as Completed</span>
                        </>
                      )}
                    </DropdownMenuItem>
                  )}

                  <div className="h-px bg-slate-100 my-1" />
                  {schedule?.createdById === userId ? (
                    <>
                      {schedule?.status !== 'COMPLETED' ? (
                        <DropdownMenuItem
                          className=""
                          onClick={() => {
                            console.log(schedule, 'scheduleschedule');

                            setDetailsModal(null);
                            setModal(true);
                            setEvent({ schedule: schedule });
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Reschedule</span>
                        </DropdownMenuItem>
                      ) : null}

                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setDeleteConfirmState({ open: true, schedule })}
                      >
                        <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [
      mutateUpdateStatus,
      makeCall,
      onBeforeDeleteSchedule,
      setDetailsModal,
      handleTodayTaskClick,
      userId,
      sessions,
    ],
  );
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto overflow-x-hidden p-3 lg:overflow-hidden">
      <div className="rounded-lg bg-white border border-slate-200 overflow-visible lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] min-h-[calc(100vh-88px)] overflow-visible lg:overflow-hidden">
          <aside className="mcm-calpanel p-4">
            <div className="relative mb-3">
              {/* No prev/next arrows here. The main calendar's header already
                  steps through months, and two arrow pairs driving one date
                  left it ambiguous which was authoritative. This picker jumps
                  to a month or year; the main header walks through time.
                  Dropping them also ends the overflow that pushed the next
                  arrow past the panel edge — the two remaining buttons now
                  split the full width instead of competing for it. */}
              <div className="flex items-center gap-1">
                {/* Month and year read as one thing — "September 2026" — so
                    they are one control rather than two adjacent dropdowns
                    splitting the row. It opens the month grid; the year is
                    reachable from inside that, which is the rarer jump. */}
                <button
                  type="button"
                  onClick={handleMiniPeriodClick}
                  className="mcm-cal-ctrl cursor-pointer inline-flex min-w-0 flex-1 items-center justify-between gap-1 truncate rounded-md border px-2.5 py-1.5 text-sm font-semibold text-mcm-ink"
                >
                  <span className="truncate">{miniCurrentDate.format('MMMM YYYY')}</span>
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 text-mcm-ink-2" />
                </button>

                {/* Stepping a month at a time is the common move, so it gets
                    its own controls rather than living inside the picker. */}
                <button
                  type="button"
                  aria-label="Previous month"
                  className="mcm-cal-ctrl h-7 w-7 shrink-0 rounded-md border grid place-items-center cursor-pointer"
                  onClick={() => {
                    syncBigCalendarToDate(miniCurrentDate.clone().subtract(1, 'month'));
                    setMiniPickerOpen(false);
                  }}
                >
                  <ChevronLeft className="w-4 h-4 text-mcm-ink-2" />
                </button>
                <button
                  type="button"
                  aria-label="Next month"
                  className="mcm-cal-ctrl h-7 w-7 shrink-0 rounded-md border grid place-items-center cursor-pointer"
                  onClick={() => {
                    syncBigCalendarToDate(miniCurrentDate.clone().add(1, 'month'));
                    setMiniPickerOpen(false);
                  }}
                >
                  <ChevronRight className="w-4 h-4 text-mcm-ink-2" />
                </button>
              </div>

              {miniPickerOpen && (
                <div className="absolute z-30 mt-2 w-full rounded-xl border border-mcm-line bg-white shadow-lg">
                  {miniPickerMode === 'year' ? (
                    <div className="p-2">
                      <p className="px-1 pb-2 text-sm font-semibold text-mcm-ink-3  tracking-wide">
                        Select Year
                      </p>
                      <div className="grid grid-cols-3 gap-1 max-h-48 overflow-y-auto pr-1">
                        {miniYearOptions.map((year) => (
                          <button
                            key={year}
                            type="button"
                            onClick={() => handleMiniYearSelect(year)}
                            className={`cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium transition ${
                              miniPickerSelectedYear === year
                                ? 'bg-[var(--primary)] text-white'
                                : 'text-mcm-ink-2 hover:bg-mcm-surface-2'
                            }`}
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2">
                      <div className="mb-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setMiniPickerMode('year')}
                          className="cursor-pointer text-sm font-semibold text-mcm-ink-2 hover:text-mcm-ink"
                        >
                          Change Year
                        </button>
                        <span className="text-sm font-semibold text-mcm-ink">
                          {miniPickerSelectedYear}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {miniMonthOptions.map((monthName, monthIndex) => (
                          <button
                            key={monthName}
                            type="button"
                            onClick={() => handleMiniMonthSelect(monthIndex)}
                            className={`cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium transition ${
                              miniCurrentDate.year() === miniPickerSelectedYear &&
                              miniCurrentDate.month() === monthIndex
                                ? 'bg-[var(--primary)] text-white'
                                : 'text-mcm-ink-2 hover:bg-mcm-surface-2'
                            }`}
                          >
                            {monthName.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mcm-cal-weekdays grid grid-cols-7 gap-1 text-[11px] mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <span key={day} className="text-center font-medium">
                  {day}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 mb-5">
              {miniCalendarDays.map((item) => {
                const isDisabled = isMiniDateDisabled(item.date);
                const dayKey = item.date.format('YYYY-MM-DD');
                const marks = miniDayMarkers.get(dayKey);
                const eventCount = marks?.event || 0;
                const taskCount = marks?.task || 0;
                const meetingCount = marks?.meeting || 0;
                /* Three dots is what fits inside a 28px cell (3x5px plus two
                   3px gaps). One dot per kind present, so a mixed day shows
                   which kinds rather than how many of the first one; the
                   exact counts are in the tooltip. */
                const dots = [
                  ...Array(eventCount ? 1 : 0).fill('event'),
                  ...Array(taskCount ? 1 : 0).fill('task'),
                  ...Array(meetingCount ? 1 : 0).fill('meeting'),
                ].slice(0, 3);
                const summary = [
                  eventCount ? `${eventCount} event${eventCount > 1 ? 's' : ''}` : '',
                  taskCount ? `${taskCount} task${taskCount > 1 ? 's' : ''}` : '',
                  meetingCount ? `${meetingCount} meeting${meetingCount > 1 ? 's' : ''}` : '',
                ]
                  .filter(Boolean)
                  .join(', ');

                return (
                  /* The button stays a fixed 28px square so the "today"
                     highlight is a circle; the dot row sits under it in this
                     wrapper. Putting the dots inside the button instead would
                     stretch that circle into an oval. */
                  <div key={dayKey} className="flex flex-col items-center gap-[3px]">
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleMiniDateClick(item.date)}
                      title={summary ? `${item.date.format('D MMM')} — ${summary}` : undefined}
                      className={`mcm-daycell h-7 w-7 rounded-full grid place-items-center text-xs transition ${
                        item.isToday
                          ? 'bg-[var(--primary)] text-white font-semibold'
                          : item.isCurrentMonth
                            ? 'text-mcm-ink'
                            : 'text-mcm-ink-4'
                      } ${
                        isDisabled
                          ? 'opacity-45 cursor-not-allowed'
                          : 'cursor-pointer hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]'
                      }`}
                    >
                      {item.date.date()}
                    </button>
                    {/* Always rendered, so rows keep a constant height whether
                        or not the day has anything on it. */}
                    <span className="mcm-cal-dots" aria-hidden="true">
                      {dots.map((kind, dotIndex) => (
                        <i key={`${dayKey}-${kind}-${dotIndex}`} className={`mcm-cal-dot is-${kind}`} />
                      ))}
                    </span>
                    {summary ? <span className="sr-only">{summary}</span> : null}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                setMainView('task-list');
                setSearchParams((prev) => {
                  prev.set('view', 'task-list');
                  return prev;
                });
              }}
              className="mt-4 flex w-full items-center justify-between rounded-xl bg-[var(--primary)]  px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 active:scale-95 cursor-pointer"
            >
              <span>Tasks List View</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="mcm-cal-divider flex items-center justify-between mb-3 mt-4">
              <p className="text-sm font-semibold text-mcm-ink">Today Events</p>
              <span className="text-xs text-mcm-ink-3">{todayEventSchedules?.length || 0}</span>
            </div>
            {/* `-mr-1` cancels the `pr-1`. The padding keeps the scrollbar
                off the cards, but on its own it also pulled every card 4px
                short of the "Tasks List View" button above, so the two
                stacks had matching left edges and mismatched right ones. */}
            <div className="space-y-2 max-h-[calc(100vh-474px)] overflow-y-auto pr-1 -mr-1">
              {todayEventSchedules?.map((schedule: Schedule) => {
                const itemCategory = String(schedule?.raw?.category || '')?.toUpperCase();
                /* The same three colours the grid, the mini calendar's dots
                   and the legend use, so a colour means one thing across the
                   whole page. Everything here used to be --primary orange
                   regardless of what it was. */
                const tone =
                  itemCategory === 'TASK'
                    ? { colour: '#34c38f', Icon: ListTodo }
                    : itemCategory === 'MEETING'
                      ? { colour: '#a78bfa', Icon: CalendarClock }
                      : { colour: '#00a9ff', Icon: CalendarClock };
                const { Icon: ToneIcon } = tone;
                return (
                  <button
                    key={schedule.id}
                    type="button"
                    onClick={() => handleTodayTaskClick(schedule)}
                    className="w-full cursor-pointer rounded-xl border border-mcm-line bg-white p-3.5 text-left hover:border-[var(--primary)] hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: tone.colour }}
                      />
                      <ToneIcon
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: tone.colour }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-mcm-ink truncate">
                          {schedule.title}
                        </p>
                        <p className="text-[11px] text-mcm-ink-3">
                          {moment(schedule.start).format('hh:mm A')} -{' '}
                          {moment(schedule.end).format('hh:mm A')}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {!isTodayTaskListLoading && todayEventSchedules?.length === 0 && (
                <div className="mcm-cal-well rounded-xl border border-dashed p-3 text-xs text-mcm-ink-3 text-center">
                  No events for today.
                </div>
              )}
            </div>
          </aside>

          {/* min-w-0 matters as much as min-h-0 here. A grid item defaults to
              min-width:auto, so this section could not shrink below its
              content and sat 12px wider than the 1fr track -- which the grid
              clips, since it is lg:overflow-hidden. That is what cut the
              Actions column and the pager off at the right edge. */}
          <section className="min-h-0 min-w-0 p-2">
            <div
              className={
                mainView === 'calendar' ? 'block h-auto lg:h-full' : 'hidden h-auto lg:h-full'
              }
            >
              <CustomTuiCalendar
                ref={childRef}
                {...{
                  schedules,
                  category,
                  showMenu: true,
                  showFilters: true,
                  handleCategoryFilter,
                  calendars: formatCalendars,
                  onBeforeCreateSchedule,
                  onBeforeUpdateSchedule,
                  onBeforeDeleteSchedule,
                  onEditSchedule: onBeforeUpdateSchedule,
                  onDeleteSchedule: onBeforeDeleteSchedule,
                  suppressNextCreationRef,
                  useInternalDetailsPopup: false,
                  onScheduleClick: ({ schedule }: { schedule: Schedule }) =>
                    openCustomDetailsPopup(schedule),
                  onCurrentDateChange: (currentDate: string) =>
                    setMiniCurrentDate(moment(currentDate, 'YYYY-MM-DD')),
                  onRangeChange: (range) => setDateRange(range),
                }}
              />
            </div>

            <div className={mainView === 'task-list' ? 'block p-1 pt-0' : 'hidden p-3'}>
              <div className="">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between pb-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMainView('calendar');
                          setSearchParams((prev) => {
                            prev.set('view', 'calendar');
                            return prev;
                          });
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <ArrowLeft className="h-4 w-4 text-slate-600" />
                      </button>
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        Task Listing
                      </h2>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <Button
                      type="button"
                      onClick={() => {
                        setEvent({ category: 'task', start: new Date() });
                        setModal(true);
                      }}
                      className="cursor-pointer flex items-center justify-center gap-1.5 px-4 h-9 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>Add Task</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowFilter(!showFilter)}
                      className="cursor-pointer flex items-center justify-center min-h-9 min-w-9 max-w-9 max-h-9 rounded-lg w-9 h-9 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
                    >
                      <FilterIcon className="w-5 h-5" />
                    </Button>

                    <div className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white p-1">
                      <button
                        type="button"
                        aria-label="List view"
                        title="List view"
                        onClick={() => setTaskViewMode('list')}
                        className={`cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                          taskViewMode === 'list'
                            ? 'bg-[var(--primary)] text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <List className="h-4 w-4 shrink-0" />
                      </button>
                      <button
                        type="button"
                        aria-label="Grid view"
                        title="Grid view"
                        onClick={() => setTaskViewMode('grid')}
                        className={`cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                          taskViewMode === 'grid'
                            ? 'bg-[var(--primary)] text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <LayoutGrid className="h-4 w-4 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* {isTaskListLoading && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                  <div className="h-10 bg-slate-100 rounded animate-pulse" />
                  <div className="h-10 bg-slate-100 rounded animate-pulse" />
                  <div className="h-10 bg-slate-100 rounded animate-pulse" />
                </div>
              )} */}
              {/* {!isTaskListLoading && taskListSchedules?.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                  No tasks found
                </div>
              )} */}
              {showFilter ? (
                <div className="flex flex-wrap items-center justify-end gap-3 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Created On:</span>
                    <div className="sm:h-11 flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-1.5 sm:py-0 transition-all hover:border-[var(--primary)]/30 hover:bg-white">
                      <div className="inline-flex items-center gap-2.5">
                        <label
                          className="text-[10px] font-bold uppercase tracking-widest text-slate-400"
                          htmlFor="task-created-from-date"
                        >
                          From
                        </label>
                        <div
                          className="relative flex items-center gap-1 cursor-pointer"
                          onClick={(e) => {
                            const input = e.currentTarget.querySelector('input');
                            input?.showPicker?.();
                          }}
                        >
                          <input
                            id="task-created-from-date"
                            type="date"
                            value={from_created}
                            max={to_created}
                            onChange={(e) =>
                              handleCreatedDateFilterChange('from_created', e.target.value)
                            }
                            className="h-8 w-[95px] bg-transparent text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          />
                          <CalendarClock className="h-4 w-4 text-[var(--primary)] pointer-events-none" />
                        </div>
                      </div>
                      <div className="hidden sm:block h-5 w-px bg-slate-200" />
                      <div className="inline-flex items-center gap-2.5">
                        <label
                          className="text-[10px] font-bold uppercase tracking-widest text-slate-400"
                          htmlFor="task-created-to-date"
                        >
                          To
                        </label>
                        <div
                          className="relative flex items-center gap-1 cursor-pointer"
                          onClick={(e) => {
                            const input = e.currentTarget.querySelector('input');
                            input?.showPicker?.();
                          }}
                        >
                          <input
                            id="task-created-to-date"
                            type="date"
                            value={to_created}
                            min={from_created}
                            onChange={(e) =>
                              handleCreatedDateFilterChange('to_created', e.target.value)
                            }
                            className="h-8 w-[95px] bg-transparent text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          />
                          <CalendarClock className="h-4 w-4 text-[var(--primary)] pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Schedule Date:</span>
                    <div className="sm:h-11 flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-1.5 sm:py-0 transition-all hover:border-[var(--primary)]/30 hover:bg-white">
                      <div className="inline-flex items-center gap-2.5">
                        <label
                          className="text-[10px] font-bold uppercase tracking-widest text-slate-400"
                          htmlFor="task-from-date"
                        >
                          From
                        </label>
                        <div
                          className="relative flex items-center gap-1 cursor-pointer"
                          onClick={(e) => {
                            const input = e.currentTarget.querySelector('input');
                            input?.showPicker?.();
                          }}
                        >
                          <input
                            id="task-from-date"
                            type="date"
                            value={taskListFrom}
                            max={taskListTo}
                            onChange={(e) => handleTaskListDateFilterChange('from', e.target.value)}
                            className="h-8 w-[95px] bg-transparent text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          />
                          <CalendarClock className="h-4 w-4 text-[var(--primary)] pointer-events-none" />
                        </div>
                      </div>
                      <div className="hidden sm:block h-5 w-px bg-slate-200" />
                      <div className="inline-flex items-center gap-2.5">
                        <label
                          className="text-[10px] font-bold uppercase tracking-widest text-slate-400"
                          htmlFor="task-to-date"
                        >
                          To
                        </label>
                        <div
                          className="relative flex items-center gap-1 cursor-pointer"
                          onClick={(e) => {
                            const input = e.currentTarget.querySelector('input');
                            input?.showPicker?.();
                          }}
                        >
                          <input
                            id="task-to-date"
                            type="date"
                            value={taskListTo}
                            min={taskListFrom}
                            onChange={(e) => handleTaskListDateFilterChange('to', e.target.value)}
                            className="h-8 w-[95px] bg-transparent text-xs font-semibold text-slate-700 outline-none transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          />
                          <CalendarClock className="h-4 w-4 text-[var(--primary)] pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {(taskListFrom || taskListTo || from_created || to_created) && (
                    <button
                      type="button"
                      onClick={() => {
                        setTaskListDateRange({ from: '', to: '' });
                        setCreatedDateRange({ from_created: '', to_created: '' });
                      }}
                      className="h-11 inline-flex items-center gap-1.5 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95 cursor-pointer animate-fade-in"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  )}
                </div>
              ) : null}

              <div className={taskViewMode === 'list' ? '' : 'hidden'}>
                <TableManager
                  {...{
                    columns,
                    customClass: 'mcm-tasktable',
                    fetcherKey: 'calendarMeetingListTaskList',
                    fetcherFn: calendarMeetingList,
                    onSuccess: (data: any) => {
                      setGridData(data?.data?.data?.result?.rows || []);
                    },
                    extraParams: {
                      filters: [
                        { key: 'category', value: 'TASK' },
                        ...(taskListFrom && taskListTo
                          ? [
                              { key: 'from', value: taskListFrom },
                              { key: 'to', value: taskListTo },
                            ]
                          : []),
                        ...(from_created && to_created
                          ? [
                              { key: 'from_created', value: from_created },
                              { key: 'to_created', value: to_created },
                            ]
                          : []),
                      ],
                    },
                    getRowClassName: (row: any) => {
                      const isNotCompleted = row.original?.status?.toUpperCase() !== 'COMPLETED';
                      if (isNotCompleted) {
                        return 'bg-ucass-active-bg/50 hover:bg-ucass-active-bg/50 transition-colors';
                      }
                      return 'hover:bg-slate-50/80 transition-colors';
                    },
                  }}
                />
              </div>
              {taskViewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
                  {gridData?.map((schedule: any) => {
                    const itemCategory = String(schedule?.category || '-')?.toUpperCase();
                    const isEventItem = itemCategory === 'EVENT';
                    return (
                      <div
                        key={schedule._id}
                        // type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setDetailsModal(transformEventTaskToSchedule(schedule));
                        }}
                        className={`cursor-pointer rounded-xl border border-slate-200  p-4 text-left hover:border-cyan-300 hover:shadow-sm transition ${schedule?.category === 'TASK' && schedule?.status?.toUpperCase() !== 'COMPLETED' ? 'bg-ucass-active-bg/50 hover:bg-ucass-active-bg/5' : ''}`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
                            {schedule.name || ''}
                          </h3>

                          <div className="flex align-center gap-4">
                            {schedule.details?.contactPhone && (
                              <CustomTooltip text="Make Call">
                                <div
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (schedule?.status === 'COMPLETED' || iamOnCall) {
                                      return;
                                    }

                                    if (schedule.details?.contactPhone) {
                                      makeCall(schedule.details.contactPhone, {
                                        extraHeaders: [
                                          `X-ContactName: ${schedule.details.contactName || ' '}`,
                                        ],
                                      });
                                    } else {
                                      handleAlert({
                                        text: 'Phone number not available',
                                        type: 'error',
                                      });
                                    }
                                  }}
                                >
                                  <Phone
                                    className={
                                      schedule?.status === 'COMPLETED' || iamOnCall
                                        ? 'w-4 h-4 text-emerald-600 shrink-0 opacity-30'
                                        : 'w-4 h-4 text-emerald-600 shrink-0 '
                                    }
                                  />
                                </div>
                              </CustomTooltip>
                            )}

                            <CustomTooltip
                              text={
                                schedule.status === 'COMPLETED'
                                  ? 'Mark as Uncompleted'
                                  : 'Mark as Completed'
                              }
                            >
                              <div
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  mutateUpdateStatus({
                                    eventTaskId: schedule._id,
                                    status:
                                      schedule.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED',
                                  });
                                }}
                              >
                                {schedule.status === 'COMPLETED' ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-slate-400 hover:text-emerald-600 transition-colors shrink-0" />
                                )}
                              </div>
                            </CustomTooltip>

                            {/* <DropdownMenuItem
                      
                      >
                        {schedule.status === 'COMPLETED' ? (
                          <>
                            <Circle className="mr-2 h-4 w-4" />
                            <span>Mark as Uncompleted</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            <span>Mark as Completed</span>
                          </>
                        )}
                      </DropdownMenuItem> */}

                            {isEventItem ? (
                              <CalendarClock className="w-4 h-4 text-sky-600 shrink-0" />
                            ) : (
                              <CustomTooltip text="Open Details">
                                <div
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleTodayTaskClick(schedule);
                                  }}
                                >
                                  <ListTodo className="w-4 h-4 text-emerald-600 shrink-0" />
                                </div>
                              </CustomTooltip>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2 text-xs text-slate-600">
                          <div>
                            <span className="font-medium text-slate-800">Scheduled: </span>
                            {getLocalScheduleMoment(schedule, 'start')?.format(
                              'DD MMM YYYY hh:mm A',
                            ) || '-'}
                            {getScheduleTimezone(schedule)
                              ? ` (${getScheduleTimezone(schedule)})`
                              : ''}
                          </div>

                          <div>
                            <span className="font-medium text-slate-800">Created: </span>
                            {moment(schedule?.createdAt).format('DD MMM YYYY')}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                              isEventItem
                                ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {itemCategory}
                          </span>
                          {/* <span className="text-[11px] font-medium text-slate-500">
                            Open details
                          </span> */}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {detailsModal && (
          <div
            className="fixed inset-0 z-[1200] bg-black/30 grid place-items-center p-4"
            onClick={() => setDetailsModal(null)}
          >
            <div
              className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden p-4 space-y-3"
              // className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl p-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-base font-semibold text-slate-900">
                  {detailsModal?.title || detailsModal?.name}
                </h4>
                <button
                  type="button"
                  onClick={() => setDetailsModal(null)}
                  className="cursor-pointer rounded-md p-1 hover:bg-slate-100"
                  aria-label="Close details popup"
                >
                  <X className="w-4 h-4 text-slate-600 shrink-0" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-700">
                <CalendarClock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  {detailsStartDate
                    ? moment(detailsStartDate).format('YYYY/MM/DD HH:mm')
                    : getLocalScheduleMoment(detailsModal, 'start')?.format('YYYY/MM/DD HH:mm') ||
                      '-'}
                  {isEvent && detailsEndDate
                    ? ` - ${moment(detailsEndDate).format('YYYY/MM/DD HH:mm')}`
                    : ''}
                  {detailsTimezone ? ` (${detailsTimezone})` : ''}
                  {detailsStartInUserTimezone
                    ? ` (Your time: ${detailsStartInUserTimezone}${
                        isEvent && detailsEndInUserTimezone ? ` - ${detailsEndInUserTimezone}` : ''
                      } ${loggedInUserTimezone})`
                    : ''}
                </span>
              </div>

              {/* {validAttendees?.length > 0 && (
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" />
                  <div className="flex flex-wrap gap-1 text-xs">
                    {validAttendees.map((email: string, idx: number) => (
                      <span key={`${email}-${idx}`} className="bg-slate-100 px-2 py-1 rounded">
                        {email}
                      </span>
                    ))}
                  </div>
                </div>
              )} */}

              {detailsModal?.raw?.assignTo?.length ? (
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 mt-1 text-slate-500 shrink-0" />

                  <div className="flex flex-wrap gap-2">
                    {detailsModal.raw.assignTo.map((item: any, idx: number) => (
                      <div
                        key={`${item?.userId}-${idx}`}
                        className="bg-slate-100 px-3 py-2 rounded-lg text-xs flex flex-col"
                      >
                        <span className="font-medium text-slate-800">{item?.name || 'N/A'}</span>
                        <span className="text-slate-500 text-[11px]">{item?.email || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {detailsModal?.assignTo?.length ? (
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 mt-1 text-slate-500 shrink-0" />

                  <div className="flex flex-wrap gap-2">
                    {detailsModal.assignTo.map((item: any, idx: number) => (
                      <div
                        key={`${item?.userId}-${idx}`}
                        className="bg-slate-100 px-3 py-2 rounded-lg text-xs flex flex-col"
                      >
                        <span className="font-medium text-slate-800">{item?.name || 'N/A'}</span>
                        <span className="text-slate-500 text-[11px]">{item?.email || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-500 shrink-0" />
                <span
                  className={`text-[11px] px-2 py-1 rounded font-semibold ${isEvent ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}
                >
                  {detailsCategory || detailsModal?.category || '-'}
                </span>
              </div>

              {isEvent && detailsModal?.raw?.referenceId && !isExpired && (
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to={`/video-meet?meetCode=${detailsModal?.raw?.referenceId}`}
                    target="_blank"
                  >
                    <button className="cursor-pointer inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50">
                      <Video className="w-3.5 h-3.5 shrink-0" />
                      Join Meet
                    </button>
                  </Link>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="cursor-pointer inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium hover:bg-slate-100"
                  >
                    <Clipboard className="w-3.5 h-3.5 shrink-0" />
                    {copiedLink ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {detailsModal?.category === 'EVENT' && detailsModal?.referenceId && (
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/video-meet?meetCode=${detailsModal?.referenceId}`} target="_blank">
                    <button className="cursor-pointer inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50">
                      <Video className="w-3.5 h-3.5 shrink-0" />
                      Join Meet
                    </button>
                  </Link>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="cursor-pointer inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium hover:bg-slate-100"
                  >
                    <Clipboard className="w-3.5 h-3.5 shrink-0" />
                    {copiedLink ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {detailsModal?.raw?.reminderMode?.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Bell className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>
                    {Array.isArray(detailsModal?.raw?.reminderMode)
                      ? detailsModal?.raw?.reminderMode.join(', ')
                      : detailsModal?.raw?.reminderMode}
                  </span>
                </div>
              )}

              {detailsModal?.raw?.description || detailsModal?.description ? (
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Description</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 min-h-[80px] max-h-[180px] overflow-y-auto custom-scrollbar flex items-start w-full">
                    <p className="text-slate-600 text-sm leading-relaxed w-full text-left break-words whitespace-pre-wrap">
                      {detailsModal?.raw?.description || detailsModal?.description}
                    </p>
                  </div>
                </div>
              ) : null}

              {(detailsModal?.raw?.createdById === userId ||
                detailsModal?.createdById === userId) && (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={isExpired || isOngoing}
                    onClick={() => {
                      setDetailsModal(null);
                      setModal(true);
                      setEvent({ schedule: detailsModal });
                    }}
                    className="cursor-pointer inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Pencil className="w-4 h-4 shrink-0" />
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmState({ open: true, schedule: detailsModal });
                      setDetailsModal(null);
                    }}
                    className="cursor-pointer inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* {detailsDescriptionModal && (
          <div
            className="fixed inset-0 z-[1200] bg-black/40 grid place-items-center p-4 backdrop-blur-sm"
            onClick={() => setDetailsDescriptionModal(null)}
          >
            <div
              className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4">
                <h4 className="text-xl font-bold text-slate-800">
                  {detailsDescriptionModal?.name || ''}
                </h4>
                <button
                  type="button"
                  onClick={() => setDetailsDescriptionModal(null)}
                  className="cursor-pointer rounded-full p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-5 h-5 shrink-0" />
                </button>
              </div>

              <div className="h-px bg-slate-100 mx-6" />

              <div className="p-6">
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs tracking-wider mb-4 uppercase">
                  <FileText className="w-4 h-4" />
                  Description
                </div>

                <div
                  className={`rounded-2xl bg-slate-50 border border-slate-100 p-8 min-h-[160px] flex ${detailsDescriptionModal?.description ? 'items-start' : 'items-center justify-center'}`}
                >
                  {detailsDescriptionModal?.description ? (
                    <p className="text-slate-600 text-sm leading-relaxed w-full text-left">
                      {detailsDescriptionModal?.description}
                    </p>
                  ) : (
                    <p className="text-slate-400 text-sm italic">No description available</p>
                  )}
                </div>

                <div className="flex justify-end pt-6">
                  <button
                    onClick={() => setDetailsDescriptionModal(null)}
                    className="px-8 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )} */}

        <Dialog modal open={modal} onOpenChange={toggle}>
          {/* `mcm-glassform` in place of `bg-white`: the dialog sits over the
              page's warm gradient, so a frosted panel lets that carry through
              rather than dropping a flat sheet on top of it. */}
          <DialogContent className="mcm-glassform max-h-[90vh] max-w-3xl w-full flex flex-col overflow-hidden p-6">
            <DialogTitle className="shrink-0">Schedule</DialogTitle>
            <ScheduleModal
              {...{
                toggle: toggle,
                event: event,
              }}
            />
          </DialogContent>
        </Dialog>

        <AssignMembersStandaloneModal
          formInstance={assignFormInstance}
          modalState={assignMemberState.open}
          setModalState={(open) => setAssignMemberState((prev) => ({ ...prev, open }))}
          handleSendInvite={(members: any) => {
            mutateAssignMembers({
              eventTaskId: assignMemberState.schedule?._id,
              members: members || selectedMembers,
            });
          }}
          type={SCHEDULEMEETING.task}
          isPending={isAssigningMembers}
        />

        <AlertConfirm
          open={deleteConfirmState.open}
          setOpen={(open) => setDeleteConfirmState((prev) => ({ ...prev, open }))}
          apiLoading={isDeleting || isMeetingDeleting}
          onConfirm={async () => {
            await onBeforeDeleteSchedule({ schedule: deleteConfirmState.schedule });
            setDeleteConfirmState({ open: false, schedule: null });
            if (detailsModal) setDetailsModal(null);
          }}
        />
      </div>
    </div>
  );
};

export default CalendarPage;
