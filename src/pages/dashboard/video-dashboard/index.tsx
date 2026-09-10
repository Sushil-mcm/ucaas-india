import { Icon } from '@/assets/icons/icon';
import Loader from '@/components/custom/loader';
import NotFound from '@/assets/images/not-found-img.svg';
import {
  canDeleteMeeting,
  canEditMeeting,
  cn,
  formatMeetingDate,
  formatTime,
  getAbbreviationByTimeZone,
  handleAlert,
  initialCallGraphData,
  isDateFuture,
} from '@/lib/utils';
import {
  createMeeting,
  meetingDelete,
  meetingList,
  sendInvites,
  videoDashboardStats,
} from '@/services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { WelcomeModalPopup } from '../welcome-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ScheduleMeeting from '@/pages/video-meetings/schedule-meeting';
import moment from 'moment';
import { CallGraphData } from '../constant';
import JoinMeetingModal from '@/pages/video-meetings/upcoming-meetings/join-meeting-modal';
import MeetingMembersModal from '@/pages/video-meetings/meeting-members-modal';
import AlertConfirm from '@/components/custom/alert-confirm';
import { useUser } from '@/hooks/use-user';
import MeetingInfo from '@/pages/video-meetings/meeting-info-modal';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { LucideUserRoundCheck, RefreshCw, Search, UserPlus, X } from 'lucide-react';
import { getMeetingStatus } from '@/pages/video-meetings/schedule-meeting/constant';
import InviteMembersModal from '@/pages/video-meetings/send-invites/invite-members';
import InviteOthersModal from '@/pages/video-meetings/send-invites/invite-others';
import { useForm } from 'react-hook-form';
import { useCompanyFeatures } from '@/hooks/rbac';
import { Link } from 'react-router-dom';
import './video-theme.css';

// Helper function to check if current time is within meeting time range.
// `nowMs` is threaded through so the whole board judges "is this live?" against
// one clock reading, and so the ticking clock below can re-evaluate it without
// waiting for a refetch — a meeting used to flip to Ongoing only when something
// else happened to re-render the page.
export const isMeetingActive = (startTime: string, endTime: string, nowMs: number = Date.now()) => {
  const now = moment(nowMs);
  const start = moment(startTime);
  const end = moment(endTime);
  return now.isBetween(start, end, null, '[]'); // inclusive of start and end
};

/**
 * The console has a light/dark switch (`theme-toggle.tsx` toggles `.dark` on
 * `<html>`), but Chart.js paints axes, grid lines, legend text and tooltips from
 * JS values, not CSS — so a chart written once in light greys stayed
 * light-grey-on-near-black after the switch. This watches the class and hands
 * the chart a flag it can rebuild from.
 */
const useIsDarkTheme = () => {
  const [isDark, setIsDark] = useState(() =>
    typeof document === 'undefined' ? false : document.documentElement.classList.contains('dark'),
  );
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(root.classList.contains('dark')));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
};

/* One warm-console palette for the bars, in place of the three unrelated hues
   (cyan / bottle green / tomato) the default graph data ships with, which
   belonged to no theme on this page. Order is stable so a series keeps its
   colour between renders. */
const SERIES_LIGHT = ['#f2994a', '#0d9488', '#7c5cd6'];
const SERIES_DARK = ['#ffab5e', '#2dd4bf', '#a97fff'];

/** Shared empty/error block, so a failed request never borrows the wording of
 *  a successful-but-empty one. */
const PanelMessage = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="mx-auto flex h-full w-full flex-col items-center justify-center gap-1.5 px-4 py-5">
    <img src={NotFound} alt="" aria-hidden className="w-20 min-w-20 opacity-90" />
    <p className="text-center text-sm font-semibold text-mcm-ink">{title}</p>
    <p className="max-w-[18rem] text-center text-xs text-[#64748b] dark:text-mcm-ink-3">{description}</p>
    {action}
  </div>
);

const PillButton = ({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  // Same fill/text pairing as the "Meeting volume" date badge below, measured
  // there at 3.27:1 — under the 4.5:1 small text needs. `#a8460f` locally,
  // not a change to the shared `text-mcm-accent-ink` token.
  <button
    type="button"
    data-slot="button"
    onClick={onClick}
    className="cursor-pointer mt-1 inline-flex items-center gap-1.5 rounded-full border border-mcm-accent-edge bg-mcm-accent-wash px-3 py-1.5 text-xs font-semibold text-[#a8460f] dark:text-mcm-accent-ink transition-colors hover:bg-mcm-accent hover:text-white"
  >
    {icon}
    {children}
  </button>
);

const BarChart = ({
  data = initialCallGraphData,
  isPendingStatsData = false,
  isError = false,
  onRetry,
  isDark = false,
  onSchedule,
  canSchedule = false,
}: {
  data: CallGraphData;
  isPendingStatsData: boolean;
  isError?: boolean;
  onRetry?: () => void;
  isDark?: boolean;
  onSchedule?: () => void;
  canSchedule?: boolean;
}) => {
  const hasData = Boolean(data?.datasets?.length) && Boolean(data?.labels?.length);

  const series = isDark ? SERIES_DARK : SERIES_LIGHT;
  const ink = isDark ? '#93a1ba' : '#6b7891';
  const inkStrong = isDark ? '#eef2f9' : '#0d1526';
  const grid = isDark ? 'rgba(38, 49, 74, 0.85)' : 'rgba(223, 229, 240, 0.9)';
  const surface = isDark ? '#161f31' : '#ffffff';

  const themedData = useMemo(
    () => ({
      ...data,
      datasets: (data?.datasets || []).map((dataset: any, index: number) => ({
        ...dataset,
        backgroundColor: series[index % series.length],
        hoverBackgroundColor: series[index % series.length],
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 34,
      })),
    }),
    [data, series],
  );

  if (isPendingStatsData) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader variant="blue" />
      </div>
    );
  }

  /* A failed request used to render as "No meeting activity yet" — the board
     claimed there were no meetings when it had simply not been told. */
  if (isError) {
    return (
      <PanelMessage
        title="Couldn't load meeting volume"
        description="The summary request failed. Nothing here says anything about your actual meetings."
        action={
          onRetry ? (
            <PillButton onClick={onRetry} icon={<RefreshCw className="h-3.5 w-3.5" />}>
              Try again
            </PillButton>
          ) : undefined
        }
      />
    );
  }

  if (!hasData) {
    return (
      <PanelMessage
        title="No meeting activity yet"
        description="Volume appears here once meetings are hosted in the selected range."
        action={
          canSchedule && onSchedule ? (
            <PillButton onClick={onSchedule} icon={<Icon name="CalendarAdd" className="h-3.5 w-3.5" />}>
              Schedule a meeting
            </PillButton>
          ) : undefined
        }
      />
    );
  }

  return (
    <Bar
      className="graph"
      /* Chart.js reads these colours once at construction, so the instance has
         to be rebuilt — not just re-rendered — when the theme flips. */
      key={isDark ? 'dark' : 'light'}
      options={{
        maintainAspectRatio: false,
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            align: 'start',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              boxHeight: 8,
              padding: 16,
              color: ink,
              font: { size: 11, weight: 500 },
            },
          },
          tooltip: {
            backgroundColor: surface,
            titleColor: inkStrong,
            bodyColor: ink,
            borderColor: grid,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 10,
            usePointStyle: true,
          },
          title: { display: false },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: ink, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: grid },
            border: { display: false },
            ticks: { stepSize: 1, color: ink, font: { size: 11 }, precision: 0 },
          },
        },
        datasets: {
          bar: { barPercentage: 0.6, categoryPercentage: 0.7 },
        },
      }}
      data={themedData}
    />
  );
};

type MeetingListType = 'upcoming_owned' | 'invited';

/**
 * A headline figure. Each one is counted from a list this board actually
 * fetched, so a tile can never disagree with the rows underneath it.
 */
const StatTile = ({
  label,
  value,
  hint,
  tone = 'default',
  pulse = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'live' | 'accent';
  pulse?: boolean;
}) => {
  const valueTone =
    tone === 'live' ? 'text-mcm-live' : tone === 'accent' ? 'text-mcm-accent-ink' : 'text-mcm-ink';
  return (
    <div className="flex min-w-0 flex-col justify-center gap-0.5 rounded-2xl border border-mcm-line bg-mcm-surface px-3.5 py-3 shadow-mcm-sm">
      <div className="flex items-center gap-1.5">
        {pulse && (
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mcm-live opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mcm-live" />
          </span>
        )}
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-[#64748b] dark:text-mcm-ink-3">
          {label}
        </p>
      </div>
      <p className={cn('truncate text-xl font-semibold leading-tight', valueTone)}>{value}</p>
      {/* Not `text-mcm-ink-4` here: that token is the app's icon/placeholder
          grey, too light (2.64:1) for the actual sentence this line reads
          ("Nothing in progress") rather than a decorative glyph. Locally
          scoped so the many icon/placeholder uses of `text-mcm-ink-4`
          elsewhere on this same page are untouched. */}
      <p className="truncate text-[11px] text-[#475569] dark:text-mcm-ink-2" title={hint || ''}>
        {hint || ' '}
      </p>
    </div>
  );
};

/* Filtering happens on the board rather than the server: these lists are a
   day's worth of meetings, and a round trip per keystroke would be slower than
   the filter it replaces. */
const matchesSearch = (meeting: any, term: string) => {
  if (!term) return true;
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return [meeting?.name, meeting?.hostName, meeting?.meetingId]
    .filter(Boolean)
    .some((field: string) => String(field).toLowerCase().includes(needle));
};

const VideoDashboard = ({
  selectedRange,
}: { selectedRange?: { from: string; to: string } } = {}) => {
  const { user } = useUser();
  const isDark = useIsDarkTheme();

  /* Performance already renders a date filter above this board, and the panel
     underneath claimed to show "the selected organization date" — but the board
     built its own `new Date()` and ignored that filter completely, so changing
     it changed nothing here. The range now drives every dated query; mounted on
     its own the board still falls back to today. */
  const range = useMemo(() => {
    const today = moment().format('YYYY-MM-DD');
    return { from: selectedRange?.from || today, to: selectedRange?.to || today };
  }, [selectedRange?.from, selectedRange?.to]);

  const rangeLabel = useMemo(() => {
    const from = moment(range.from, 'YYYY-MM-DD');
    const to = moment(range.to, 'YYYY-MM-DD');
    if (!from.isValid() || !to.isValid()) return '';
    return from.isSame(to, 'day')
      ? from.format('ddd, DD MMM')
      : `${from.format('DD MMM')} – ${to.format('DD MMM')}`;
  }, [range.from, range.to]);

  /* Ongoing/upcoming state is derived from the clock, so it goes stale on a
     board nobody touches. A 30s tick keeps the countdown and the status pills
     honest without touching the API. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const [search, setSearch] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [drawerState, setDrawerState] = useState<any>(false);
  const queryClient: any = useQueryClient();
  const [modalState, setModalState] = useState({
    joinMeeting: false,
    isMeetingDelete: false,
    meetingInvites: false,
    meetingInfo: false,
    meetingAttendee: false,
    inviteMembers: false,
    inviteOthers: false,
  });
  const formInstance = useForm<any>({
    defaultValues: {
      inviteOthers: [],
      members: [],
      meeting_id: '',
    },
  });
  const { watch, setValue } = formInstance;
  const { features } = useCompanyFeatures();
  const videAccess = features?.plan_features?.video?.action || {};

  const statsQuery = useQuery({
    queryKey: ['videoDashboardStats', range.from, range.to],
    /* `queryFn: videoDashboardStats` handed React Query's own query context
       (queryKey, signal, meta) straight to axios as the POST body. This sends
       the filter the board actually means. */
    queryFn: () => videoDashboardStats({ filter_date: { from: range.from, to: range.to } }),
    select: (data) => data?.data?.data?.result?.data,
  });
  const dashboardStatsData = statsQuery.data;

  const graphData =
    dashboardStatsData?.graph_data && Object.keys(dashboardStatsData?.graph_data).length > 0
      ? dashboardStatsData?.graph_data
      : {
          datasets: [],
          labels: [],
        };

  const upcomingQuery = useQuery({
    queryKey: ['upcomingList', 'upcoming_owned', range.from, range.to],
    queryFn: () =>
      meetingList({
        listType: 'upcoming_owned',
        filter_date: { from: range.from, to: range.to },
      }),
    select: (data) => data?.data?.data?.result?.rows,
  });
  const invitedQuery = useQuery({
    queryKey: ['upcomingList', 'invited', range.from, range.to],
    queryFn: () =>
      meetingList({
        listType: 'invited',
        filter_date: { from: range.from, to: range.to },
      }),
    select: (data) => data?.data?.data?.result?.rows,
  });

  /* The server's own `ongoing` list — the one the Ongoing Meetings page shows.
     Checked against real data it is a *candidate* set, not a liveness answer:
     it came back holding meetings that start days from now, so its length is
     not a count of what is running. It is used here only to widen the pool of
     meetings whose own start/end times then get checked (see `liveMeetings`),
     which is why it is not date-filtered, and it polls because liveness is the
     one thing on this board that changes without anybody touching it. */
  const ongoingQuery = useQuery({
    queryKey: ['ongoingMeetingList', 'video-dashboard'],
    queryFn: () => meetingList({ listType: 'ongoing', page: 1, limit: 25 }),
    select: (data) => data?.data?.data?.result?.rows,
    refetchInterval: 30_000,
  });

  const upcomingMeetings = upcomingQuery.data;
  const invitedMeetings = invitedQuery.data;
  const ongoingMeetings = ongoingQuery.data;

  /* One control refreshes the whole board. The app turns
     `refetchOnWindowFocus` off globally, so without this the only way to see
     a meeting somebody just invited you to was a full page reload. */
  const refreshAll = () => {
    statsQuery.refetch();
    upcomingQuery.refetch();
    invitedQuery.refetch();
    ongoingQuery.refetch();
  };
  const isRefreshing =
    statsQuery.isFetching ||
    upcomingQuery.isFetching ||
    invitedQuery.isFetching ||
    ongoingQuery.isFetching;
  const lastUpdatedAt = Math.max(
    statsQuery.dataUpdatedAt,
    upcomingQuery.dataUpdatedAt,
    invitedQuery.dataUpdatedAt,
    ongoingQuery.dataUpdatedAt,
  );

  const { mutate: mutateMeetingDelete, isPending } = useMutation({
    mutationFn: meetingDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingList'] });
      queryClient.invalidateQueries({ queryKey: ['ongoingMeetingList'] });
      handleAlert({ text: 'Meeting deleted successfully', type: 'success' });
      setModalState((prev) => ({ ...prev, isMeetingDelete: false }));
      setSelectedMeeting(null);
    },
  });
  const { mutate: mutateInstantMeeting, isPending: isPendingInstantMeeting } = useMutation({
    mutationFn: createMeeting,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['videoDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['ongoingMeetingList'] });
      const meetingData = data?.data?.data?.result;
      const meetingId = meetingData?.meetingId;
      window.open(`/video-meet?meetCode=${meetingId}`);
    },
  });
  const { mutate: mutateSendInvite, isPending: isPendingInvites } = useMutation({
    mutationFn: sendInvites,
    onSuccess: () => {
      setModalState((prev) => ({ ...prev, inviteMembers: false, inviteOthers: false }));
      handleAlert({ text: 'Invite sent successfully', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['upcomingList'] });
      setValue('inviteOthers', []);
      setValue('members', []);
    },
  });
  useEffect(() => {
    if (selectedMeeting?.members && Array.isArray(selectedMeeting?.members)) {
      setValue('members', selectedMeeting?.members, { shouldValidate: true });
    } else {
      setValue('members', []);
    }
  }, [selectedMeeting?.members]);

  const InstantMeeting = () => {
    const startedAt = new Date();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const normalizedTz = tz === 'Asia/Calcutta' ? 'Asia/Kolkata' : tz;
    const payload = {
      name: '',
      startTime: moment(startedAt).format('YYYY-MM-DD HH:mm:ss'),
      allowHost: 'Y',
      timezone: normalizedTz,
      meetingType: 'INSTANT',
      mode: 'VIDEO',
      duration: 0,
    };
    mutateInstantMeeting(payload);
  };

  /* Handing someone the joining link is the most-repeated task on this board
     and used to mean opening the info modal to find it. */
  const copyMeetingLink = async (meetingId?: string) => {
    if (!meetingId) return;
    const link = `${window.location.origin}/video-meet?meetCode=${meetingId}`;
    try {
      await navigator.clipboard.writeText(link);
      handleAlert({ text: 'Meeting link copied', type: 'success' });
    } catch {
      handleAlert({ text: 'Could not copy the link', type: 'error' });
    }
  };

  const handleSendInvite = async () => {
    const isValid = await formInstance.trigger(['members', 'inviteOthers']);
    if (!isValid) return;
    const members = watch('members');
    const invitedOthers = watch('inviteOthers');
    const existingMembers =
      selectedMeeting?.members && Array.isArray(selectedMeeting?.members)
        ? selectedMeeting?.members?.map((m: any) => m?.user_uuid || m?.userId)
        : [];

    const formattedMeetingInfoData = members?.map((obj: any) => {
      const id = obj?.user_uuid || obj?.userId || '';
      const isNewMember = !existingMembers.includes(id);

      const cleanedObj = {
        ...obj,
        user_uuid: id,
        invitation_sent: isNewMember ? false : true,
      };

      delete cleanedObj.source;
      delete cleanedObj.joinStatus;
      delete cleanedObj._id;
      delete cleanedObj.userId;

      return cleanedObj;
    });
    const allInviteOthers = [...formattedMeetingInfoData, ...invitedOthers];
    const payload = {
      meetingId: selectedMeeting?.meetingId,
      members: invitedOthers?.length > 0 ? allInviteOthers : formattedMeetingInfoData,
    };
    mutateSendInvite(payload);
  };

  const meetingActionTiles = [
    videAccess?.create && {
      id: 'start-instant-meeting',
      title: isPendingInstantMeeting ? 'Starting…' : 'Start instant meeting',
      description: 'Open a room right now',
      icon: 'VideoCameraLine' as const,
      onClick: InstantMeeting,
      disabled: isPendingInstantMeeting,
      primary: true,
    },
    {
      id: 'join-meeting',
      title: 'Join a meeting',
      description: 'Enter a code or link',
      icon: 'LinkLine' as const,
      onClick: () => setModalState((prev) => ({ ...prev, joinMeeting: true })),
      disabled: false,
      primary: false,
    },
    videAccess?.create && {
      id: 'schedule-meeting',
      title: 'Schedule meeting',
      description: 'Plan one for later',
      icon: 'CalendarAdd' as const,
      onClick: () => setDrawerState(true),
      disabled: false,
      primary: false,
    },
    {
      id: 'view-recordings',
      title: 'View recordings',
      description: 'Browse cloud recordings',
      icon: 'VideoRecordingIcon' as const,
      onClick: () => window.open('/video/recordings/all', '_self'),
      disabled: false,
      primary: false,
    },
  ].filter(Boolean) as Array<{
    id: string;
    title: string;
    description: string;
    icon: 'VideoCameraLine' | 'LinkLine' | 'CalendarAdd' | 'VideoRecordingIcon';
    onClick: () => void;
    disabled: boolean;
    primary: boolean;
  }>;

  const filteredUpcoming = useMemo(
    () => (upcomingMeetings || []).filter((meeting: any) => matchesSearch(meeting, search)),
    [upcomingMeetings, search],
  );
  const filteredInvited = useMemo(
    () => (invitedMeetings || []).filter((meeting: any) => matchesSearch(meeting, search)),
    [invitedMeetings, search],
  );
  /* A meeting is called live only when its own start/end bracket the current
     clock. Trusting the `ongoing` endpoint's length instead put three meetings
     dated days ahead under a "Happening now" heading, with a Join button and a
     "Live now: 3" tile above it — every one of them false. The three lists are
     pooled first so a running meeting is caught wherever it is listed. */
  const liveMeetings = useMemo(() => {
    const byId = new Map<string, any>();
    [...(ongoingMeetings || []), ...(upcomingMeetings || []), ...(invitedMeetings || [])].forEach(
      (meeting: any) => {
        if (meeting?.meetingId && !byId.has(meeting.meetingId)) byId.set(meeting.meetingId, meeting);
      },
    );
    return [...byId.values()].filter((meeting: any) =>
      isMeetingActive(meeting?.startTimeLocal, meeting?.endTimeLocal, now),
    );
  }, [ongoingMeetings, upcomingMeetings, invitedMeetings, now]);

  const filteredOngoing = useMemo(
    () => liveMeetings.filter((meeting: any) => matchesSearch(meeting, search)),
    [liveMeetings, search],
  );

  /* The next meeting can come from either list, and a meeting can legitimately
     sit in both (you host it, you are also a member), so the union is
     de-duplicated on meetingId first. */
  const nextMeeting = useMemo(() => {
    const byId = new Map<string, any>();
    [...(upcomingMeetings || []), ...(invitedMeetings || [])].forEach((meeting: any) => {
      if (meeting?.meetingId && !byId.has(meeting.meetingId)) byId.set(meeting.meetingId, meeting);
    });
    return [...byId.values()]
      .filter((meeting: any) => moment(meeting?.startTimeLocal).valueOf() > now)
      .sort(
        (a: any, b: any) =>
          moment(a?.startTimeLocal).valueOf() - moment(b?.startTimeLocal).valueOf(),
      )[0];
  }, [upcomingMeetings, invitedMeetings, now]);

  const liveCount = liveMeetings.length;
  const isLoadingLists = upcomingQuery.isPending || invitedQuery.isPending;
  const EMPTY = '—';
  const statTiles = [
    {
      label: 'Live now',
      value: ongoingQuery.isPending || isLoadingLists ? EMPTY : liveCount,
      hint: liveCount > 0 ? 'In progress right now' : 'Nothing in progress',
      tone: (liveCount > 0 ? 'live' : 'default') as 'live' | 'default',
      pulse: liveCount > 0,
    },
    {
      label: 'Hosted by you',
      value: isLoadingLists ? EMPTY : upcomingQuery.isError ? EMPTY : upcomingMeetings?.length || 0,
      /* Deliberately not labelled with the toolbar's date range: the server
         returns upcoming meetings regardless of `filter_date` (asking for one
         day still returns meetings days out), so naming a range here would
         caption the number with a filter it was not subject to. */
      hint: 'Meetings you are hosting',
      tone: 'default' as const,
      pulse: false,
    },
    {
      label: 'Invitations',
      value: isLoadingLists ? EMPTY : invitedQuery.isError ? EMPTY : invitedMeetings?.length || 0,
      hint: 'Meetings you were invited to',
      tone: 'default' as const,
      pulse: false,
    },
    {
      label: 'Next up',
      value: isLoadingLists
        ? EMPTY
        : nextMeeting
          ? moment(nextMeeting?.startTimeLocal).from(moment(now))
          : EMPTY,
      hint: nextMeeting
        ? `${nextMeeting?.name || 'Meeting'} · ${formatTime(nextMeeting?.startTimeLocal)}`
        : 'Nothing scheduled ahead',
      tone: (nextMeeting ? 'accent' : 'default') as 'accent' | 'default',
      pulse: false,
    },
  ];

  const renderMeetingList = (meetings: any[] = [], listType: MeetingListType) =>
    meetings.map((meeting: any) => {
      const isFutureTime = isDateFuture(meeting?.startTimeLocal);
      const formattedDate = formatMeetingDate(meeting?.startTimeLocal) || '';
      const canEdit = canEditMeeting(meeting?.startTimeLocal);
      const isActive = isMeetingActive(meeting?.startTimeLocal, meeting?.endTimeLocal, now);
      const { label, classes } = getMeetingStatus(isActive, isFutureTime);
      const inviteeTotal = Array.isArray(meeting?.members) ? meeting.members.length : 0;
      const attendeeTotal = Array.isArray(meeting?.members)
        ? meeting.members.filter(
            (member: { joinStatus: string }) => member?.joinStatus?.toUpperCase() === 'YES',
          ).length
        : 0;

      return (
        <div
          key={`${listType}-${meeting?.meetingId}`}
          className={cn(
            'group flex items-center justify-between gap-2 rounded-2xl border px-2.5 py-2 transition-colors',
            isActive
              ? 'border-mcm-live/45 bg-mcm-live-wash'
              : 'border-mcm-line bg-mcm-surface hover:border-mcm-accent-edge hover:bg-mcm-accent-wash/45',
          )}
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <div
              className={cn(
                'flex min-w-[46px] flex-col items-center rounded-xl px-1.5 py-1.5',
                isActive ? 'bg-mcm-live/15 text-mcm-live' : 'bg-[#f5e6d3] dark:bg-[rgba(251,146,60,0.14)] text-mcm-ink',
              )}
            >
              <p className="text-sm font-semibold leading-none">{formattedDate?.day || ''}</p>
              {/* `#64748b` measured 4.1:1 here — just under the 4.5:1 small
                  text needs against this chip's own fill. One step darker. */}
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[#475569] dark:text-mcm-ink-2">
                {formattedDate?.month || ''}
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <h4
                  className="max-w-[170px] truncate text-sm font-semibold text-mcm-ink"
                  title={meeting?.name || 'Meeting Name'}
                >
                  {meeting?.name || 'Meeting Name'}
                </h4>
                {/* The status pill used to be on invited meetings only, so your
                    own list gave no clue which row was already running. */}
                <span
                  className={cn(
                    'shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                    classes,
                  )}
                >
                  {label}
                </span>
                {listType === 'invited' && (
                  <CustomTooltip text={`Invited by: ${meeting?.hostName || 'Person'}`} side="top">
                    <UserPlus className="h-3.5 w-3.5 shrink-0 text-[#64748b] dark:text-mcm-ink-3" />
                  </CustomTooltip>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="flex items-center gap-1 text-xs text-[#64748b] dark:text-mcm-ink-3">
                  <Icon name="TimerIcon" className="h-3.5 w-3.5" />
                  <span>{getAbbreviationByTimeZone(meeting?.timezone)}</span>
                  {formatTime(meeting?.startTimeLocal)} - {formatTime(meeting?.endTimeLocal) || ''}
                </p>
                {/* These counters open modals, so they are buttons now — as
                    plain divs they were unreachable by keyboard and gave no
                    disabled state when there was nothing to open. */}
                <CustomTooltip text="Invitees" side="top">
                  <button
                    type="button"
                    data-slot="button"
                    disabled={!inviteeTotal}
                    aria-label={`${inviteeTotal} invitees`}
                    className="cursor-pointer flex items-center gap-1 rounded-md px-1 text-xs text-[#64748b] dark:text-mcm-ink-3 transition-colors enabled:hover:text-mcm-accent-ink disabled:cursor-default"
                    onClick={() => {
                      if (!inviteeTotal) return;
                      setModalState((prev) => ({ ...prev, meetingInvites: true }));
                      setSelectedMeeting(meeting);
                    }}
                  >
                    <Icon name="UsersIcon" className="h-3.5 w-3.5" />
                    {inviteeTotal}
                  </button>
                </CustomTooltip>
                {(isActive || !isFutureTime) && (
                  <CustomTooltip text="Attendees" side="top">
                    <button
                      type="button"
                      data-slot="button"
                      disabled={!attendeeTotal}
                      aria-label={`${attendeeTotal} attendees joined`}
                      className="cursor-pointer flex items-center gap-1 rounded-md px-1 text-xs text-[#64748b] dark:text-mcm-ink-3 transition-colors enabled:hover:text-mcm-accent-ink disabled:cursor-default"
                      onClick={() => {
                        if (!attendeeTotal) return;
                        setModalState((prev) => ({ ...prev, meetingAttendee: true }));
                        setSelectedMeeting(meeting);
                      }}
                    >
                      <LucideUserRoundCheck className="h-3.5 w-3.5" />
                      {attendeeTotal}
                    </button>
                  </CustomTooltip>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {isActive && (
              /* The one action worth a labelled button: a meeting that is
                 running is something you join, not something you inspect. */
              <button
                type="button"
                data-slot="button"
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-mcm-live px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                onClick={() => window.open(`/video-meet?meetCode=${meeting?.meetingId}`)}
              >
                <Icon name="VideocameraAdd" className="h-4 w-4" />
                Join
              </button>
            )}
            {listType === 'upcoming_owned' && canEdit && videAccess?.invite && (
              <DropdownMenu>
                <CustomTooltip text="Invite people" side="top">
                  <DropdownMenuTrigger
                    aria-label="Invite people"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-mcm-accent-wash text-mcm-accent-ink transition-colors hover:bg-mcm-accent hover:text-white"
                  >
                    <Icon name="PlusIcon" className="h-4 w-4" />
                  </DropdownMenuTrigger>
                </CustomTooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setModalState((prev) => ({
                        ...prev,
                        inviteMembers: true,
                      }));
                      setSelectedMeeting(meeting);
                    }}
                  >
                    Invite Members
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setModalState((prev) => ({
                        ...prev,
                        inviteOthers: true,
                      }));
                      setSelectedMeeting(meeting);
                    }}
                  >
                    Invite Others
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {(isActive || isFutureTime) && listType === 'invited' && (
              <CustomTooltip text="Meeting details" side="top">
                <button
                  type="button"
                  data-slot="button"
                  aria-label="Meeting details"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#f5e6d3] dark:bg-[rgba(251,146,60,0.14)] text-[#64748b] dark:text-mcm-ink-3 transition-colors hover:bg-mcm-accent-wash hover:text-mcm-accent-ink"
                  onClick={() => {
                    setModalState((prev) => ({
                      ...prev,
                      meetingInfo: true,
                    }));
                    setSelectedMeeting(meeting);
                  }}
                >
                  <Icon name="InfoIcon" className="h-4 w-4" />
                </button>
              </CustomTooltip>
            )}
            {/* Invited rows had no overflow menu at all, so an invitee could
                not so much as copy the link from here. */}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="More actions"
                className="flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-full bg-[#f5e6d3] dark:bg-[rgba(251,146,60,0.14)] text-mcm-ink-2 transition-colors focus:outline-0 hover:bg-mcm-accent hover:text-white"
              >
                <Icon name="MenuDots" className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => copyMeetingLink(meeting?.meetingId)}>
                  Copy meeting link
                </DropdownMenuItem>
                {listType === 'upcoming_owned' &&
                  canEdit &&
                  meeting?.createdById === user?.uuid &&
                  videAccess?.edit && (
                    <DropdownMenuItem
                      onClick={() => {
                        setDrawerState(true);
                        setSelectedMeeting(meeting);
                      }}
                    >
                      Edit
                    </DropdownMenuItem>
                  )}
                {(isActive || isFutureTime) && (
                  <DropdownMenuItem
                    onClick={() => {
                      setModalState((prev) => ({
                        ...prev,
                        meetingInfo: true,
                      }));
                      setSelectedMeeting(meeting);
                    }}
                  >
                    Info
                  </DropdownMenuItem>
                )}
                {listType === 'upcoming_owned' &&
                  canDeleteMeeting(meeting?.startTimeLocal, meeting?.endTimeLocal) &&
                  meeting?.createdById === user?.uuid &&
                  videAccess?.edit && (
                    <DropdownMenuItem
                      onClick={() => {
                        setModalState((prev) => ({
                          ...prev,
                          isMeetingDelete: true,
                        }));
                        setSelectedMeeting(meeting);
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      );
    });

  const renderMeetingPanel = ({
    title,
    description,
    listType,
    meetings,
    totalCount,
    isPendingList,
    isErrorList,
    onRetry,
    viewAllTo,
  }: {
    title: string;
    description: string;
    listType: MeetingListType;
    meetings: any[];
    totalCount: number;
    isPendingList: boolean;
    isErrorList: boolean;
    onRetry: () => void;
    viewAllTo: string;
  }) => {
    const isFiltered = Boolean(search.trim());
    return (
      <div className="flex min-h-[15rem] flex-1 flex-col rounded-3xl border border-mcm-line bg-mcm-surface p-3 shadow-mcm-sm">
        <div className="mb-2.5 flex items-start justify-between gap-2 px-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-mcm-ink">{title}</h3>
              {/* The count belongs in the header: it says how much is in a
                  scrolling list without scrolling it. */}
              <span className="rounded-full bg-[#f5e6d3] dark:bg-[rgba(251,146,60,0.14)] px-1.5 py-0.5 text-[11px] font-semibold text-mcm-ink-2">
                {isPendingList || isErrorList
                  ? '·'
                  : isFiltered
                    ? `${meetings.length}/${totalCount}`
                    : totalCount}
              </span>
            </div>
            <p className="truncate text-xs text-[#64748b] dark:text-mcm-ink-3">{description}</p>
          </div>
          {/* `text-mcm-accent-ink` (#c96f1f) measured 3.64:1 for this link's
              text — under the 4.5:1 small text needs even against a plain
              white section. Locally scoped darker accent, not a change to
              the shared token. */}
          <Link
            to={viewAllTo}
            className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-[#a8460f] dark:text-mcm-accent-ink transition-colors hover:bg-mcm-accent-wash"
          >
            View all
          </Link>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto pr-1">
          {isPendingList ? (
            <div className="flex h-full items-center justify-center p-5">
              <Loader variant="blue" size="sm" />
            </div>
          ) : isErrorList ? (
            <PanelMessage
              title="Couldn't load this list"
              description="The request failed, so this panel is not showing your meetings — not showing that you have none."
              action={
                <PillButton onClick={onRetry} icon={<RefreshCw className="h-3.5 w-3.5" />}>
                  Try again
                </PillButton>
              }
            />
          ) : meetings?.length ? (
            renderMeetingList(meetings, listType)
          ) : isFiltered ? (
            <PanelMessage
              title="No matches"
              description={`Nothing in this list matches “${search.trim()}”.`}
              action={
                <PillButton onClick={() => setSearch('')} icon={<X className="h-3.5 w-3.5" />}>
                  Clear search
                </PillButton>
              }
            />
          ) : (
            <PanelMessage
              title={listType === 'invited' ? 'No meeting invitations yet' : 'Nothing scheduled yet'}
              description={
                listType === 'invited'
                  ? 'Invitations show up here as people add you.'
                  : 'Meetings you host show up here.'
              }
              action={
                listType === 'upcoming_owned' && videAccess?.create ? (
                  <PillButton
                    onClick={() => setDrawerState(true)}
                    icon={<Icon name="CalendarAdd" className="h-3.5 w-3.5" />}
                  >
                    Schedule a meeting
                  </PillButton>
                ) : undefined
              }
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="perf-video flex xxl:h-full w-full overflow-auto pb-4">
      {/* `pt-7` (was `pt-3`) so this tab's content starts on the same 28px
          line as every other Performance tab. */}
      <div className="mx-auto flex h-full w-full flex-col gap-3 px-3 pt-7">
        {/* Quick actions. These were 126px-tall stacked cards that pushed every
            actual number below the fold; laid out along the row they read
            faster and give the board back a third of its first screen. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {meetingActionTiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              data-slot="button"
              onClick={tile.onClick}
              disabled={tile.disabled}
              className={cn(
                'group flex cursor-pointer items-center gap-2.5 rounded-2xl border p-2.5 text-left shadow-mcm transition-all hover:-translate-y-0.5 hover:shadow-mcm-lg disabled:cursor-not-allowed disabled:opacity-70 sm:gap-3 sm:p-3',
                // Both variants sit on the opaque surface: the page behind
                // them is a warm peach gradient, and the accent wash that
                // used to tint the primary tile was close enough to that
                // gradient that the card lost its edge against it. The
                // primary tile is marked by its accent border and filled
                // icon instead.
                tile.primary
                  ? 'border-mcm-accent-edge bg-mcm-surface hover:border-mcm-accent'
                  : 'border-mcm-line bg-mcm-surface hover:border-mcm-accent-edge hover:bg-mcm-accent-wash/45',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors sm:h-10 sm:w-10',
                  tile.primary
                    ? 'bg-mcm-accent text-white'
                    : 'bg-mcm-accent-wash text-mcm-accent-ink group-hover:bg-mcm-accent group-hover:text-white',
                )}
              >
                <Icon name={tile.icon} className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-semibold text-mcm-ink sm:text-sm">
                  {tile.title}
                </span>
                <span className="hidden truncate text-xs text-[#64748b] dark:text-mcm-ink-3 sm:block">
                  {tile.description}
                </span>
              </span>
              <Icon
                name="ArrowRightUp"
                className="hidden h-3.5 w-3.5 shrink-0 text-mcm-ink-4 transition-colors group-hover:text-mcm-accent-ink sm:block"
              />
            </button>
          ))}
        </div>

        {/* Headline figures. A dashboard that opened on four buttons and an
            empty chart answered nothing; these say what is live, what is yours,
            what you were invited to and what is next, before any scrolling. */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {statTiles.map((tile) => (
            <StatTile key={tile.label} {...tile} />
          ))}
        </div>

        {/* Board controls. Search filters every list below without a round trip,
            and the refresh is the only way to pull new data short of reloading
            the page — the app disables refetch-on-focus globally. */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mcm-ink-4" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search meetings by name, host or code"
              aria-label="Search meetings"
              className="video-search h-9 w-full rounded-full border border-mcm-line bg-mcm-surface pl-8.5 pr-8 text-xs text-mcm-ink placeholder:text-mcm-ink-4 focus:border-mcm-accent focus:outline-none"
            />
            {search && (
              <button
                type="button"
                data-slot="button"
                aria-label="Clear search"
                onClick={() => setSearch('')}
                className="cursor-pointer absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-mcm-ink-4 transition-colors hover:bg-[#f5e6d3] dark:hover:bg-[rgba(251,146,60,0.14)] hover:text-mcm-ink-2"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Same fix as the KPI hint above: `text-mcm-ink-4` measured
                2.64:1 for this timestamp sentence. */}
            <span className="hidden text-[11px] text-[#475569] dark:text-mcm-ink-2 sm:block">
              {lastUpdatedAt ? `Updated ${moment(lastUpdatedAt).format('HH:mm')}` : 'Not loaded yet'}
            </span>
            <button
              type="button"
              data-slot="button"
              onClick={refreshAll}
              disabled={isRefreshing}
              className="cursor-pointer inline-flex h-9 items-center gap-1.5 rounded-full border border-mcm-line bg-mcm-surface px-3 text-xs font-semibold text-mcm-ink-2 shadow-mcm-sm transition-colors hover:border-mcm-accent-edge hover:text-mcm-accent-ink disabled:opacity-60"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
              {isRefreshing ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Happening now. The product has a whole Ongoing Meetings page, but the
            board had no way to tell you a meeting was running — and no way to
            join it from here. The band costs nothing when nothing is live. */}
        {filteredOngoing.length > 0 && (
          <div className="rounded-3xl border border-mcm-live/45 bg-mcm-live-wash p-3">
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mcm-live opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-mcm-live" />
              </span>
              <h2 className="text-sm font-semibold text-mcm-ink">Happening now</h2>
              <span className="rounded-full bg-mcm-live/15 px-1.5 py-0.5 text-[11px] font-semibold text-mcm-live">
                {filteredOngoing.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {filteredOngoing.map((meeting: any) => {
                const joined = Array.isArray(meeting?.members)
                  ? meeting.members.filter(
                      (member: { joinStatus: string }) =>
                        member?.joinStatus?.toUpperCase() === 'YES',
                    ).length
                  : 0;
                return (
                  <div
                    key={`ongoing-${meeting?.meetingId}`}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-mcm-live/35 bg-mcm-surface px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-semibold text-mcm-ink"
                        title={meeting?.name || 'Meeting'}
                      >
                        {meeting?.name || 'Meeting'}
                      </p>
                      <p className="truncate text-[11px] text-[#64748b] dark:text-mcm-ink-3">
                        Started {moment(meeting?.startTimeLocal).from(moment(now))} ·{' '}
                        {joined} joined
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <CustomTooltip text="Copy meeting link" side="top">
                        <button
                          type="button"
                          data-slot="button"
                          aria-label="Copy meeting link"
                          onClick={() => copyMeetingLink(meeting?.meetingId)}
                          className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-full bg-[#f5e6d3] dark:bg-[rgba(251,146,60,0.14)] text-mcm-ink-2 transition-colors hover:bg-mcm-accent hover:text-white"
                        >
                          <Icon name="LinkLine" className="h-4 w-4" />
                        </button>
                      </CustomTooltip>
                      <button
                        type="button"
                        data-slot="button"
                        onClick={() => window.open(`/video-meet?meetCode=${meeting?.meetingId}`)}
                        className="cursor-pointer inline-flex h-8 items-center gap-1.5 rounded-full bg-mcm-live px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        <Icon name="VideocameraAdd" className="h-4 w-4" />
                        Join
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid h-full min-h-0 grid-cols-1 gap-3 xl:grid-cols-[1fr_28rem]">
          <div className="flex min-h-0 flex-col rounded-3xl border border-mcm-line bg-mcm-surface p-4 shadow-mcm-sm sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-mcm-ink">Meeting volume</h2>
                <p className="text-xs text-[#64748b] dark:text-mcm-ink-3">
                  Summary returned for the date range selected above
                </p>
              </div>
              {/* `text-mcm-accent-ink` measured 3.27:1 against this badge's
                  own `bg-mcm-accent-wash` fill. */}
              <span className="rounded-full border border-mcm-accent-edge bg-mcm-accent-wash px-3 py-1 text-xs font-semibold text-[#a8460f] dark:text-mcm-accent-ink">
                {rangeLabel}
              </span>
            </div>
            {/* A hard 400px of chart height (`.chart-container`) meant the two
                meeting lists never shared a screen with it. */}
            {/* `border-mcm-line-2`/`bg-mcm-surface-2` are the console's cool
                blue-gray tokens (`#dfe5f0`/`#f6f8fc`) — everywhere else on
                this warm-orange board reads as cream/white, so this one panel
                stood out as a pale blue box. Swapped for the same warm cream
                `mcm-page.css` itself defines for `--surface-2`, which the
                bare `bg-mcm-surface-2` utility never actually reads (that
                utility resolves the *global* `--mcm-surface-2` in index.css,
                a different token that only shares the name). */}
            <div className="relative min-h-[16rem] w-full flex-1 rounded-2xl border border-[rgba(225,200,165,0.5)] dark:border-[rgba(251,146,60,0.15)] bg-[#fbf3e8] dark:bg-[rgba(23,15,10,0.85)] p-2 sm:p-3">
              <BarChart
                data={graphData}
                isPendingStatsData={statsQuery.isPending}
                isError={statsQuery.isError}
                onRetry={() => statsQuery.refetch()}
                isDark={isDark}
                canSchedule={Boolean(videAccess?.create)}
                onSchedule={() => setDrawerState(true)}
              />
            </div>
          </div>

          <div className="flex h-full gap-3 lg:min-h-0 xs:flex-col md:flex-row xl:flex-col">
            {renderMeetingPanel({
              title: 'Upcoming Meetings',
              description: 'Meetings you are hosting.',
              listType: 'upcoming_owned',
              meetings: filteredUpcoming,
              totalCount: upcomingMeetings?.length || 0,
              isPendingList: upcomingQuery.isPending,
              isErrorList: upcomingQuery.isError,
              onRetry: () => upcomingQuery.refetch(),
              viewAllTo: '/video',
            })}
            {renderMeetingPanel({
              title: 'Invited Meetings',
              description: 'Meetings you have been invited to.',
              listType: 'invited',
              meetings: filteredInvited,
              totalCount: invitedMeetings?.length || 0,
              isPendingList: invitedQuery.isPending,
              isErrorList: invitedQuery.isError,
              onRetry: () => invitedQuery.refetch(),
              viewAllTo: '/video/invited-meetings',
            })}
          </div>
        </div>
      </div>
      {modalState?.joinMeeting && (
        <JoinMeetingModal
          modalState={modalState?.joinMeeting}
          setModalState={(value) => setModalState((prev) => ({ ...prev, joinMeeting: value }))}
        />
      )}
      {modalState?.meetingInvites && (
        <MeetingMembersModal
          modalState={modalState?.meetingInvites}
          setModalState={(value) => {
            setModalState((prev) => ({ ...prev, meetingInvites: value }));
            setSelectedMeeting(null);
          }}
          members={selectedMeeting?.members || []}
          title="Invited Members"
        />
      )}
      {modalState?.isMeetingDelete && (
        <AlertConfirm
          {...{
            apiLoading: isPending,
            onConfirm: () => mutateMeetingDelete(selectedMeeting?.meetingId),
            open: modalState?.isMeetingDelete,
            setOpen: (value) => {
              setModalState((prev) => ({ ...prev, isMeetingDelete: value }));
              setSelectedMeeting(null);
            },
          }}
        />
      )}
      {modalState?.meetingAttendee && (
        <MeetingMembersModal
          modalState={modalState?.meetingAttendee}
          setModalState={(value) => {
            setModalState((prev) => ({ ...prev, meetingAttendee: value }));
            setSelectedMeeting(null);
          }}
          members={
            selectedMeeting?.members && Array.isArray(selectedMeeting.members)
              ? selectedMeeting.members
              : []
          }
          title="Attendees"
          filterFn={(user) => user?.joinStatus === 'YES'}
        />
      )}
      {modalState?.meetingInfo && (
        <MeetingInfo
          modalState={modalState?.meetingInfo}
          setModalState={(value) => {
            setModalState((prev) => ({ ...prev, meetingInfo: value }));
            setSelectedMeeting(null);
          }}
          meetingInfoData={selectedMeeting}
        />
      )}
      {/* A centred dialog rather than SideDrawer. This is a short form people
          fill in and dismiss, not a panel to work alongside the dashboard, and
          the drawer pinned it to the right edge at full viewport height - the
          fields ended up in a tall column off to one side. The same form is
          already presented this way from the meetings header, so the two
          entry points now open the same shape. */}
      <Dialog
        open={drawerState}
        onOpenChange={(open) => {
          setDrawerState(open);
          if (!open) setSelectedMeeting(null);
        }}
      >
        <DialogContent className="flex w-[96vw] flex-col gap-0 rounded-2xl p-0 sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-1 text-left">
            <DialogTitle className="text-xl font-extrabold text-[#2E2D35] dark:text-mcm-ink">
              {selectedMeeting ? 'Update Meeting' : 'Schedule New Meeting'}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-[#6b6459] dark:text-mcm-ink-3">
              Set up a video call with your team or clients
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pt-3 pb-6">
            <ScheduleMeeting
              initialData={selectedMeeting}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['videoDashboardStats'] });
                setSelectedMeeting(null);
              }}
              setDrawerState={(value) => {
                setDrawerState(value);
                setSelectedMeeting(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
      {modalState?.inviteMembers && (
        <InviteMembersModal
          modalState={modalState?.inviteMembers}
          setModalState={(value) => {
            setModalState((prev) => ({ ...prev, inviteMembers: value }));
          }}
          formInstance={formInstance}
          isPending={isPendingInvites}
          handleSendInvite={handleSendInvite}
        />
      )}
      {modalState?.inviteOthers && (
        <InviteOthersModal
          modalState={modalState?.inviteOthers}
          setModalState={(value) => {
            setModalState((prev) => ({ ...prev, inviteOthers: value }));
          }}
          formInstance={formInstance}
          handleSendInvite={handleSendInvite}
          isPending={isPendingInvites}
        />
      )}
      <WelcomeModalPopup />
    </section>
  );
};

export default VideoDashboard;
