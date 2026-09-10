import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import TableManager from '@/components/custom/table-manager';
import NumberWithFlag from '@/components/custom/number-with-flag';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { calendarMeetingList, getUserList } from '@/services/api';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { SocketEvents } from '@/context/socket-events-context';
import { LinearProgress } from '@/components/ui/linear-progress';
import moment from 'moment';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bell,
  Bot,
  CheckCircle2,
  Clock3,
  Gauge,
  Headset,
  LogIn,
  PauseCircle,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Timer,
  RefreshCw,
  Ear,
  MicIcon,
  UsersIcon,
  WifiOff,
  Info,
  Loader2,
} from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { isDemoMode } from '@/lib/demo-mode';
import { useDialpad } from '@/hooks/use-dialpad';
import { useCompanyFeatures } from '@/hooks/rbac';
import { handleAlert } from '@/lib/utils';
import CustomTooltip from '@/components/custom/custom-tooltip';
import { statusImageLookup } from '@/components/custom/custom-avatar';
import { CallIntersection, ImPhoneHangUp } from '@/assets/icons';
import {
  MONITOR_ACTION_LABELS,
  getMonitorTargetCallId,
  isDialpadMonitoringSessionActiveForCall,
  normalizeMonitorDialValue,
} from '@/lib/monitoring-actions';
import {
  getMonitoringCallTimestamp,
  getMonitoringLiveCalls,
  isActiveMonitoringCall,
  isMonitoringCallForMember,
} from '@/pages/monitoring/live-call-helpers';
import { CallPathCell, CallPathDialog } from '@/pages/monitoring/call-path-cell';
import CallHistory from '@/pages/reports/call-logs/call-history';
import { useCallStats } from '@/hooks/use-call-stats';

type Trend = 'up' | 'down' | 'flat';
type DashboardCallListKey = 'total' | 'inbound' | 'outbound' | 'missed';
type DashboardTaskListKey = 'callbacks';

type MetricGroup = 'Call Volume' | 'Quality & SLA' | 'Timing Averages';

type MetricCard = {
  label: string;
  value: string;
  icon: any;
  trend: Trend;
  /* Health derived from this reading. Optional: a metric with no meaningful
     threshold leaves it unset rather than being given an invented target. */
  state?: MetricState;
  group: MetricGroup;
  callListKey?: DashboardCallListKey;
  taskListKey?: DashboardTaskListKey;
};

const METRIC_GROUP_ORDER: MetricGroup[] = ['Call Volume', 'Quality & SLA', 'Timing Averages'];

type FunnelPoint = {
  label: string;
  value: number;
  count: number;
  color: string;
};

type QueueStatus = {
  queue: string;
  waiting: number | string;
  available: number | string;
  total: number | string;
  sla: number | string;
  avgWait: string;
};

type CampaignInfo = {
  name: string;
  dialed: number;
  connected: number;
  answerRate: number | string;
  conversions: number;
  failed: number;
};

type AgentStatus = 'AVAILABLE' | 'ON CALL' | 'RINGING' | 'WRAP UP' | 'ON HOLD' | 'OFFLINE';

const AGENT_PAGE_LIMIT = 25;


/**
 * Metric health, derived from the value rather than fixed per metric.
 *
 * `tone` already existed but describes the metric's *kind*: Abandoned was
 * styled `danger` at 0% and Service Level `success` at 40%, so the colour said
 * the same thing whatever the number did. On a board watched from across a
 * room, saying when something has gone wrong is the one job colour has.
 *
 * A metric with no meaningful threshold -- Total Today is neither good nor bad
 * -- returns undefined and stays neutral, rather than being given an invented
 * target.
 */
type MetricState = 'ok' | 'warn' | 'breach';

/** Higher is better: service level. */
const stateAbove = (value: number, ok: number, warn: number): MetricState =>
  value >= ok ? 'ok' : value >= warn ? 'warn' : 'breach';

/** Lower is better: waits, abandons, misses. */
const stateBelow = (value: number, ok: number, warn: number): MetricState =>
  value <= ok ? 'ok' : value <= warn ? 'warn' : 'breach';

/* Only warn and breach paint. A board that colours every healthy figure too
   has spent the signal before anything has gone wrong. */
const metricStateClasses: Record<MetricState, { value: string; edge: string; cell: string }> = {
  ok: { value: 'text-[#1A1A1A] dark:text-mcm-ink', edge: '', cell: '' },
  warn: {
    value: 'text-[#C2670A]',
    edge: 'bg-[#E8A33D]',
    cell: 'bg-[#FDF1DE]',
  },
  breach: {
    value: 'text-[#C0261F]',
    edge: 'bg-[#D8453C]',
    cell: 'bg-[#FDECEB]',
  },
};

const statusPillClass: Record<AgentStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-700 border border-green-200',
  'ON CALL': 'bg-ucass-active-bg text-ucass-active border border-ucass-active-bg',
  RINGING: 'bg-amber-50 text-amber-800 border border-amber-200',
  'WRAP UP': 'bg-amber-100 text-amber-700 border border-amber-200',
  'ON HOLD': 'bg-red-100 text-red-700 border border-red-200',
  OFFLINE: 'bg-[#FBE2C8]/40 dark:bg-mcm-surface-3/40 text-[#6b6459] dark:text-mcm-ink-3 border border-[#EEE7DD] dark:border-mcm-line',
};

const getCallbackTaskContactPhone = (task: any) =>
  String(
    task?.details?.contactPhone ||
      task?.contactPhone ||
      task?.contact_phone ||
      task?.phone ||
      task?.phoneNumber ||
      '',
  ).trim();

const getCallbackTaskContactName = (task: any) =>
  String(
    task?.details?.contactName ||
      task?.contactName ||
      task?.contact_name ||
      task?.name ||
      task?.title ||
      '',
  ).trim();

/* Utilization is not a "higher is always better" metric the way SLA is — an
   agent sitting low is normal, not a problem, and only genuine overload (a
   sustained near-100% load) is the actual alert condition. The old
   thresholds borrowed SLA's own green/amber/red ladder wholesale, which
   painted every merely-quiet agent (12%, 21%, 33%) in the same bright red
   `#DC5049` used for a real breach elsewhere on this board — a normal,
   healthy roster read as a wall of alerts. Low/normal now gets a soft,
   non-alarming warm wash instead of a colour that means "problem"
   everywhere else on this page; the target band (75-85%, the same range
   Service Level's own tile targets) is the brand's own sunset orange, not
   a colour reserved for danger; only genuine overload turns red. */
const getBarColor = (value: number) => {
  if (value > 85) return 'bg-[#ef4444]';
  if (value >= 75) return 'bg-[#ea580c]';
  return 'bg-[#EA8A3F]/50';
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part?.[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

/* `+91 88990 13744`, not the raw `+918899013744` the API returns — a
   10-digit Indian mobile/landline number splits 5+5 after the country
   code, the same spacing `NumberWithFlag` renders everywhere else a phone
   number appears on this board. Only reshapes a genuine 10-digit Indian
   number (with or without a leading `91`/`+91`); anything else (a short
   extension, an already-odd-length number) is handed back unchanged rather
   than mis-split. */
const formatIndianPhone = (raw: string) => {
  const value = String(raw || '').trim();
  if (!value) return value;
  const digits = value.replace(/\D/g, '');
  const national = digits.length > 10 && digits.startsWith('91') ? digits.slice(2) : digits;
  if (national.length !== 10) return value;
  return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
};

const ActionButtons = ({
  call,
  monitoringCallJoined,
  isMonitoringActionLocked,
  monitoringAccessActions,
  handleActionClick,
  handleHangupClick,
  hasAnyActiveCallSession,
}: {
  call?: any;
  monitoringCallJoined: boolean;
  isMonitoringActionLocked: boolean;
  monitoringAccessActions?: any;
  handleActionClick: (code: string, call: any) => void;
  handleHangupClick: (call: any) => void;
  hasAnyActiveCallSession: boolean;
}) => {
  const callStatus = String(call?.status || '').toLowerCase();
  const isButtonDisabled =
    !call ||
    !['bridged', 'answered'].includes(callStatus) ||
    (String(call?.called_number || '').length > 4 &&
      String(call?.agent_extension || '').length > 4) ||
    monitoringCallJoined ||
    hasAnyActiveCallSession ||
    isMonitoringActionLocked;

  if (isButtonDisabled) return <span className="text-xs text-[#6b6459] dark:text-mcm-ink-3">---</span>;

  /* These five escalate in how far they reach into a live call: listening is
     passive, whisper is audible to the agent, barge is audible to both
     parties, intercept takes the call away from the agent, hangup ends it on
     the caller. One shared orange gave a supervisor no way to tell them apart
     at a glance — the destructive one looked exactly like the harmless one.
     The tones below are that ladder, cool through to red.

     Each is a whole literal class string rather than one assembled from
     parts: Tailwind only emits a utility it can actually see in the source. */
  const actionButtonBase =
    'cursor-pointer flex items-center justify-center min-h-8 min-w-8 max-w-8 max-h-8 rounded-full w-8 h-8 border shadow-sm transition-colors';
  /* Pixel-matched to Performance ▸ Live Interactions' own 5-button ladder
     (`.ma-action-listen/whisper/barge/transfer/hangup` in live-theme.css) —
     same soft pastel washes at rest, same colour-family glow on hover
     (never a solid-fill/white-icon invert, which is what these five used to
     do), so a supervisor sees the identical five colours on both boards.
     `intercept` here maps to Live's `transfer` rung — same 4th-position
     orange, this board's own name for the same action. */
  const listenButtonClass = `${actionButtonBase} bg-[rgba(239,246,255,0.9)] border-[rgba(186,230,253,0.7)] text-[#0284c7] hover:bg-[rgba(224,242,254,0.95)] hover:border-[#7dd3fc] hover:shadow-[0_6px_14px_rgba(2,132,199,0.22)]`;
  const whisperButtonClass = `${actionButtonBase} bg-[rgba(245,243,255,0.9)] border-[rgba(221,214,254,0.7)] text-[#7c3aed] hover:bg-[rgba(237,233,254,0.95)] hover:border-[#c4b5fd] hover:shadow-[0_6px_14px_rgba(124,58,237,0.22)]`;
  const bargeButtonClass = `${actionButtonBase} bg-[rgba(254,252,232,0.9)] border-[rgba(254,240,138,0.7)] text-[#d97706] hover:bg-[rgba(254,249,195,0.95)] hover:border-[#fde047] hover:shadow-[0_6px_14px_rgba(217,119,6,0.22)]`;
  const interceptButtonClass = `${actionButtonBase} bg-[rgba(255,247,237,0.9)] border-[rgba(254,215,170,0.7)] text-[#ea580c] hover:bg-[rgba(254,237,213,0.95)] hover:border-[#fdba74] hover:shadow-[0_6px_14px_rgba(234,88,12,0.22)]`;
  const hangupButtonClass = `${actionButtonBase} bg-[rgba(254,242,242,0.9)] border-[rgba(254,202,202,0.7)] text-[#ef4444] hover:bg-[rgba(254,226,226,0.95)] hover:border-[#fca5a5] hover:shadow-[0_6px_14px_rgba(239,68,68,0.22)]`;

  return (
    <div className="flex items-center gap-2">
      {monitoringAccessActions?.listen && (
        <CustomTooltip text="Listen" side="top">
          <button
            type="button"
            data-slot="button"
            onClick={() => handleActionClick('*87', call)}
            className={listenButtonClass}
          >
            <Ear className="w-4 h-4" />
          </button>
        </CustomTooltip>
      )}
      {monitoringAccessActions?.whisper && (
        <CustomTooltip text="Whisper" side="top">
          <button
            type="button"
            data-slot="button"
            onClick={() => handleActionClick('*86', call)}
            className={whisperButtonClass}
          >
            <MicIcon className="w-4 h-4" />
          </button>
        </CustomTooltip>
      )}
      {monitoringAccessActions?.barge && (
        <CustomTooltip text="Barge" side="top">
          <button
            type="button"
            data-slot="button"
            onClick={() => handleActionClick('*88', call)}
            className={bargeButtonClass}
          >
            <UsersIcon className="w-4 h-4" />
          </button>
        </CustomTooltip>
      )}
      {monitoringAccessActions?.intercept && (
        <CustomTooltip text="Intercept" side="top">
          <button
            type="button"
            data-slot="button"
            onClick={() => handleActionClick('*89', call)}
            className={interceptButtonClass}
          >
            <CallIntersection className="w-5 h-5" />
          </button>
        </CustomTooltip>
      )}
      {monitoringAccessActions?.hangup && (
        <CustomTooltip text="Hangup" side="top">
          <button
            type="button"
            data-slot="button"
            onClick={() => handleHangupClick(call)}
            className={hangupButtonClass}
          >
            <ImPhoneHangUp className="w-5 h-5" />
          </button>
        </CustomTooltip>
      )}
    </div>
  );
};

const EMPTY_RANGE = { from: '', to: '' };

/**
 * `selectedRange` is optional: mounted on its own the board stays a live,
 * right-now wallboard. Mounted inside Performance, which has a date filter,
 * the volume figures follow that filter instead of silently ignoring it.
 */
const LiveDashboard = ({ selectedRange }: { selectedRange?: { from: string; to: string } } = {}) => {
  const {
    liveCalls,
    eventLiveCallsData,
    usersOnlineStatus,
    getCampaignLiveCalls,
    isSocketConnected,
    campaignLiveCallsData,
    liveQueueCalls,
    activeCampaigns,
    campaignCallFlowFunnel,
    campaignAgents,
    socketEventsManager,
  } = useContext(SocketEvents);
  const liveCallsData = getMonitoringLiveCalls(liveCalls, eventLiveCallsData);
  const filteredActiveCalls = liveCallsData?.filter(isActiveMonitoringCall) || [];
  const [, setTick] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCallPath, setSelectedCallPath] = useState<any>(null);
  const [selectedCallListMetric, setSelectedCallListMetric] = useState<MetricCard | null>(null);
  const { user } = useUser();
  const { features } = useCompanyFeatures();
  const { makeCall, sessions } = useDialpad();
  const monitoringAccessActions = features?.plan_features?.monitoring_features?.action;
  const callLogSummary = campaignLiveCallsData?.data?.call_log_summary || {};
  const monitorLockTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const agentRosterScrollRef = useRef<HTMLDivElement | null>(null);
  const agentRosterLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const [pendingMonitorActions, setPendingMonitorActions] = useState<Record<string, string>>({});
  const normalizedRole = String(
    user?.user_info?.custom_role_data?.name ||
      user?.user_info?.role_data?.name ||
      user?.user_info?.role ||
      '',
  )
    .trim()
    .toLowerCase();
  const canViewAgentRosterAndControls =
    normalizedRole?.toLowerCase()?.includes('admin') ||
    normalizedRole?.toLowerCase()?.includes('manager');

  const clearPendingMonitorLock = useCallback((callId: string) => {
    const normalizedCallId = normalizeMonitorDialValue(callId);
    if (!normalizedCallId) return;

    const existingTimeout = monitorLockTimeoutRef.current[normalizedCallId];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete monitorLockTimeoutRef.current[normalizedCallId];
    }

    setPendingMonitorActions((prev) => {
      if (!prev[normalizedCallId]) return prev;
      const next = { ...prev };
      delete next[normalizedCallId];
      return next;
    });
  }, []);

  const setPendingMonitorLock = useCallback(
    (callId: string, code: string) => {
      const normalizedCallId = normalizeMonitorDialValue(callId);
      if (!normalizedCallId) return;

      clearPendingMonitorLock(normalizedCallId);
      setPendingMonitorActions((prev) => ({
        ...prev,
        [normalizedCallId]: code,
      }));

      monitorLockTimeoutRef.current[normalizedCallId] = setTimeout(() => {
        clearPendingMonitorLock(normalizedCallId);
      }, 10000);
    },
    [clearPendingMonitorLock],
  );

  const hasActiveMonitorSessionForCall = useCallback(
    (callId: string) => isDialpadMonitoringSessionActiveForCall(sessions, callId),
    [sessions],
  );
  const hasAnyActiveCallSession = useMemo(
    () =>
      Object.values(sessions).some(
        (session) => !['ended', 'failed'].includes(String(session?.status || '').toLowerCase()),
      ),
    [sessions],
  );

  useEffect(() => {
    Object.keys(pendingMonitorActions).forEach((callId) => {
      if (hasActiveMonitorSessionForCall(callId)) {
        clearPendingMonitorLock(callId);
      }
    });
  }, [pendingMonitorActions, hasActiveMonitorSessionForCall, clearPendingMonitorLock]);

  useEffect(() => {
    return () => {
      Object.values(monitorLockTimeoutRef.current).forEach((timeout) => clearTimeout(timeout));
      monitorLockTimeoutRef.current = {};
    };
  }, []);

  const handleActionClick = (code: string, call: any) => {
    const callId = getMonitorTargetCallId(call);
    const normalizedCallId = normalizeMonitorDialValue(callId);
    if (!normalizedCallId) return;

    const hasPendingAction = Boolean(pendingMonitorActions?.[normalizedCallId]);
    const hasActiveMonitorSession = hasActiveMonitorSessionForCall(normalizedCallId);

    if (hasPendingAction || hasActiveMonitorSession) {
      const activeActionCode = pendingMonitorActions?.[normalizedCallId] || code;
      handleAlert({
        text: `${MONITOR_ACTION_LABELS[activeActionCode] || 'Monitoring'} is already active for this call. Please finish it before starting another action.`,
        type: 'warning',
      });
      return;
    }

    setPendingMonitorLock(normalizedCallId, code);
    makeCall(`${code}${normalizedCallId}`);
  };

  const terminateCallSession = (call: any) => {
    const callId = call?.direction === 'outbound' ? call?.call_uuid : call?.b_leg_uuid;
    if (!callId) return;

    socketEventsManager?.emit('call-hangup', { data: { call_uuid: callId } });
  };

  const handleRefreshCampaignStats = useCallback(() => {
    // Demo mode has no real socket, so `isSocketConnected` never flips true —
    // that left this button clickable but permanently a no-op. It routes
    // through getCampaignLiveCalls either way, which now re-seeds demo data.
    if (isDemoMode() || (user?.sip_credentials?.domain && isSocketConnected)) {
      setIsRefreshing(true);
      getCampaignLiveCalls({ domain: user?.sip_credentials?.domain }, (res: any) => {
        console.log('campaign-live-calls response:', res);
        setIsRefreshing(false);
      });
      setTimeout(() => {
        setIsRefreshing(false);
      }, 3000);
    }
  }, [user?.sip_credentials?.domain, getCampaignLiveCalls, isSocketConnected]);

  useEffect(() => {
    handleRefreshCampaignStats();
  }, [handleRefreshCampaignStats]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCallDuration = (startTime?: string | number | Date | null) => {
    if (!startTime) return '00:00:00';
    const startedAt = moment(startTime);
    if (!startedAt.isValid()) return '00:00:00';

    const duration = moment.duration(moment().diff(startedAt));
    const hours = Math.floor(duration.asHours());
    const mins = duration.minutes();
    const secs = duration.seconds();
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const {
    data: agentPages,
    fetchNextPage: fetchNextAgentPage,
    hasNextPage: hasNextAgentPage,
    isLoading: isLoadingAgentRoster,
    isFetchingNextPage: isFetchingNextAgentPage,
  } = useInfiniteQuery({
    queryKey: ['userList', { limit: AGENT_PAGE_LIMIT }],
    queryFn: ({ pageParam }) => getUserList({ page: pageParam, limit: AGENT_PAGE_LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const result = lastPage?.data?.data?.result;
      const currentPage = result?.currentPage ?? 1;
      const totalPages = result?.totalPages ?? 1;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
  });

  const agents = useMemo(
    () => agentPages?.pages?.flatMap((page) => page?.data?.data?.result?.rows || []) || [],
    [agentPages],
  );

  useEffect(() => {
    const scrollContainer = agentRosterScrollRef.current;
    const loadMoreTarget = agentRosterLoadMoreRef.current;
    if (!scrollContainer || !loadMoreTarget) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasNextAgentPage && !isFetchingNextAgentPage) {
          fetchNextAgentPage();
        }
      },
      { root: scrollContainer, threshold: 0.1 },
    );

    observer.observe(loadMoreTarget);
    return () => observer.disconnect();
  }, [fetchNextAgentPage, hasNextAgentPage, isFetchingNextAgentPage]);

  const getLiveCallForAgent = useCallback(
    (agent: any) => {
      const agentExt = String(agent?.extension || agent?.ext || agent || '');
      if (!agentExt) return null;

      return (
        filteredActiveCalls?.find((call: any) => isMonitoringCallForMember(call, agentExt)) || null
      );
    },
    [filteredActiveCalls],
  );

  const getAgentStatus = (agent: any): AgentStatus => {
    const agentExt = String(agent?.extension || agent?.ext || '');
    if (!agentExt) return 'OFFLINE';

    const liveCall = getLiveCallForAgent(agent);

    if (liveCall) {
      const liveStatus = String(liveCall.status || '').toLowerCase();
      if (['answered', 'bridge', 'bridged'].includes(liveStatus)) return 'ON CALL';
      if (['hold', 'on_hold'].includes(liveStatus)) return 'ON HOLD';
      if (
        [
          'ringing',
          'connecting',
          'members-offered',
          'start',
          'started',
          'trying',
          'waiting',
        ].includes(liveStatus)
      ) {
        return 'RINGING';
      }

      // Fallback check against AgentStatus keys
      if (liveStatus === 'wrap up') return 'WRAP UP';
    }

    const presence = usersOnlineStatus?.find((u: any) => String(u.userId) === agentExt);

    if (presence?.onCall) return 'ON CALL';
    if (presence?.online) return 'AVAILABLE';
    return 'OFFLINE';
  };

  // A live-call payload represents a call session, which can contain more than one
  // agent (for example, a conference). Count the roster statuses so the dashboard
  // cards use the same agent-level view as the live-status table.
  const agentsOnCall = (agents || []).filter(
    (agent: any) => getAgentStatus(agent) === 'ON CALL',
  ).length;

  /* The avatar's presence dot used to derive its state independently of the
     roster's own Live Status pill (`getAgentStatus`, above) — two separate
     reads of `usersOnlineStatus` that could, and did, disagree: an agent
     the pill correctly called AVAILABLE could still show the raw
     `presence.status` string here (e.g. "busy"), painting an odd amber/
     yellow busy icon next to an "AVAILABLE" name. Every on-call agent also
     collapsed to the same plain red `call` dot regardless of whether the
     call was actually connected or just ringing/on hold — the same
     "one colour for every on-call state" problem `getActiveCallTone`
     (monitoring/all-users/index.tsx) already fixed for Live Interactions'
     own presence dots. Deriving the dot from `getAgentStatus` instead — the
     one function the pill itself reads — makes the dot and the pill
     structurally unable to disagree, and reuses the same
     `call-connected`/`call-ringing` tone keys `statusImageLookup` already
     defines for exactly this. */
  const getAgentPresenceStatus = (agent: any) => {
    const status = getAgentStatus(agent);
    if (status === 'AVAILABLE') return 'online';
    if (status === 'ON CALL') return 'call-connected';
    if (status === 'RINGING' || status === 'ON HOLD') return 'call-ringing';
    if (status === 'WRAP UP') return 'busy';
    return 'offline';
  };

  // const getQueueOrCampaignName = (forwardValue: any) => {
  //   const value = String(forwardValue || '').trim();
  //   if (!value) return '--';

  //   const activeCampaignMatch = Array.isArray(activeCampaigns)
  //     ? activeCampaigns.find((campaign: any) => String(campaign?.uuid) === value)
  //     : null;
  //   if (activeCampaignMatch?.name) return activeCampaignMatch.name;

  //   const liveQueueMatch = Array.isArray(liveQueueCalls)
  //     ? liveQueueCalls.find((queue: any) => String(queue?.uuid) === value)
  //     : null;
  //   if (liveQueueMatch?.name) return liveQueueMatch.name;

  //   return '--';
  // };

  const summary = campaignLiveCallsData?.data?.summary;

  // The live summary is a right-now snapshot and reads 0 outside active
  // traffic, so it cannot answer "how many calls in this range". The call log
  // can, and is the same source the rest of Performance now uses.
  const rangeStats = useCallStats(selectedRange || EMPTY_RANGE);
  const useRange = Boolean(selectedRange?.from && selectedRange?.to);
  const totalCalls = useRange ? rangeStats.totalCalls : Number(summary?.total_call || 0);
  const inboundCalls = useRange
    ? rangeStats.inboundCalls
    : Number(summary?.inbound_call || 0);
  const outboundCalls = useRange ? rangeStats.outboundCalls : Number(summary?.outbound_call || 0);
  const missedCalls = useRange ? rangeStats.missedCalls : Number(summary?.missed_call || 0);

  const formatSecs = (val: number | string) => {
    const s = Number(val || 0);
    if (!s) return '0s';
    if (s < 60) return `${Math.round(s)}s`;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const rs = Math.round(s % 60);
    if (h > 0) return `${h}h ${m}m ${rs}s`;
    return `${m}m ${rs}s`;
  };

  /* Standard telephony `mm:ss`, not raw decimal seconds — `198.50s` read as
     a stopwatch value nobody on a wallboard actually parses at a glance;
     every other duration on this board (Time In State, the funnel, the
     campaign timers) already reads as a clock face, this was the one
     column still in raw seconds. */
  const formatAht = (val: any) => {
    const sec = Number(val);
    if (!sec || Number.isNaN(sec)) return '--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const dashboardCallbackTaskColumns = useMemo(
    () => [
      {
        header: 'Created On',
        accessorKey: 'createdAt',
        cell: ({ row }: any) => {
          const createdAt = row.original?.createdAt;

          return createdAt ? (
            <div className="flex flex-col">
              <span className="text-xs text-[#475569] dark:text-mcm-ink-2">
                {moment(createdAt).format('MMM DD, YYYY')}
              </span>
              <span className="text-[11px] uppercase text-[#475569] dark:text-mcm-ink-2">
                {moment(createdAt).format('hh:mm A')}
              </span>
            </div>
          ) : (
            '--'
          );
        },
      },
      {
        header: 'Title',
        accessorKey: 'name',
        cell: ({ row }: any) => (
          <span className="inline-block max-w-52 truncate text-xs font-medium text-[#1A1A1A] dark:text-mcm-ink">
            {row.original?.name || row.original?.title || '--'}
          </span>
        ),
      },
      {
        header: 'Scheduled At',
        accessorKey: 'startTime',
        cell: ({ row }: any) => {
          const startTime = row.original?.startTime;

          return startTime ? (
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[#475569] dark:text-mcm-ink-2">
                {moment(startTime).format('MMM DD, YYYY')}
              </span>
              <span className="text-[11px] uppercase text-[#475569] dark:text-mcm-ink-2">
                {moment(startTime).format('hh:mm A')}
              </span>
            </div>
          ) : (
            '--'
          );
        },
      },
      {
        header: 'Source',
        accessorKey: 'source',
        cell: ({ row }: any) => (
          <span className="text-xs capitalize text-[#475569] dark:text-mcm-ink-2">
            {String(row.original?.source || '--').toLowerCase()}
          </span>
        ),
      },
      {
        header: 'Contact',
        accessorKey: 'details.contactPhone',
        cell: ({ row }: any) => {
          const contactPhone = getCallbackTaskContactPhone(row.original);
          if (!contactPhone)
            return <span className="text-xs text-[#64748b] dark:text-mcm-ink-3">--</span>;

          return <NumberWithFlag number={contactPhone} />;
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }: any) => {
          const isCompleted = row.original?.status?.toUpperCase() === 'COMPLETED';
          const isPast = row.original?.startTime
            ? moment(row.original.startTime).isBefore(moment())
            : false;
          const isOverdue = !isCompleted && isPast;

          return (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                isCompleted
                  ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                  : isOverdue
                    ? 'border-rose-100 bg-rose-50 text-rose-600'
                    : 'border-amber-100 bg-amber-50 text-amber-600'
              }`}
            >
              {isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'Scheduled'}
            </span>
          );
        },
      },
      {
        id: 'makeCall',
        header: 'Call',
        cell: ({ row }: any) => {
          const schedule = row.original;
          const contactPhone = getCallbackTaskContactPhone(schedule);
          const contactName = getCallbackTaskContactName(schedule);
          const isCompleted = schedule?.status?.toUpperCase() === 'COMPLETED';
          const isDisabled = isCompleted || hasAnyActiveCallSession || !contactPhone;
          const tooltipText = !contactPhone
            ? 'Phone number not available'
            : isCompleted
              ? 'Task completed'
              : hasAnyActiveCallSession
                ? 'Already on call'
                : 'Make call';

          return (
            <CustomTooltip text={tooltipText} side="top">
              <button
                type="button"
                disabled={isDisabled}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!contactPhone) {
                    handleAlert({ text: 'Phone number not available', type: 'error' });
                    return;
                  }
                  makeCall(contactPhone, {
                    extraHeaders: [`X-ContactName: ${contactName || ' '}`],
                  });
                }}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-all ${
                  isDisabled
                    ? 'cursor-not-allowed bg-[rgba(100,116,139,0.12)] text-[#64748b] opacity-70 dark:bg-mcm-surface-3/40 dark:text-mcm-ink-3'
                    : 'cursor-pointer bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 active:scale-90'
                }`}
              >
                <PhoneCall className="h-4 w-4" />
              </button>
            </CustomTooltip>
          );
        },
      },
    ],
    [hasAnyActiveCallSession, makeCall],
  );

  const campaignAgentsResult =
    campaignAgents && typeof campaignAgents === 'object' && !Array.isArray(campaignAgents)
      ? campaignAgents
      : null;
  const campaignAgentList = Array.isArray(campaignAgentsResult?.agents)
    ? campaignAgentsResult.agents
    : [];
  const campaignAgentByExt = campaignAgentList.reduce((acc: any, item: any) => {
    const ext = String(item?.agent_extension || '');
    if (ext) acc[ext] = item;
    return acc;
  }, {});
  const getCampaignAgentStats = (extension: string) => {
    return campaignAgentByExt[String(extension || '')] || {};
  };
  const getCampaignUtilizationPercent = (extension: string) => {
    const stats = getCampaignAgentStats(extension);
    const rawUtilization = Number(stats?.utilization_percent);
    if (!Number.isFinite(rawUtilization)) return 0;
    const percent = rawUtilization;
    return Math.max(0, Math.min(100, percent));
  };
  const formatUtilizationPercent = (value: number) => `${Number(value.toFixed(2))}%`;

  const topCallsText = campaignAgentsResult?.top_calls?.agent_name
    ? `${campaignAgentsResult?.top_calls?.agent_name} (${campaignAgentsResult?.top_calls?.total_calls || 0})`
    : 'No record';

  const bottomCallsText = campaignAgentsResult?.bottom_calls?.agent_name
    ? `${campaignAgentsResult.bottom_calls.agent_name} (${campaignAgentsResult.bottom_calls.total_calls || 0})`
    : 'No record';

  const funnelData: FunnelPoint[] = [
    {
      label: 'Entered IVR',
      value: Number(campaignCallFlowFunnel?.entered_ivr_percent || 0),
      count: Number(campaignCallFlowFunnel?.entered_ivr_count || 0),
      color: 'bg-primary',
    },
    {
      label: 'Queued',
      value: Number(campaignCallFlowFunnel?.queued_percent || 0),
      count: Number(campaignCallFlowFunnel?.queued_count || 0),
      color: 'bg-[#F0954E]',
    },
    {
      label: 'Assigned Agent',
      value: Number(campaignCallFlowFunnel?.assigned_agent_percent || 0),
      count: Number(campaignCallFlowFunnel?.assigned_agent_count || 0),
      color: 'bg-[#4EAE6E]',
    },
  ];

  const dashboardMetrics: MetricCard[] = [
    {
      label: 'Total Today',
      value: String(totalCalls),
      icon: PhoneCall,
      trend: 'flat',
      group: 'Call Volume',
      callListKey: 'total',
    },
    {
      label: 'Inbound',
      value: String(inboundCalls),
      icon: PhoneIncoming,
      trend: 'flat',
      group: 'Call Volume',
      callListKey: 'inbound',
    },
    {
      label: 'Outbound',
      value: String(outboundCalls),
      icon: PhoneOutgoing,
      trend: 'flat',
      group: 'Call Volume',
      callListKey: 'outbound',
    },
    {
      label: 'Active Calls',
      value: String(agentsOnCall),
      icon: Activity,
      trend: 'flat',
      group: 'Call Volume',
    },
    {
      label: 'Calls Waiting',
      value: String(
        liveCallsData?.filter((c: any) => ['ringing', 'connecting', 'waiting'].includes(c.status))
          .length || 0,
      ),
      icon: Timer,
      trend: 'flat',
      state: stateBelow(
        liveCallsData?.filter((c: any) =>
          ['ringing', 'connecting', 'waiting'].includes(c.status),
        ).length || 0,
        3,
        9,
      ),
      group: 'Call Volume',
    },
    {
      label: 'In IVR',
      value: String(summary?.ivr_call || 0),
      icon: Bot,
      trend: 'flat',
      group: 'Call Volume',
    },
    {
      label: 'Abandoned',
      value: `${summary?.abandoned_in_call_percent || 0}%`,
      icon: AlertTriangle,
      trend: 'flat',
      state: stateBelow(Number(summary?.abandoned_in_call_percent || 0), 5, 8),
      group: 'Quality & SLA',
    },
    {
      label: 'Missed',
      value: String(missedCalls),
      icon: AlertTriangle,
      trend: 'flat',
      state: stateBelow(Number(missedCalls || 0), 0, 5),
      group: 'Quality & SLA',
      callListKey: 'missed',
    },
    {
      label: 'Callbacks',
      value: String(summary?.callback_count || 0),
      icon: Headset,
      trend: 'flat',
      group: 'Quality & SLA',
      taskListKey: 'callbacks',
    },
    {
      label: `Service Level (${summary?.answered_within_20_sec || 0}/20)`,
      value: `${summary?.service_level_percent || 0}%`,
      icon: Gauge,
      trend: 'flat',
      /* 80% is the target already named in this metric's own label. */
      state: stateAbove(Number(summary?.service_level_percent || 0), 80, 70),
      group: 'Quality & SLA',
    },
    {
      label: 'Avg Speed Answer',
      value: formatSecs(summary?.avg_speed_answer),
      icon: Clock3,
      trend: 'flat',
      state: stateBelow(Number(summary?.avg_speed_answer || 0), 20, 40),
      group: 'Timing Averages',
    },
    {
      label: 'Avg Handle Time',
      value: formatSecs(summary?.avg_handle_time),
      icon: Timer,
      trend: 'flat',
      group: 'Timing Averages',
    },
    {
      label: 'Avg Talk Time',
      value: formatSecs(summary?.avg_talk_time),
      icon: PhoneCall,
      trend: 'flat',
      group: 'Timing Averages',
    },
    {
      label: 'Avg Hold Time',
      value: formatSecs(summary?.avg_hold_time),
      icon: Clock3,
      trend: 'flat',
      state: stateBelow(Number(summary?.avg_hold_time || 0), 45, 90),
      group: 'Timing Averages',
    },
    {
      label: 'Avg Wrap-up',
      value: formatSecs(summary?.avg_wrap_time_sec),
      icon: Activity,
      trend: 'flat',
      group: 'Timing Averages',
    },
    {
      label: 'Max Wait Time',
      value: formatSecs(summary?.max_wait_time),
      icon: AlertTriangle,
      trend: 'flat',
      state: stateBelow(Number(summary?.max_wait_time || 0), 60, 180),
      group: 'Timing Averages',
    },
    {
      label: 'Longest Active',
      value: formatSecs(summary?.longest_active),
      icon: Timer,
      trend: 'flat',
      group: 'Timing Averages',
    },
  ];

  const dashboardMetricsByGroup = METRIC_GROUP_ORDER.map((group) => ({
    group,
    items: dashboardMetrics.filter((item) => item.group === group),
  })).filter((section) => section.items.length > 0);

  /* The question a wallboard exists to answer, which the page never answered:
     does the floor need someone right now? Reading seventeen figures to find
     out is the work this is meant to save. */
  const breaching = dashboardMetrics.filter((item) => item.state === 'breach');
  const warning = dashboardMetrics.filter((item) => item.state === 'warn');
  const floorState: MetricState = breaching.length ? 'breach' : warning.length ? 'warn' : 'ok';
  const floorIssues = [...breaching, ...warning];

  /* The five readings that change minute to minute and actually prompt an
     action. Everything else on this page is either a total for the day or a
     rolling average -- context, not signal. Pulled from `dashboardMetrics` by
     label so there is one definition of each figure, not two. */
  const heroMetrics = ['Calls Waiting', 'Max Wait Time', 'Active Calls', 'Service Level']
    .map((name) => dashboardMetrics.find((item) => item.label.startsWith(name)))
    .filter(Boolean) as MetricCard[];

  /* Reuses the roster's own status rule rather than re-deriving "free" from
     presence and call state, which is what the table below already does. */
  const agentsAvailableNow = (agents || []).filter(
    (agent: any) => getAgentStatus(agent) === 'AVAILABLE',
  ).length;

  const liveStripStats = [
    {
      label: 'Logged In',
      value: String(usersOnlineStatus?.filter((u: any) => u.online).length || 0),
      hoverText: 'group-hover:text-[#2E2D35] dark:group-hover:text-mcm-ink',
      hoverBar: 'group-hover:bg-[#2E2D35]',
      icon: LogIn,
    },
    {
      label: 'Available',
      value: String(
        usersOnlineStatus?.filter(
          (u: any) =>
            u.online &&
            !u?.onCall &&
            !filteredActiveCalls?.some((call: any) => isMonitoringCallForMember(call, u?.userId)),
        ).length || 0,
      ),
      hoverText: 'group-hover:text-[#4EAE6E]',
      hoverBar: 'group-hover:bg-[#4EAE6E]',
      icon: CheckCircle2,
    },
    {
      label: 'On Call',
      value: String(agentsOnCall),
      hoverText: 'group-hover:text-ucass-active',
      hoverBar: 'group-hover:bg-ucass-active',
      icon: PhoneCall,
    },
    {
      label: 'Ringing',
      value: String(
        liveCallsData?.filter(
          (c: any) =>
            ['ringing', 'connecting'].includes(c.status) ||
            c.type === 'call-ringing' ||
            c.type === 'call-start',
        )?.length ||
          callLogSummary?.ringing_calls ||
          0,
      ),
      hoverText: 'group-hover:text-amber-700',
      hoverBar: 'group-hover:bg-amber-700',
      icon: Bell,
    },
    {
      label: 'Wrap Up',
      value: '0',
      hoverText: 'group-hover:text-amber-600',
      hoverBar: 'group-hover:bg-amber-600',
      icon: Clock3,
    },
    {
      label: 'On Hold',
      value: String(
        liveCallsData?.filter((c: any) => c.status === 'hold' || c.type === 'call-hold')?.length ||
          callLogSummary?.hold_calls ||
          0,
      ),
      hoverText: 'group-hover:text-[#DC5049]',
      hoverBar: 'group-hover:bg-[#DC5049]',
      icon: PauseCircle,
    },
    // {
    //   label: 'Aux Break',
    //   value: '0',
    //   tone: 'text-[#6b6459] dark:text-mcm-ink-3',
    // },
    {
      label: 'Offline',
      value: String(
        Math.max(
          0,
          (agents?.length || 0) - (usersOnlineStatus?.filter((u: any) => u.online).length || 0),
        ),
      ),
      hoverText: 'group-hover:text-[#6b6459] dark:group-hover:text-mcm-ink-3',
      hoverBar: 'group-hover:bg-[#6b6459]',
      icon: WifiOff,
    },
    {
      label: 'Occupancy',
      value: agents?.length
        ? `${Math.round(((liveCallsData?.length || 0) / agents.length) * 100)}%`
        : '0%',
      hoverText: 'group-hover:text-[#4EAE6E]',
      hoverBar: 'group-hover:bg-[#4EAE6E]',
      icon: Gauge,
    },
  ];

  // console.log('liveQueueCalls', liveQueueCalls, liveCalls);
  const queueStatusData: QueueStatus[] = Array.isArray(liveQueueCalls)
    ? liveQueueCalls.map((queue: any) => ({
        queue: queue?.name || 'N/A',
        waiting: 0,
        total: queue?.total_calls || 0,
        available: queue?.available_count || 0,
        sla: queue?.sla_within_20_sec_percent || 0,
        avgWait: queue?.avg_wait_time_sec || 0,
      }))
    : [];
  const activeCampaignsData: CampaignInfo[] = Array.isArray(activeCampaigns)
    ? activeCampaigns.map((campaign: any) => ({
        name: campaign?.name || 'N/A',
        dialed: Number(campaign?.dialed || 0),
        connected: Number(campaign?.connected || 0),
        answerRate: Number(campaign?.connectedPercent || 0),
        conversions: Number(campaign?.conversions || 0),
        failed: Number(campaign?.failed || 0),
      }))
    : [];

  const selectedCallListDate = useMemo(() => {
    const today = moment().format('YYYY-MM-DD');
    return { from: today, to: today };
  }, []);
  const isSelectedCallbackTaskMetric = selectedCallListMetric?.taskListKey === 'callbacks';
  const selectedCallHistoryConfig = useMemo(() => {
    const callListKey = selectedCallListMetric?.callListKey;
    const configByMetric: Record<
      DashboardCallListKey,
      { activeTab: string; filters: { key: string; value: string }[] }
    > = {
      total: { activeTab: 'Total Calls', filters: [] },
      inbound: { activeTab: 'Answered Calls', filters: [{ key: 'direction', value: 'Inbound' }] },
      outbound: { activeTab: 'Outgoing Calls', filters: [{ key: 'direction', value: 'Outbound' }] },
      missed: { activeTab: 'Missed Calls', filters: [{ key: 'direction', value: 'Missed' }] },
    };

    return callListKey ? configByMetric[callListKey] : null;
  }, [selectedCallListMetric]);

  return (
    <div className="live-wallboard-theme px-3 pt-7 pb-3">
      {/* Global --primary carries !important (src/index.css), so only another
          !important author rule can out-cascade it here; a plain inline style
          override would silently lose.

          The scrollbar rules that used to live here are gone: the lists now
          carry `.perf-thin-scroll`, defined once in src/index.css, which hides
          the indicator while leaving the list scrollable. Styling it in two
          places is what made it look unfixable -- the page-level rule kept
          winning on specificity. */}
      <style>{`
        .live-wallboard-theme { --primary: #EA8A3F !important; }
      `}</style>
      {/* TODO:on ERROR */}
      {/* <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Critical SLA Warning: Billing Queue
                </p>
                <p className="text-xs text-red-600">
                  Wait time exceeded 5 minutes. 4 calls are currently waiting. Agents available: 0
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="destructive">
                Enable Overflow Routing
              </Button>
              <Button size="sm" variant="transparent" className="text-red-700">
                Dismiss
              </Button>
            </div>
          </div>
        </div> */}


      {/* ── Floor state ──────────────────────────────────────────────────
          One line: is anything wrong, and what. A wallboard is watched from
          across a room and mostly unattended, so it has to answer that
          without the reader totting up seventeen figures first. */}
      <div
        className={`mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[20px] border px-4 py-3 ${
          floorState === 'breach'
            ? 'border-[rgba(216,69,60,0.3)] bg-[#FDECEB]'
            : floorState === 'warn'
              ? 'border-[rgba(232,163,61,0.32)] bg-[#FDF1DE]'
              : 'border-[rgba(78,174,110,0.28)] bg-[#EAF7EE]'
        }`}
      >
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            floorState === 'breach'
              ? 'bg-[#D8453C]'
              : floorState === 'warn'
                ? 'bg-[#E8A33D]'
                : 'bg-[#4EAE6E]'
          }`}
        />
        <span
          className={`text-sm font-bold ${
            floorState === 'breach'
              ? 'text-[#C0261F]'
              : floorState === 'warn'
                ? 'text-[#C2670A]'
                : 'text-emerald-700'
          }`}
        >
          {floorState === 'ok'
            ? 'All clear'
            : `${floorIssues.length} ${floorIssues.length === 1 ? 'metric needs' : 'metrics need'} attention`}
        </span>
        {floorIssues.length ? (
          <span className="text-xs text-[#475569] dark:text-mcm-ink-2">
            {floorIssues.map((item) => `${item.label} ${item.value}`).join('  ·  ')}
          </span>
        ) : (
          <span className="text-xs text-[#475569] dark:text-mcm-ink-2">
            Every tracked metric is inside target.
          </span>
        )}
        {/* Page-level, because that is its actual scope. Despite the name,
            `handleRefreshCampaignStats` re-fetches `campaignLiveCallsData`,
            and `summary` -- the source of nearly every figure on this page --
            is read straight off it. Campaigns are one consumer of that
            payload, not its subject. */}
        {/* `data-slot="button"` is load-bearing: mcm-page.css resets every bare
            <button> inside `.mcm-page` to `border: 0; background: none;
            color: inherit`, and because that selector wraps its exclusions in
            a zero-specificity `:where()` it scores (0,1,1) and outranks every
            Tailwind utility here. Without the attribute the fill, border and
            colour below are dropped and the control renders as plain text.
            Same styling as the AI Wall refresh so the two boards match. */}
        <button
          type="button"
          data-slot="button"
          onClick={handleRefreshCampaignStats}
          disabled={isRefreshing}
          title="Refresh live figures"
          aria-label="Refresh live figures"
          className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full border border-[rgba(214,163,90,0.6)] bg-[#fffdfb] px-4 py-2 text-xs font-semibold text-primary shadow-[0_2px_8px_rgba(194,98,46,0.16)] transition hover:border-primary/60 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      {/* ── Right now ───────────────────────────────────────────────────
          The readings that prompt an action, at a size readable across a
          room, sitting directly under the line that flags them. */}
      {/* Grid, not a justified flex row: on a wide wallboard, five compact
          cards under `justify-between` leave both huge inter-card gaps and a
          dead strip inside each card past the number. A grid divides the
          full width up front, and the icon badge gives that reclaimed space
          inside the card a job instead of sitting blank. */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {heroMetrics.map((item) => {
          const heroState = item.state && item.state !== 'ok' ? metricStateClasses[item.state] : null;
          const HeroIcon = item.icon;
          return (
            <div
              key={item.label}
              className={`relative flex items-start justify-between gap-3 overflow-hidden rounded-[20px] border px-5 py-3.5 shadow-[0_10px_34px_rgba(160,95,30,0.14)] ${
                heroState
                  ? `${heroState.cell} border-[rgba(249,115,22,0.14)]`
                  : 'border-[rgba(225,200,165,0.55)] dark:border-mcm-line/55 bg-[#fffdfb] dark:bg-mcm-surface backdrop-blur-[20px] backdrop-saturate-[190%]'
              }`}
            >
              {heroState ? (
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 left-0 w-1 ${heroState.edge}`}
                />
              ) : null}
              <div>
                <p
                  className={`num text-[28px] font-bold leading-none tracking-tight ${
                    heroState ? heroState.value : 'text-[#1A1A1A] dark:text-mcm-ink'
                  }`}
                >
                  {item.value}
                </p>
                <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#475569] dark:text-mcm-ink-2">
                  {item.label}
                </p>
              </div>
              {HeroIcon ? (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF1E0] dark:bg-mcm-accent-wash">
                  <HeroIcon
                    className={`h-4.5 w-4.5 ${heroState ? heroState.value : 'text-primary'}`}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
        <div className="relative flex items-start justify-between gap-3 overflow-hidden rounded-[20px] border border-[rgba(225,200,165,0.55)] dark:border-mcm-line/55 bg-[#fffdfb] dark:bg-mcm-surface backdrop-blur-[20px] backdrop-saturate-[190%] px-5 py-3.5 shadow-[0_10px_34px_rgba(160,95,30,0.14)]">
          <div>
            <p className="num text-[28px] font-bold leading-none tracking-tight text-[#1A1A1A] dark:text-mcm-ink">
              {agentsAvailableNow}
            </p>
            <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#475569] dark:text-mcm-ink-2">
              Agents Available
            </p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF1E0] dark:bg-mcm-accent-wash">
            <UsersIcon className="h-4.5 w-4.5 text-primary" />
          </div>
        </div>
      </div>

      <div className="mb-3 mt-5">
        <h3 className="text-base font-semibold text-[#1A1A1A] dark:text-mcm-ink">Today so far</h3>
      </div>

      {(() => {
        /* Same panel markup for every group; only the outer arrangement
           differs between the top split row and the full-width row below,
           so the panel itself is built once and placed twice. */
        const renderMetricGroupPanel = (
          section: (typeof dashboardMetricsByGroup)[number],
          fill: boolean,
        ) => (
          <div key={section.group} className={fill ? 'flex-1 min-w-0' : undefined}>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-mcm-ink-2">
              {section.group}
            </p>
            {/* One panel per group, not one card per metric. Border, fill,
                radius and shadow each say "separate object", and spending all
                four on all fifteen tiles left nothing to tell them apart --
                the group is the object, the metrics are its cells. The 1px
                gap over a tinted panel draws the hairlines, so they stay
                exact however the grid wraps. */}
            {/* auto-fit, not a fixed column count. The three groups hold six,
                four and seven metrics; forcing them all into a nine-column
                grid left Quality with five empty cells and stranded Longest
                Active alone on a row. Tracks now exist only where an item
                does, so every group fills its band exactly. */}
            {/* The cells size to their content and the card hugs them, rather
                than six readings being stretched across the full page width.
                A count like 64 does not need 280px, and the empty half of
                each cell was reading as unfinished layout. Split-row panels
                get a fixed two-row grid instead: Call Volume's six items
                become 3 columns and Quality's four become 2, so both sit at
                exactly two full rows with no stray empty cell and no
                stretch, and the two panels land at the same height without
                either looking sparse or cramped next to the other.

                The full-width row underneath (Timing Averages) deliberately
                breaks from that joined-card pattern: three bordered boxes in
                a row, all built the same way, starts reading as one repeated
                widget rather than three distinct readings. It renders as a
                loose strip of separate pill chips instead -- rounded-full,
                icon-in-a-circle on the left rather than a small glyph beside
                the label -- so it's recognizably part of the same family
                without being a fourth copy of the same box. */}
            {fill ? (
              /* Opaque fill, no backdrop filter. Every panel, hero card and
                 timing pill on this board used to be `rgba(255,255,255,0.85)`
                 over `backdrop-saturate-[190%]`, which meant each one tinted
                 itself from whatever part of the page's warm radial gradient
                 happened to sit behind it - and the saturate multiplied that
                 orange rather than muting it. Two panels with identical markup
                 (Call Volume, Quality & SLA) landed at visibly different
                 shades purely because they sit at different x positions.
                 `--surface` is opaque, so a panel now looks the same wherever
                 it lands, and it tracks light/dark on its own. */
              /* The panel-as-one-object reasoning above still holds -- these
                 stay grid compartments of one card, not fifteen separate
                 ones -- but flat cells on flush hairlines read as a
                 spreadsheet dropped onto a board that floats rounded,
                 shadowed pill cards everywhere else on this exact screen
                 (the row directly above this one, the Timing Averages strip
                 below it). The gap and cream (`--surface-2` / `#fbf3e8`)
                 fill give each cell the same "resting on a surface" depth
                 the rest of the page has, without fragmenting the group
                 back into individually-bordered boxes: it's the nested
                 card-in-card pattern the queue cards already use elsewhere
                 (`--surface` housing `--surface-2` compartments), applied
                 here instead of literally cloning the floating-pill shape. */
              <div
                className="grid w-full gap-1.5 overflow-hidden rounded-[20px] border border-[rgba(225,200,165,0.55)] dark:border-mcm-line/55 bg-[#fffdfb] dark:bg-mcm-surface p-1.5 backdrop-blur-[20px] backdrop-saturate-[190%] shadow-[0_10px_34px_rgba(160,95,30,0.14)]"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(1, Math.ceil(section.items.length / 2))}, minmax(140px, 1fr))`,
                }}
              >
                {section.items.map((item) => {
                  const IconComp = item.icon;
                  const isClickableMetric = Boolean(item.callListKey || item.taskListKey);
                  /* Undefined for metrics with no meaningful threshold, and for
                     healthy ones -- both render plain. */
                  const stateStyle =
                    item.state && item.state !== 'ok' ? metricStateClasses[item.state] : null;
                  const openDashboardMetric = () => {
                    if (isClickableMetric) setSelectedCallListMetric(item);
                  };
                  return (
                    <div
                      key={item.label}
                      role={isClickableMetric ? 'button' : undefined}
                      tabIndex={isClickableMetric ? 0 : undefined}
                      onClick={openDashboardMetric}
                      onKeyDown={(event) => {
                        if (!isClickableMetric) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openDashboardMetric();
                        }
                      }}
                      className={`group relative flex flex-col justify-between gap-2.5 overflow-hidden rounded-[14px] px-4 py-3.5 transition-colors duration-150 ${
                        stateStyle?.cell || 'bg-[#fbf3e8] hover:bg-[#f7ead9]'
                      } ${
                        isClickableMetric
                          ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/40'
                          : ''
                      }`}
                    >
                      {/* A 3px edge on the breaching cell only. Reads as a
                          flag down the left of the panel from a distance,
                          before any of the numbers are legible. */}
                      {stateStyle ? (
                        <span
                          aria-hidden="true"
                          className={`absolute inset-y-0 left-0 w-[3px] ${stateStyle.edge}`}
                        />
                      ) : null}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#475569] dark:text-mcm-ink-2">
                          {item.label}
                        </p>
                        {/* Not the usual peach `#FFF1E0` badge: on the cell's
                            own cream fill that peach nearly disappeared into
                            it -- barely more than a shade apart. A near-white
                            frosted fill is what actually lifts off a cream
                            surface, the same reason the queue cards' avatars
                            sit on `--surface` rather than another
                            `--surface-2` tint -- translucent (`/90`) rather
                            than a flat opaque white, so it reads as glass
                            like every other surface on this board instead of
                            a stark solid fill. */}
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105 ${
                            stateStyle ? 'bg-white/70' : 'bg-white/90'
                          }`}
                        >
                          <IconComp
                            className={`h-3.5 w-3.5 ${
                              stateStyle ? stateStyle.value : 'text-primary'
                            }`}
                          />
                        </div>
                      </div>
                      <div className="flex items-end gap-1.5">
                        <span
                          className={`v num text-[24px] font-bold leading-none tracking-tight ${
                            stateStyle ? stateStyle.value : 'text-[#1A1A1A] dark:text-mcm-ink'
                          }`}
                        >
                          {item.value}
                        </span>
                        {item.trend === 'up' && (
                          <ArrowUp className="mb-1 h-3.5 w-3.5 text-[#4EAE6E]" />
                        )}
                        {item.trend === 'down' && (
                          <ArrowDown className="mb-1 h-3.5 w-3.5 text-[#DC5049]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* One joined panel, not seven free-floating pills. Seven chips
                 each carrying their own border, fill and shadow read as seven
                 competing objects, on a page whose other two metric groups are
                 each a single surface divided by hairlines -- the strip is the
                 object, the seven readings are its cells. Same fill, radius,
                 hairline and shadow as those panels, so the three groups now
                 look like one family instead of two plus a loose row. */
              <div className="w-full overflow-hidden rounded-[20px] border border-[rgba(225,200,165,0.55)] dark:border-mcm-line/55 bg-[#fffdfb] dark:bg-mcm-surface shadow-[0_10px_34px_rgba(160,95,30,0.14)]">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
                  {section.items.map((item) => {
                    const IconComp = item.icon;
                    const isClickableMetric = Boolean(item.callListKey || item.taskListKey);
                    const stateStyle =
                      item.state && item.state !== 'ok' ? metricStateClasses[item.state] : null;
                    const openDashboardMetric = () => {
                      if (isClickableMetric) setSelectedCallListMetric(item);
                    };
                    return (
                      <div
                        key={item.label}
                        role={isClickableMetric ? 'button' : undefined}
                        tabIndex={isClickableMetric ? 0 : undefined}
                        onClick={openDashboardMetric}
                        onKeyDown={(event) => {
                          if (!isClickableMetric) return;
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openDashboardMetric();
                          }
                        }}
                        /* Hairlines drawn as insets rather than borders, the
                           same trick the grids above use, so they stay exact
                           however the row wraps at each breakpoint. */
                        className={`group relative flex items-center gap-2.5 px-3.5 py-3 shadow-[1px_0_0_rgba(225,200,165,0.4),0_1px_0_rgba(225,200,165,0.4)] transition-colors duration-150 ${
                          stateStyle?.cell || 'hover:bg-[rgba(249,115,22,0.05)]'
                        } ${
                          isClickableMetric
                            ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/40'
                            : ''
                        }`}
                      >
                        {/* 3px edge on the breaching cell only -- reads as a
                            flag down the strip before the numbers are legible,
                            matching how the panels above flag a breach. */}
                        {stateStyle ? (
                          <span
                            aria-hidden="true"
                            className={`absolute inset-y-0 left-0 w-[3px] ${stateStyle.edge}`}
                          />
                        ) : null}
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            stateStyle ? 'bg-white/60' : 'bg-[#FFF1E0] dark:bg-mcm-accent-wash'
                          }`}
                        >
                          <IconComp
                            className={`h-3.5 w-3.5 ${stateStyle ? stateStyle.value : 'text-primary'}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <span
                            className={`v num text-[15px] font-bold leading-none tracking-tight ${
                              stateStyle ? stateStyle.value : 'text-[#1A1A1A] dark:text-mcm-ink'
                            }`}
                          >
                            {item.value}
                          </span>
                          <p className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-wide text-[#475569] dark:text-mcm-ink-2">
                            {item.label}
                          </p>
                        </div>
                        {item.trend === 'up' && (
                          <ArrowUp className="ml-auto h-3.5 w-3.5 shrink-0 text-[#4EAE6E]" />
                        )}
                        {item.trend === 'down' && (
                          <ArrowDown className="ml-auto h-3.5 w-3.5 shrink-0 text-[#DC5049]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

        const [topLeft, topRight, ...rest] = dashboardMetricsByGroup;

        return (
          <div className="flex flex-col gap-3">
            {(topLeft || topRight) && (
              <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
                {topLeft ? renderMetricGroupPanel(topLeft, true) : null}
                {topRight ? renderMetricGroupPanel(topRight, true) : null}
              </div>
            )}
            {rest.map((section) => renderMetricGroupPanel(section, false))}
          </div>
        );
      })()}

      <div className="mx-auto flex w-full max-w-[1880px] flex-col mt-3">
          {/* One surface, three bands divided by hairlines, rather than three
              stacked cards each carrying its own border and shadow. Each band
              opens with a rule, an eyebrow and a sentence saying what it is
              for, so the panel reads before its numbers do. */}
          <div className="w-full rounded-[20px] border border-[rgba(225,200,165,0.55)] dark:border-mcm-line/55 bg-[#fffdfb] dark:bg-mcm-surface backdrop-blur-[20px] backdrop-saturate-[190%] shadow-[0_10px_34px_rgba(160,95,30,0.14)]">
            <div className="grid grid-cols-1 divide-y divide-[rgba(225,200,165,0.4)] md:grid-cols-3 md:divide-x md:divide-y-0">

              <section className="p-5">
                <div className="flex items-center gap-2.5">
                  <span className="h-[2px] w-6 rounded-full bg-[#ea580c]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#475569] dark:text-mcm-ink-2">
                    Call Flow Funnel
                  </span>
                </div>
                <h4 className="mt-2 text-xl font-bold tracking-tight text-[#1A1A1A] dark:text-mcm-ink">
                  From calls to conversations
                </h4>
                <p className="mt-1 text-xs text-[#475569] dark:text-mcm-ink-2">
                  How calls move through the contact centre, live.
                </p>

                <div className="mt-5 flex flex-col gap-4">
                  {funnelData.map((item, index) => (
                    /* `-mx-5`/`px-5` cancel out visually (the connector below
                       is positioned off this box's padding edge, which lands
                       in the same place either way) — matched to the parent
                       `<section className="p-5">`'s own padding so the hover
                       wash reaches the card's actual left/right edges instead
                       of stopping a couple of pixels past the row's content. */
                    <div
                      key={item.label}
                      className="group relative -mx-5 flex gap-3 rounded-xl px-5 py-1 transition-colors duration-150 hover:bg-[rgba(249,115,22,0.05)]"
                    >
                      {index < funnelData.length - 1 && (
                        <span className="absolute left-[13px] top-7 h-[calc(100%+1rem-14px)] w-px bg-[rgba(225,200,165,0.6)] dark:bg-mcm-surface-3/60" />
                      )}
                      {/* `#ea580c` measured 3.21:1 against this badge's own
                          `#FFF1E0` fill at 11px. */}
                      <span className="relative z-10 mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#FFF1E0] dark:bg-mcm-accent-wash text-[11px] font-bold text-[#a8460f] dark:text-mcm-accent-ink transition-transform duration-150 group-hover:scale-110">
                        {index + 1 < 10 ? `0${index + 1}` : index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-[#1A1A1A] dark:text-mcm-ink">
                            {item.label}
                          </span>
                          <span className="flex shrink-0 items-baseline gap-2">
                            {/* What a funnel is actually read for is the loss
                                between steps, and that was the one figure not
                                on it -- "78%" and "50" both describe the step
                                you are looking at, leaving the reader to
                                subtract the previous row themselves. */}
                            {index > 0 &&
                              Number(funnelData[index - 1]?.count) > Number(item.count) && (
                                <span
                                  className="num rounded-full bg-[rgba(216,69,60,0.1)] px-1.5 py-0.5 text-[10px] font-bold text-[#C0261F]"
                                  title={`${Number(funnelData[index - 1].count) - Number(item.count)} lost since ${funnelData[index - 1].label}`}
                                >
                                  −{Number(funnelData[index - 1].count) - Number(item.count)}
                                </span>
                              )}
                            <span className="num text-sm font-bold text-[#1A1A1A] dark:text-mcm-ink">
                              {item.value}%
                            </span>
                            <span className="num text-xs text-[#475569] dark:text-mcm-ink-2">{item.count}</span>
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(225,200,165,0.35)] dark:bg-mcm-surface-3/35">
                          <span
                            className={`block h-full rounded-full ${item.color}`}
                            style={{ width: `${Math.min(Math.max(item.value, 0), 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="p-5">
                <div className="flex items-center gap-2.5">
                  <span className="h-[2px] w-6 rounded-full bg-[#ea580c]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#475569] dark:text-mcm-ink-2">
                    Queue Status
                  </span>
                </div>
                <h4 className="mt-2 text-xl font-bold tracking-tight text-[#1A1A1A] dark:text-mcm-ink">
                  Keep every queue moving
                </h4>
                <p className="mt-1 text-xs text-[#475569] dark:text-mcm-ink-2">
                  Live queue performance and agent availability.
                </p>

                {queueStatusData.length > 0 ? (
                  /* Scrolls in place once the list outgrows the column, so ten
                     queues do not stretch the funnel and campaigns beside it. */
                  <div className="perf-thin-scroll mt-5 max-h-[300px] overflow-y-auto overflow-x-auto">
                    {/* Header pixel-matched to the Directory People benchmark
                        (legacy-table-theme.css/live-theme.css): `#fffdfb`
                        background, `#8a6f57` text at 9.5px/800/0.09em
                        uppercase, a 2px warm-orange hairline rule. This is a
                        raw `<table>`, not the shared `<Table>` component
                        `legacy-table-theme.css` targets, so the tokens are
                        applied directly rather than inherited.
                        `!important` on color/size/weight/letter-spacing/
                        border because `.mcm-page th` (mcm-page.css) is an
                        unlayered base rule setting `color: var(--ink-4)`
                        (`#93a0b8`, a cool blue-grey) that beats a plain
                        Tailwind class on these `<th>` regardless of
                        specificity — the labels used to render in that cool
                        grey at a 2.5:1 contrast ratio against the warm cream
                        header, well under the 4.5:1 small-text minimum, the
                        same trap `.mcm-page button`'s reset sets for plain
                        buttons elsewhere in this file. */}
                    <table className="w-full min-w-[330px]">
                      <thead>
                        <tr className="bg-[#fffdfb] dark:bg-mcm-surface">
                          <th className="py-2 pl-2 text-left text-[9.5px] font-extrabold uppercase tracking-[0.09em] !text-[#8a6f57] dark:!text-mcm-ink-2 !border-b-2 !border-b-[rgba(242,153,74,0.25)]">
                            Queue
                          </th>
                          {/* Durations right, counts centre - the handoff
                              guide's alignment rule. Right-aligned digits also
                              line up their units, so 8s and 34s compare down
                              the column instead of drifting. */}
                          <th className="py-2 text-right text-[9.5px] font-extrabold uppercase tracking-[0.09em] !text-[#8a6f57] dark:!text-mcm-ink-2 !border-b-2 !border-b-[rgba(242,153,74,0.25)]">
                            Avg wait
                          </th>
                          <th className="py-2 text-center text-[9.5px] font-extrabold uppercase tracking-[0.09em] !text-[#8a6f57] dark:!text-mcm-ink-2 !border-b-2 !border-b-[rgba(242,153,74,0.25)]">
                            Available
                          </th>
                          <th className="py-2 pr-2 text-right text-[9.5px] font-extrabold uppercase tracking-[0.09em] !text-[#8a6f57] dark:!text-mcm-ink-2 !border-b-2 !border-b-[rgba(242,153,74,0.25)]">
                            SLA
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgba(225,200,165,0.4)]">
                        {queueStatusData.map((queue) => {
                          const slaState = stateAbove(Number(queue.sla || 0), 80, 70);
                          const slaClass =
                            slaState === 'breach'
                              ? 'text-[#C0261F]'
                              : slaState === 'warn'
                                ? 'text-[#C2670A]'
                                : 'text-emerald-700';
                          const edge =
                            slaState === 'breach'
                              ? 'bg-[#D8453C]'
                              : slaState === 'warn'
                                ? 'bg-[#E8A33D]'
                                : 'bg-[#4EAE6E]';
                          return (
                            /* Directory's signature row-hover: a 3px inset
                               left accent bar plus a warm peach wash
                               (`box-shadow: inset 3px 0 0 var(--accent)` +
                               `rgba(254,215,170,0.22)` in live-theme.css/
                               legacy-table-theme.css) — this table's rows had
                               no hover treatment at all before. The
                               permanent per-row SLA-health bar (`edge`, in
                               the first cell) stays exactly as it was; this
                               is a second, separate signal that only shows
                               on hover, same as every other Performance
                               table. `bg-transparent` keeps the row clean at
                               rest so the hover wash is the only thing that
                               ever paints it. */
                            <tr
                              key={queue.queue}
                              className="bg-transparent transition-colors duration-150 hover:bg-[rgba(254,215,170,0.22)] hover:shadow-[inset_3px_0_0_#ea580c]"
                            >
                              <td className="py-3 pl-2 text-left">
                                <span className="flex items-center gap-2.5">
                                  <span className={`h-8 w-[3px] shrink-0 rounded-full ${edge}`} />
                                  <span className="truncate text-sm font-semibold text-[#1A1A1A] dark:text-mcm-ink">
                                    {queue.queue}
                                  </span>
                                </span>
                              </td>
                              <td className="num py-3 text-right text-sm text-[#1A1A1A] dark:text-mcm-ink">
                                {queue.avgWait}s
                              </td>
                              <td className="num py-3 text-center text-sm font-semibold text-[#1A1A1A] dark:text-mcm-ink">
                                {queue.available}
                              </td>
                              {/* The percentage alone has to be read one row
                                  at a time; the bar underneath is comparable
                                  down the column at a glance, which is how a
                                  wallboard is actually scanned. Same colour
                                  as the row's edge, so the two agree. */}
                              <td className="py-3 pr-2 text-right align-middle">
                                <span className={`num text-sm font-bold ${slaClass}`}>
                                  {queue.sla}%
                                </span>
                                <span className="mt-1 ml-auto block h-[3px] w-12 overflow-hidden rounded-full bg-[rgba(225,200,165,0.45)] dark:bg-mcm-surface-3/45">
                                  <span
                                    className={`block h-full rounded-full ${edge}`}
                                    style={{
                                      width: `${Math.min(Math.max(Number(queue.sla) || 0, 0), 100)}%`,
                                    }}
                                  />
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-5 rounded-xl border border-dashed border-[rgba(225,200,165,0.6)] dark:border-mcm-line/60 py-6 text-center text-xs text-[#64748b] dark:text-mcm-ink-3">
                    No active queues
                  </p>
                )}
              </section>

              <section className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-[2px] w-6 rounded-full bg-[#ea580c]" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#475569] dark:text-mcm-ink-2">
                      Active Campaigns
                    </span>
                  </div>
                  {/* `#ea580c` measured 3.23:1 against this pill's own
                      `#FFF1EB` fill at 11px. */}
                  {activeCampaignsData.length > 0 && (
                    <span className="rounded-full bg-[#FFF1EB] px-2.5 py-1 text-[11px] font-bold text-[#a8460f] dark:text-mcm-accent-ink">
                      {activeCampaignsData.length} Live
                    </span>
                  )}
                </div>
                <h4 className="mt-2 text-xl font-bold tracking-tight text-[#1A1A1A] dark:text-mcm-ink">
                  Drive more conversations
                </h4>
                <p className="mt-1 text-xs text-[#475569] dark:text-mcm-ink-2">
                  Outbound campaign progress, live.
                </p>

                {activeCampaignsData.length > 0 ? (
                  /* `mt-1.5`, not `mt-5`: the rows below now keep their full
                     `py-3.5` on every row (see the note there), so the first
                     row already contributes 14px of its own above the list.
                     Trimming the container's margin by the same amount keeps
                     the gap under the subtitle exactly where it was. */
                  <div className="perf-thin-scroll mt-1.5 flex max-h-[300px] flex-col divide-y divide-[rgba(225,200,165,0.4)] overflow-y-auto">
                    {activeCampaignsData.map((campaign) => {
                      const reached =
                        campaign.dialed > 0
                          ? Math.min(Math.round((campaign.connected / campaign.dialed) * 100), 100)
                          : 0;
                      return (
                        <div
                          key={campaign.name}
                          /* Uniform `py-3.5` on every row, with no `first:pt-0
                             last:pb-0`. Those two trimmed the outer padding to
                             tighten the list against the panel edge, but the
                             hover wash paints the row box -- so the first row's
                             highlight sat flush against its text with 14px of
                             space only below it, and the last row's the other
                             way up. Every row hovered a different shape. The
                             list's outer spacing is handled on the container
                             instead, where it does not distort the rows.

                             `-mx-5`/`px-5`, not `-mx-2`/`px-2`: the wash was
                             only reaching a couple of pixels past the row's
                             own text, well short of the card's actual edges,
                             because it was undoing its own small buffer
                             rather than the parent `<section className="p-5">`'s
                             20px padding. Matching that padding is what lets
                             the highlight run the full width of the card. */
                          className="group -mx-5 rounded-xl px-5 py-3.5 transition-colors duration-150 hover:bg-[rgba(249,115,22,0.05)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2.5">
                              {/* `origin-left`: the dot's left edge sits exactly
                                  on the scroll container's clip edge, and that
                                  container clips horizontally whether it wants
                                  to or not — `overflow-y: auto` forces
                                  `overflow-x` to compute to `auto` rather than
                                  stay visible. Scaling from the centre grew the
                                  dot 1px past that edge and the browser sliced
                                  it off, so it read as half a dot on hover.
                                  Growing from the left keeps it inside. */}
                              <span className="h-2 w-2 shrink-0 origin-left rounded-full bg-[#ea580c] transition-transform duration-150 group-hover:scale-125" />
                              <span className="truncate text-sm font-semibold text-[#1A1A1A] dark:text-mcm-ink">
                                {campaign.name}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-start gap-5 text-right">
                              <span className="flex flex-col">
                                <span className="num text-sm font-bold text-[#1A1A1A] dark:text-mcm-ink">
                                  {campaign.connected}
                                </span>
                                <span className="text-[11px] uppercase tracking-wide text-[#475569] dark:text-mcm-ink-2">
                                  Connected
                                </span>
                              </span>
                              <span className="flex flex-col">
                                <span className="num text-sm font-bold text-[#ea580c]">
                                  {campaign.answerRate}%
                                </span>
                                <span className="text-[11px] uppercase tracking-wide text-[#475569] dark:text-mcm-ink-2">
                                  Connect rate
                                </span>
                              </span>
                            </span>
                          </div>
                          {/* The bar carried no label, so its width -- which is
                              connected over dialed -- was the one figure on this
                              card the reader had to guess at. Naming it costs a
                              line and makes the fill mean something. */}
                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(225,200,165,0.35)] dark:bg-mcm-surface-3/35">
                              <span
                                className="block h-full rounded-full bg-[#ea580c] transition-[width] duration-500"
                                style={{ width: `${reached}%` }}
                              />
                            </span>
                            <span className="num shrink-0 text-[11px] font-bold text-[#475569] dark:text-mcm-ink-2">
                              {reached}% reached
                            </span>
                          </div>
                          {/* Figures bold, captions plain: the row is scanned
                              for the numbers, not the words between them. */}
                          <p className="mt-2 text-[11px] text-[#475569] dark:text-mcm-ink-2">
                            Dialed <span className="num font-bold text-[#1A1A1A] dark:text-mcm-ink">
                              {campaign.dialed}
                            </span>
                            &nbsp;&middot;&nbsp; Conversions{' '}
                            <span className="num font-bold text-emerald-700">
                              {campaign.conversions}
                            </span>
                            &nbsp;&middot;&nbsp; Failed{' '}
                            <span className="num font-bold text-[#C0261F]">{campaign.failed}</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-5 rounded-xl border border-dashed border-[rgba(225,200,165,0.6)] dark:border-mcm-line/60 py-6 text-center text-xs text-[#64748b] dark:text-mcm-ink-3">
                    No active campaigns
                  </p>
                )}
              </section>

            </div>
          </div>

        <div className="mt-3 flex w-full  gap-4 xl:flex-row flex-col">

          <div className="flex w-full flex-col gap-3 xl:min-h-[1400px]">
            {/* 20px frosted-glass card standard (queues-theme.css/live-theme.css):
                #fffdfb, blur(20px), a 1px warm hairline border and the same
                single-layer rgba(160,95,30,0.14) shadow every Performance
                card uses — this and the roster card below it were still on
                an older 12px/rounded-xl recipe with a heavier three-layer
                shadow, the one structural gap left after the color-token
                pass. */}
            <div className="rounded-[20px] border border-[rgba(249,115,22,0.16)] bg-[#fffdfb] dark:bg-mcm-surface backdrop-blur-[20px] p-2.5 shadow-[0_10px_34px_rgba(160,95,30,0.14)] w-full">
              <div className="mb-2.5 flex items-center justify-between px-0.5">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#6b6459] dark:text-mcm-ink-3">
                  <UsersIcon className="h-4 w-4 text-primary" />
                  Live Agent Status
                </h4>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#4EAE6E]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4EAE6E] opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4EAE6E]" />
                  </span>
                  Live
                </span>
              </div>
              {/* An even grid rather than `flex flex-wrap`: wrapping sized every
                  tile to its own content, so eight tiles carrying one- to
                  three-character values ended up eight different widths with
                  the gaps between them reading as uneven. */}
              {/* `lg`, not `xl`: this project resets Tailwind's breakpoints
                  (index.css) and `xl` is 1500px here, so keying the eight-wide
                  row to it would have left a 1366px screen — the common one —
                  on two rows of four. */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                {liveStripStats.map((stat) => {
                  const StatIcon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="group relative flex items-center gap-2.5 overflow-hidden rounded-[16px] border border-[rgba(225,200,165,0.55)] dark:border-mcm-line/55 bg-[#fffdfb] dark:bg-mcm-surface px-3 py-2.5 shadow-[0_6px_18px_rgba(160,95,30,0.1)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[rgba(214,163,90,0.7)] hover:shadow-[0_12px_26px_-6px_rgba(154,78,30,0.28)]"
                    >
                      {/* Icon badge (#FFF1E0/#ea580c) and card hairline
                          (rgba(249,115,22,.14)) are the design system's own
                          standing tokens, always on — an all-neutral rest
                          state read as a plain white box, not a themed card.
                          The per-stat colour (bar tint, number, label) stays
                          held back until hover: at rest the eight numbers
                          read as one set: on hover the tile you are pointing
                          at is the only one whose value carries its own
                          colour. Those hover classes come from the stat
                          itself as whole literal strings
                          (`group-hover:text-[#4EAE6E]`) rather than being
                          assembled at runtime — Tailwind only emits a
                          utility it can actually see in the source, so the
                          `tone.replace('text-','bg-')` this used to do was
                          relying on those bar colours happening to be
                          generated by some other file. */}
                      <span
                        aria-hidden="true"
                        className={`absolute inset-y-0 left-0 w-[3px] bg-[#f97316]/25 transition-colors duration-200 ${stat.hoverBar}`}
                      />
                      {StatIcon ? (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF1E0] dark:bg-mcm-accent-wash transition-transform duration-200 group-hover:scale-105">
                          <StatIcon className="h-4 w-4 text-[#ea580c]" />
                        </div>
                      ) : null}
                      <div className="min-w-0 text-left">
                        {/* The tooltip sits on the value, not the label. Equal
                            columns give each label ~62px and "OCCUPANCY" needs
                            75px once an info icon shares its line — it was the
                            one label of the eight that truncated. Beside the
                            short value ("47%") it costs nothing, and it is
                            explaining that number anyway. */}
                        <p
                          className={`num flex items-center gap-1 text-lg font-bold leading-none tracking-tight text-[#2E2D35] dark:text-mcm-ink transition-colors duration-200 ${stat.hoverText}`}
                        >
                          {stat.value}
                          {stat.label === 'Occupancy' && (
                            <CustomTooltip
                              text="Calculated based on total agent and number of agents on the call"
                              side="top"
                            >
                              <Info className="h-3.5 w-3.5 shrink-0 text-[#6b6459] dark:text-mcm-ink-3 cursor-pointer" />
                            </CustomTooltip>
                          )}
                        </p>
                        <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wide text-[#475569] dark:text-mcm-ink-2">
                          {stat.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {canViewAgentRosterAndControls ? (
              <div className="sticky top-0 z-10 flex max-h-[calc(100vh-4rem)] flex-col rounded-[20px] overflow-hidden  border border-[rgba(249,115,22,0.16)] bg-[#fffdfb] dark:bg-mcm-surface backdrop-blur-[20px] shadow-[0_10px_34px_rgba(160,95,30,0.14)]">
                <div className="shrink-0 flex flex-wrap items-center justify-between border-b border-[#EEE7DD] dark:border-mcm-line bg-[#FBE2C8]/45 dark:bg-mcm-surface-3/45 px-3 py-2.5">
                  <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#6b6459] dark:text-mcm-ink-3">
                    <Headset className="h-4 w-4 text-primary" />
                    Agent Real-time Roster and Controls
                  </h4>
                  <div className="rounded-md border border-[rgba(214,163,90,0.55)] bg-[rgba(255,252,248,0.97)] dark:bg-mcm-surface/97 backdrop-blur-[12px] px-3 py-1.5 max-sm:w-full">
                    <p className="text-[11px] font-medium text-[#6b6459] dark:text-mcm-ink-3">
                      Top: {topCallsText} &nbsp; | &nbsp; Bottom: {bottomCallsText}
                    </p>
                  </div>
                </div>
                {/* {
                agents?.length ? <div className="lg:hidden p-2.5 space-y-2.5 max-h-190 overflow-auto">
                  {agents?.map((agent: any) => (
                    <div
                      key={`${agent?.extension}-mobile`}
                      className="rounded-lg border border-[#EEE7DD] dark:border-mcm-line bg-[#FBE2C8]/45 dark:bg-mcm-surface-3/45 p-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EEE7DD] dark:border-mcm-line bg-[#FBE2C8]/40 dark:bg-mcm-surface-3/40 text-[12px] font-semibold text-[#2E2D35] dark:text-mcm-ink">
                            {getInitials(agent.name)}
                          </div>
                          <div className="flex flex-col">
                            <p className="text-[13px] font-semibold text-[#2E2D35] dark:text-mcm-ink">{agent.name}</p>
                            <p className="flex items-center gap-1 text-[11px] font-medium text-[#6b6459] dark:text-mcm-ink-3">
                              <span className="h-2 w-2 rounded-full bg-green-500" />
                              Ext: {agent.ext}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`rounded-sm px-2 py-0.5 text-[11px] font-semibold tracking-wide ${statusPillClass[agent.status]}`}
                        >
                          {agent.status}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-[#6b6459] dark:text-mcm-ink-3">
                        <p className="flex items-center gap-1.5">
                          <Timer className="h-3.5 w-3.5 text-[#6b6459] dark:text-mcm-ink-3" />
                          {agent.timeInState}
                        </p>
                        <p className="truncate">{agent.queue}</p>
                        <p className="truncate">{agent.callerId}</p>
                        <p>
                          Calls: <span className="font-semibold text-[#2E2D35] dark:text-mcm-ink">{agent.calls}</span> |
                          AHT: <span className="font-semibold text-[#2E2D35] dark:text-mcm-ink">{agent.aht}</span>
                        </p>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 w-full rounded-full bg-ucass-active-bg">
                          <div
                            className={`h-1.5 rounded-full ${getBarColor(agent.utilization)}`}
                            style={{ width: `${agent.utilization}%` }}
                          />
                        </div>
                        <p className="text-[11px] font-semibold text-[#6b6459] dark:text-mcm-ink-3">
                          {agent.utilization}%
                        </p>
                      </div>

                      <div className="mt-2">
                        <ActionButtons />
                      </div>
                    </div>
                  ))}
                </div> : null
              } */}

                <div
                  ref={agentRosterScrollRef}
                  className="agent-roster-scroll block flex-1 min-h-0 overflow-auto overflow-x-auto lg:block"
                >
                  <Table className="min-w-245 xl:min-w-280">
                    <TableHeader className="sticky top-0 z-10">
                      <TableRow>
                        <TableHead>
                          Agent Info
                        </TableHead>
                        <TableHead className="lt-align-center">
                          Live Status
                        </TableHead>
                        <TableHead className="lt-align-right">
                          Time In State
                        </TableHead>
                        <TableHead>
                          Queue / Campaign
                        </TableHead>
                        <TableHead>
                          Caller ID
                        </TableHead>
                        <TableHead className="lt-align-center">
                          Utilization
                        </TableHead>
                        <TableHead>
                          Daily Stats
                        </TableHead>
                        <TableHead className="lt-align-center">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    {isLoadingAgentRoster && agents.length === 0 ? (
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={8} className="h-40">
                            <div className="flex items-center justify-center gap-2 text-sm text-[#6b6459] dark:text-mcm-ink-3">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              <span>Loading agents...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    ) : agents?.length > 0 ? (
                      <TableBody>
                        {agents?.map((agent: any, agentIndex: number) => (
                          <TableRow
                            key={agent?.extension}
                            className={`border-l-2 border-l-transparent transition-colors hover:border-l-primary/50 hover:bg-[#FBE2C8]/60 dark:hover:bg-mcm-surface-3/60 ${
                              agentIndex % 2 === 1 ? 'bg-[#FBF6EE]/40' : ''
                            }`}
                          >
                            <TableCell className="px-3 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#F2994A] to-[#C96F1F] text-[12px] font-semibold text-white shadow-sm">
                                  {getInitials(`${agent?.first_name} ${agent?.last_name}`)}
                                </div>
                                <div className="flex flex-col">
                                  <p className="text-[13px] font-semibold text-[#2E2D35] dark:text-mcm-ink">
                                    {agent?.first_name || ''} {agent?.last_name || ''}
                                  </p>
                                  <p className="flex items-center gap-1 text-[11px] font-medium text-[#6b6459] dark:text-mcm-ink-3">
                                    <span className="inline-flex items-center justify-center">
                                      {statusImageLookup[getAgentPresenceStatus(agent)] ||
                                        statusImageLookup.offline}
                                    </span>
                                    Ext: {agent?.extension || ''}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="lt-align-center px-3 py-2.5">
                              {(() => {
                                const status = getAgentStatus(agent);
                                return (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${statusPillClass[status]}`}
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                    {status}
                                  </span>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="lt-align-right px-3 py-2.5">
                              <p className="flex items-center justify-end gap-1.5 text-xs font-medium text-[#2E2D35] dark:text-mcm-ink">
                                <Timer className="h-3.5 w-3.5 text-[#6b6459] dark:text-mcm-ink-3" />
                                {(() => {
                                  const liveCall = getLiveCallForAgent(agent);
                                  const timestamp = getMonitoringCallTimestamp(liveCall, agent);
                                  return formatCallDuration(timestamp);
                                })()}
                              </p>
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-xs font-medium text-[#2E2D35] dark:text-mcm-ink">
                              {(() => {
                                const liveCall = getLiveCallForAgent(agent);
                                if (!liveCall) return '--';

                                return (
                                  <div className="flex min-w-[140px] flex-col gap-1">
                                    {/* <p className="truncate">
                                      {getQueueOrCampaignName(liveCall?.forward_value)}
                                    </p> */}
                                    <CallPathCell call={liveCall} onOpen={setSelectedCallPath} />
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-xs font-medium text-[#6b6459] dark:text-mcm-ink-3">
                              {(() => {
                                const liveCall = getLiveCallForAgent(agent);
                                const direction = String(liveCall?.direction || '')
                                  .trim()
                                  .toLowerCase();
                                if (direction === 'local') return '--';
                                return liveCall?.caller_number
                                  ? formatIndianPhone(liveCall.caller_number)
                                  : '--';
                              })()}
                            </TableCell>
                            <TableCell className="lt-align-center px-3 py-2.5">
                              {(() => {
                                const utilizationPercent = getCampaignUtilizationPercent(
                                  String(agent?.extension || ''),
                                );
                                return (
                                  <div className="flex min-w-[130px] items-center gap-2">
                                    <LinearProgress
                                      color={getBarColor(utilizationPercent)}
                                      outOfValue={100}
                                      taskDoneValue={utilizationPercent}
                                      className="bg-[#F0DFC5] dark:bg-mcm-surface-3"
                                    />
                                    <p className="text-[11px] font-bold text-[#2E2D35] dark:text-mcm-ink">
                                      {formatUtilizationPercent(utilizationPercent)}
                                    </p>
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="px-3 py-2.5">
                              <div className="flex flex-col text-[11px] leading-5 text-[#6b6459] dark:text-mcm-ink-3">
                                {(() => {
                                  const agentStats = getCampaignAgentStats(
                                    String(agent?.extension || ''),
                                  );
                                  return (
                                    <>
                                      <span>
                                        Calls:{' '}
                                        <span className="font-semibold text-[#2E2D35] dark:text-mcm-ink">
                                          {agentStats?.total_calls ?? '--'}
                                        </span>
                                      </span>
                                      <span>
                                        AHT:{' '}
                                        <span className="font-semibold text-[#2E2D35] dark:text-mcm-ink">
                                          {formatAht(agentStats?.avg_handle_time)}
                                        </span>
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="lt-align-center px-3 py-2.5">
                              {(() => {
                                const liveCallForThisAgent = getLiveCallForAgent(agent);
                                const monitorTargetCallId =
                                  getMonitorTargetCallId(liveCallForThisAgent);
                                const normalizedMonitorTargetCallId =
                                  normalizeMonitorDialValue(monitorTargetCallId);
                                const hasPendingMonitorAction = Boolean(
                                  pendingMonitorActions?.[normalizedMonitorTargetCallId],
                                );
                                const hasActiveMonitorSession = hasActiveMonitorSessionForCall(
                                  normalizedMonitorTargetCallId,
                                );
                                const isMonitoringActionLocked =
                                  hasPendingMonitorAction || hasActiveMonitorSession;

                                const amIOnCall = filteredActiveCalls?.some((call: any) =>
                                  isMonitoringCallForMember(call, user?.user_info?.extension),
                                );
                                const isAdminAction = false;
                                //  || AdminActions.some((item) =>
                                //   activeCallSessionData?._number?.includes(item.value),
                                // );
                                const monitoringCallJoined = amIOnCall || isAdminAction;
                                return (
                                  <ActionButtons
                                    call={liveCallForThisAgent}
                                    monitoringCallJoined={monitoringCallJoined}
                                    isMonitoringActionLocked={isMonitoringActionLocked}
                                    monitoringAccessActions={monitoringAccessActions}
                                    handleActionClick={handleActionClick}
                                    handleHangupClick={terminateCallSession}
                                    hasAnyActiveCallSession={hasAnyActiveCallSession}
                                  />
                                );
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    ) : null}
                  </Table>
                  {isFetchingNextAgentPage ? (
                    <div className="flex items-center justify-center py-3 text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : null}
                  <div ref={agentRosterLoadMoreRef} className="h-px" />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <Dialog
        open={Boolean(selectedCallListMetric)}
        onOpenChange={(open) => {
          if (!open) setSelectedCallListMetric(null);
        }}
      >
        {/* 20px frosted-glass card standard (queues-theme.css/live-theme.css),
            same as every other card on this board — the drill-in dialog was
            the one surface still on the shared component's plain default
            (`bg-background`, `rounded-xl`, generic border). The close
            button is baked into the shared `DialogContent` (`dialog.tsx`),
            not something this file owns, so it's restyled per-instance via
            its stable `data-slot="dialog-close"` hook rather than editing
            the shared component (which every other dialog in the app also
            renders through) — a clean 32px warm circular pill instead of
            the default's small square glyph. */}
        <DialogContent className="md:max-w-[1260px] xl:max-w-[1366px] gap-0 overflow-hidden rounded-[20px] border-[rgba(249,115,22,0.16)] bg-[#fffdfb] p-0 shadow-[0_10px_34px_rgba(160,95,30,0.14)] dark:bg-mcm-surface [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:flex [&_[data-slot=dialog-close]]:h-8 [&_[data-slot=dialog-close]]:w-8 [&_[data-slot=dialog-close]]:items-center [&_[data-slot=dialog-close]]:justify-center [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:border [&_[data-slot=dialog-close]]:border-[rgba(249,115,22,0.25)] [&_[data-slot=dialog-close]]:bg-[#fff7ed] [&_[data-slot=dialog-close]]:text-[#ea580c] [&_[data-slot=dialog-close]]:opacity-100 [&_[data-slot=dialog-close]]:shadow-sm [&_[data-slot=dialog-close]]:transition-colors [&_[data-slot=dialog-close]]:hover:bg-[#fed7aa]">
          <DialogHeader className="border-b border-[rgba(242,153,74,0.2)] px-5 py-4">
            <DialogTitle className="text-base font-semibold text-[#1A1A1A] dark:text-mcm-ink">
              {selectedCallListMetric?.label || 'Call'}{' '}
              {isSelectedCallbackTaskMetric ? 'tasks' : 'records'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#64748b] dark:text-mcm-ink-3">
              {isSelectedCallbackTaskMetric
                ? 'Showing callback tasks from the calendar task list.'
                : 'Showing records from today using the phone call list report.'}
            </DialogDescription>
          </DialogHeader>
          <div className="dashboard-modal-horizontal-scroll p-4">
            {/* The floor these min-widths set is the point below which the
                columns would cram, not a fixed table width. The call list's
                was 1280px, wider than the table actually needs (~1224px at
                the dialog's own width) — so the drill-in always overflowed
                its dialog by a few dozen pixels and carried a horizontal
                scrollbar that bought nothing. 1000px is where this table
                genuinely stops shrinking (min-content is 994px), so it now
                fills the dialog when there is room and scrolls only when
                the viewport is too narrow to hold it. */}
            <div
              className={
                isSelectedCallbackTaskMetric
                  ? 'min-w-[1050px]'
                  : selectedCallListMetric?.callListKey
                    ? 'min-w-[1000px]'
                    : ''
              }
            >
              {isSelectedCallbackTaskMetric ? (
                <TableManager
                  columns={dashboardCallbackTaskColumns}
                  fetcherKey="dashboard-callback-task-list"
                  fetcherFn={calendarMeetingList}
                  enabled={Boolean(selectedCallListMetric)}
                  extraParams={{
                    filters: [
                      { key: 'source', value: 'CALLBACK' },
                      { key: 'from', value: selectedCallListDate.from },
                      { key: 'to', value: selectedCallListDate.to },
                    ],
                  }}
                  getRowClassName={(row: any) => {
                    const isNotCompleted = row.original?.status?.toUpperCase() !== 'COMPLETED';
                    if (isNotCompleted) {
                      return 'bg-ucass-active-bg/50 hover:bg-ucass-active-bg/50 transition-colors';
                    }
                    return 'hover:bg-[rgba(254,215,170,0.22)] transition-colors';
                  }}
                  tableMaxHeight="52vh"
                  customClass="rounded-lg"
                  emptyTablePlaceholder="No callback tasks found"
                  descriptionEmptyTable="No callback tasks matched this dashboard metric."
                />
              ) : selectedCallListMetric?.callListKey ? (
                <CallHistory
                  key={`dashboard-call-history-${selectedCallListMetric.callListKey}`}
                  embedded
                  tableOnly
                  fetcherKey={`dashboard-call-history-${selectedCallListMetric.callListKey}`}
                  initialActiveTab={selectedCallHistoryConfig?.activeTab}
                  initialFilters={selectedCallHistoryConfig?.filters}
                  initialDateFilter={selectedCallListDate}
                  tableMaxHeight="52vh"
                  tableCustomClass="rounded-lg"
                />
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <CallPathDialog call={selectedCallPath} onClose={() => setSelectedCallPath(null)} />
    </div>
  );
};

export default LiveDashboard;
