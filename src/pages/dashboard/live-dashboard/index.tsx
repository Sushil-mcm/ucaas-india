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
  Bot,
  Clock3,
  Gauge,
  Headset,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Timer,
  RefreshCw,
  Ear,
  MicIcon,
  UsersIcon,
  Info,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
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

type MetricTone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary';
type Trend = 'up' | 'down' | 'flat';
type DashboardCallListKey = 'total' | 'inbound' | 'outbound' | 'missed';
type DashboardTaskListKey = 'callbacks';

type MetricCard = {
  label: string;
  value: string;
  icon: any;
  trend: Trend;
  tone: MetricTone;
  callListKey?: DashboardCallListKey;
  taskListKey?: DashboardTaskListKey;
};

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

const toneClasses: Record<MetricTone, string> = {
  neutral: 'text-gray-900',
  success: 'text-green-600',
  warning: 'text-amber-600',
  danger: 'text-red-500',
  primary: 'text-primary',
};

const statusPillClass: Record<AgentStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-700 border border-green-200',
  'ON CALL': 'bg-ucass-active-bg text-ucass-active border border-ucass-active-bg',
  RINGING: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  'WRAP UP': 'bg-amber-100 text-amber-700 border border-amber-200',
  'ON HOLD': 'bg-red-100 text-red-700 border border-red-200',
  OFFLINE: 'bg-gray-100 text-gray-400 border border-gray-200',
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

const getBarColor = (value: number) => {
  if (value >= 80) return 'bg-green-500';
  if (value >= 60) return 'bg-amber-500';
  return 'bg-red-500';
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part?.[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

const normalizePresenceStatus = (status?: string) => {
  const normalizedStatus = String(status || '')
    .trim()
    .toLowerCase();

  if (normalizedStatus === 'busy') return 'busy';
  if (['dnd', 'do_not_disturb', 'do-not-disturb'].includes(normalizedStatus)) return 'dnd';
  if (['online', 'available', 'ready', 'idle'].includes(normalizedStatus)) return 'online';
  return 'offline';
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

  if (isButtonDisabled) return <span className="text-xs text-gray-400">---</span>;

  const actionButtonClass =
    'cursor-pointer flex items-center justify-center min-h-8 min-w-8 max-w-8 max-h-8 rounded-lg w-8 h-8 bg-white border border-primary text-primary hover:bg-primary hover:text-white';

  return (
    <div className="flex items-center gap-2">
      {monitoringAccessActions?.listen && (
        <CustomTooltip text="Listen" side="top">
          <button
            type="button"
            onClick={() => handleActionClick('*87', call)}
            className={actionButtonClass}
          >
            <Ear className="w-4 h-4" />
          </button>
        </CustomTooltip>
      )}
      {monitoringAccessActions?.whisper && (
        <CustomTooltip text="Whisper" side="top">
          <button
            type="button"
            onClick={() => handleActionClick('*86', call)}
            className={actionButtonClass}
          >
            <MicIcon className="w-4 h-4" />
          </button>
        </CustomTooltip>
      )}
      {monitoringAccessActions?.barge && (
        <CustomTooltip text="Barge" side="top">
          <button
            type="button"
            onClick={() => handleActionClick('*88', call)}
            className={actionButtonClass}
          >
            <UsersIcon className="w-4 h-4" />
          </button>
        </CustomTooltip>
      )}
      {monitoringAccessActions?.intercept && (
        <CustomTooltip text="Intercept" side="top">
          <button
            type="button"
            onClick={() => handleActionClick('*89', call)}
            className={actionButtonClass}
          >
            <CallIntersection className="w-5 h-5" />
          </button>
        </CustomTooltip>
      )}
      {monitoringAccessActions?.hangup && (
        <CustomTooltip text="Hangup" side="top">
          <button
            type="button"
            onClick={() => handleHangupClick(call)}
            className={actionButtonClass}
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
    if (user?.sip_credentials?.domain && isSocketConnected) {
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

  const getAgentPresenceStatus = (agent: any) => {
    const agentExt = String(agent?.extension || agent?.ext || '');
    if (!agentExt) return 'offline';

    const liveCallForAgent = getLiveCallForAgent(agent);
    const isOnCall =
      Boolean(liveCallForAgent) ||
      Boolean(usersOnlineStatus?.find((u: any) => String(u?.userId) === agentExt)?.onCall);

    if (isOnCall) return 'call';

    const presence = usersOnlineStatus?.find((u: any) => String(u?.userId) === agentExt);
    if (!presence?.online) return 'offline';

    return normalizePresenceStatus(presence?.status);
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

  const formatAht = (val: any) => {
    const n = Number(val);
    return Number.isFinite(n) ? `${n.toFixed(2)}s` : '--';
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
              <span className="text-xs text-slate-600">
                {moment(createdAt).format('MMM DD, YYYY')}
              </span>
              <span className="text-[10px] uppercase text-slate-500">
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
          <span className="inline-block max-w-52 truncate text-xs font-medium text-slate-900">
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
              <span className="text-xs font-medium text-slate-700">
                {moment(startTime).format('MMM DD, YYYY')}
              </span>
              <span className="text-[10px] uppercase text-slate-500">
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
          <span className="text-xs capitalize text-slate-600">
            {String(row.original?.source || '--').toLowerCase()}
          </span>
        ),
      },
      {
        header: 'Contact',
        accessorKey: 'details.contactPhone',
        cell: ({ row }: any) => {
          const contactPhone = getCallbackTaskContactPhone(row.original);
          if (!contactPhone) return <span className="text-xs text-slate-400">--</span>;

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
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
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
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-60'
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
      color: 'bg-ucass-active',
    },
    {
      label: 'Assigned Agent',
      value: Number(campaignCallFlowFunnel?.assigned_agent_percent || 0),
      count: Number(campaignCallFlowFunnel?.assigned_agent_count || 0),
      color: 'bg-green-500',
    },
  ];

  const dashboardMetrics: MetricCard[] = [
    {
      label: 'Total Today',
      value: String(totalCalls),
      icon: PhoneCall,
      trend: 'flat',
      tone: 'neutral',
      callListKey: 'total',
    },
    {
      label: 'Inbound',
      value: String(inboundCalls),
      icon: PhoneIncoming,
      trend: 'flat',
      tone: 'primary',
      callListKey: 'inbound',
    },
    {
      label: 'Outbound',
      value: String(outboundCalls),
      icon: PhoneOutgoing,
      trend: 'flat',
      tone: 'neutral',
      callListKey: 'outbound',
    },
    {
      label: 'Active Calls',
      value: String(agentsOnCall),
      icon: Activity,
      trend: 'flat',
      tone: 'success',
    },
    {
      label: 'Calls Waiting',
      value: String(
        liveCallsData?.filter((c: any) => ['ringing', 'connecting', 'waiting'].includes(c.status))
          .length || 0,
      ),
      icon: Timer,
      trend: 'flat',
      tone: 'warning',
    },
    {
      label: 'In IVR',
      value: String(summary?.ivr_call || 0),
      icon: Bot,
      trend: 'flat',
      tone: 'neutral',
    },
    {
      label: 'Abandoned',
      value: `${summary?.abandoned_in_call_percent || 0}%`,
      icon: AlertTriangle,
      trend: 'flat',
      tone: 'danger',
    },
    {
      label: 'Missed',
      value: String(missedCalls),
      icon: AlertTriangle,
      trend: 'flat',
      tone: 'danger',
      callListKey: 'missed',
    },
    {
      label: 'Callbacks',
      value: String(summary?.callback_count || 0),
      icon: Headset,
      trend: 'flat',
      tone: 'warning',
      taskListKey: 'callbacks',
    },
    {
      label: `Service Level (${summary?.answered_within_20_sec || 0}/20)`,
      value: `${summary?.service_level_percent || 0}%`,
      icon: Gauge,
      trend: 'flat',
      tone: 'success',
    },
    {
      label: 'Avg Speed Answer',
      value: formatSecs(summary?.avg_speed_answer),
      icon: Clock3,
      trend: 'flat',
      tone: 'primary',
    },
    {
      label: 'Avg Handle Time',
      value: formatSecs(summary?.avg_handle_time),
      icon: Timer,
      trend: 'flat',
      tone: 'neutral',
    },
    {
      label: 'Avg Talk Time',
      value: formatSecs(summary?.avg_talk_time),
      icon: PhoneCall,
      trend: 'flat',
      tone: 'neutral',
    },
    {
      label: 'Avg Hold Time',
      value: formatSecs(summary?.avg_hold_time),
      icon: Clock3,
      trend: 'flat',
      tone: 'warning',
    },
    {
      label: 'Avg Wrap-up',
      value: formatSecs(summary?.avg_wrap_time_sec),
      icon: Activity,
      trend: 'flat',
      tone: 'neutral',
    },
    {
      label: 'Max Wait Time',
      value: formatSecs(summary?.max_wait_time),
      icon: AlertTriangle,
      trend: 'flat',
      tone: 'danger',
    },
    {
      label: 'Longest Active',
      value: formatSecs(summary?.longest_active),
      icon: Timer,
      trend: 'flat',
      tone: 'warning',
    },
  ];

  const liveStripStats = [
    {
      label: 'Logged In',
      value: String(usersOnlineStatus?.filter((u: any) => u.online).length || 0),
      tone: 'text-gray-800',
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
      tone: 'text-green-600',
    },
    {
      label: 'On Call',
      value: String(agentsOnCall),
      tone: 'text-ucass-active',
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
      tone: 'text-indigo-600',
    },
    {
      label: 'Wrap Up',
      value: '0',
      tone: 'text-amber-600',
    },
    {
      label: 'On Hold',
      value: String(
        liveCallsData?.filter((c: any) => c.status === 'hold' || c.type === 'call-hold')?.length ||
          callLogSummary?.hold_calls ||
          0,
      ),
      tone: 'text-red-500',
    },
    // {
    //   label: 'Aux Break',
    //   value: '0',
    //   tone: 'text-gray-600',
    // },
    {
      label: 'Offline',
      value: String(
        Math.max(
          0,
          (agents?.length || 0) - (usersOnlineStatus?.filter((u: any) => u.online).length || 0),
        ),
      ),
      tone: 'text-gray-500',
    },
    {
      label: 'Occupancy',
      value: agents?.length
        ? `${Math.round(((liveCallsData?.length || 0) / agents.length) * 100)}%`
        : '0%',
      tone: 'text-green-700',
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
    <div className="h-full overflow-auto bg-gray-100/35 p-3">
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

      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">Agent Performance Overview</h3>
        <Button
          onClick={handleRefreshCampaignStats}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-6 xl:grid-cols-9">
        {dashboardMetrics.map((item) => {
          const IconComp = item.icon;
          const isClickableMetric = Boolean(item.callListKey || item.taskListKey);
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
              className={`rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-xs hover:bg-green-50 hover:border-green-300 hover:text-green-700 justify-between flex-col flex ${
                isClickableMetric
                  ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30'
                  : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  {item.label}
                </p>
                <IconComp className={`h-3.5 w-3.5 ${toneClasses[item.tone]}`} />
              </div>
              <div className="mt-1 flex items-end gap-1.5">
                <span className="v num">{item.value}</span>
                {item.trend === 'up' && <ArrowUp className="mb-1 h-3.5 w-3.5 text-green-500" />}
                {item.trend === 'down' && <ArrowDown className="mb-1 h-3.5 w-3.5 text-red-500" />}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mx-auto flex w-full max-w-[1880px] flex-col mt-3">
        <div className="flex w-full  gap-4 xl:flex-row flex-col">
          <div className="flex w-full flex-col sm:flex-row xl:flex-col gap-3 sm:max-w-full  xl:max-w-96 min-w-72">
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xs w-full">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Call Flow Funnel (Live)
              </h4>
              <div className="mt-3 flex flex-col gap-3">
                {funnelData.map((item) => (
                  <div key={item.label} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">{item.label}</span>
                      <span className="text-gray-500">
                        {item.value}% - {item.count}
                      </span>
                    </div>
                    <LinearProgress
                      color={item.color}
                      outOfValue={100}
                      taskDoneValue={item.value}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xs w-full">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Queue Status
              </h4>
              <div className="mt-3 space-y-2.5 max-h-86 overflow-auto">
                {queueStatusData.length > 0 ? (
                  queueStatusData.map((queue) => {
                    const slaValue = typeof queue.sla === 'number' ? queue.sla : 0;
                    return (
                      <div
                        key={queue?.queue}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-gray-900">{queue?.queue}</p>
                          <p className="text-xs font-semibold text-amber-600">
                            {queue?.total || 0}
                          </p>
                        </div>
                        <div className="mt-2 flex justify-between gap-2 text-[11px] text-gray-600 w-full">
                          <p className="flex flex-col justify-center items-center text-center ">
                            Avg Wait{' '}
                            <span className="font-medium text-primary">{queue?.avgWait}</span>
                          </p>
                          <p className="flex flex-col justify-center items-center text-center ">
                            Available{' '}
                            <span className="font-medium text-green-600">{queue?.available}</span>
                          </p>
                          <p className=" flex flex-col justify-center items-center text-right ">
                            SLA{' '}
                            <span className="font-medium text-green-600">{queue?.sla || 0}</span>
                          </p>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
                          <div
                            className={`h-1.5 rounded-full ${getBarColor(slaValue)}`}
                            style={{ width: `${slaValue}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-center">
                    <p className="text-xs font-medium text-gray-500">No record</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xs w-full">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Active Campaigns
              </h4>
              <div className="mt-2 space-y-2 min-h-40 max-h-64 overflow-y-auto pr-1">
                {activeCampaignsData.length > 0 ? (
                  activeCampaignsData.map((campaign) => (
                    <div
                      key={campaign.name}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-2.5"
                    >
                      <p className="text-xs font-semibold text-primary">{campaign.name}</p>
                      <div className="mt-2 grid grid-cols-2 gap-y-1 text-[11px] text-gray-600">
                        <p>Dialed: {campaign.dialed}</p>
                        <p>Connected: {campaign.connected}</p>
                        <p>Answered %: {campaign.answerRate}</p>
                        <p>Failed: {campaign.failed}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-center">
                    <p className="text-xs font-medium text-gray-500">No record</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-xs w-full">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-9">
                {liveStripStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-center"
                  >
                    <p className={`text-lg font-semibold leading-none ${stat.tone}`}>
                      {stat.value}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 flex items-center justify-center gap-1">
                      <span>{stat.label}</span>
                      {stat.label === 'Occupancy' && (
                        <CustomTooltip
                          text="Calculated based on total agent and number of agents on the call"
                          side="top"
                        >
                          <Info className="h-3.5 w-3.5 text-gray-400 cursor-pointer" />
                        </CustomTooltip>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {canViewAgentRosterAndControls ? (
              <div className="rounded-xl overflow-hidden  border border-gray-200 bg-white shadow-xs">
                <div className="flex flex-wrap items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2.5">
                  <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                    <Headset className="h-4 w-4 text-primary" />
                    Agent Real-time Roster and Controls
                  </h4>
                  <div className="rounded-md border border-gray-200 bg-white px-3 py-1.5 max-sm:w-full">
                    <p className="text-[11px] font-medium text-gray-500">
                      Top: {topCallsText} &nbsp; | &nbsp; Bottom: {bottomCallsText}
                    </p>
                  </div>
                </div>
                {/* {
                agents?.length ? <div className="lg:hidden p-2.5 space-y-2.5 max-h-190 overflow-auto">
                  {agents?.map((agent: any) => (
                    <div
                      key={`${agent?.extension}-mobile`}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-[12px] font-semibold text-gray-700">
                            {getInitials(agent.name)}
                          </div>
                          <div className="flex flex-col">
                            <p className="text-[13px] font-semibold text-gray-900">{agent.name}</p>
                            <p className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
                              <span className="h-2 w-2 rounded-full bg-green-500" />
                              Ext: {agent.ext}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold tracking-wide ${statusPillClass[agent.status]}`}
                        >
                          {agent.status}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                        <p className="flex items-center gap-1.5">
                          <Timer className="h-3.5 w-3.5 text-gray-400" />
                          {agent.timeInState}
                        </p>
                        <p className="truncate">{agent.queue}</p>
                        <p className="truncate">{agent.callerId}</p>
                        <p>
                          Calls: <span className="font-semibold text-gray-700">{agent.calls}</span> |
                          AHT: <span className="font-semibold text-gray-700">{agent.aht}</span>
                        </p>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 w-full rounded-full bg-ucass-active-bg">
                          <div
                            className={`h-1.5 rounded-full ${getBarColor(agent.utilization)}`}
                            style={{ width: `${agent.utilization}%` }}
                          />
                        </div>
                        <p className="text-[11px] font-semibold text-gray-500">
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
                  className="block max-h-190 overflow-auto overflow-x-auto lg:block"
                >
                  <Table className="min-w-245 xl:min-w-280">
                    <TableHeader className="sticky top-0 z-10 bg-gray-50">
                      <TableRow>
                        <TableHead className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Agent Info
                        </TableHead>
                        <TableHead className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Live Status
                        </TableHead>
                        <TableHead className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Time In State
                        </TableHead>
                        <TableHead className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Queue / Campaign
                        </TableHead>
                        <TableHead className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Caller ID
                        </TableHead>
                        <TableHead className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Utilization
                        </TableHead>
                        <TableHead className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Daily Stats
                        </TableHead>
                        <TableHead className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    {isLoadingAgentRoster && agents.length === 0 ? (
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={8} className="h-40">
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              <span>Loading agents...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    ) : agents?.length > 0 ? (
                      <TableBody>
                        {agents?.map((agent: any) => (
                          <TableRow key={agent?.extension} className="hover:bg-gray-50/80">
                            <TableCell className="px-3 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-[12px] font-semibold text-gray-700">
                                  {getInitials(`${agent?.first_name} ${agent?.last_name}`)}
                                </div>
                                <div className="flex flex-col">
                                  <p className="text-[13px] font-semibold text-gray-900">
                                    {agent?.first_name || ''} {agent?.last_name || ''}
                                  </p>
                                  <p className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
                                    <span className="inline-flex items-center justify-center">
                                      {statusImageLookup[getAgentPresenceStatus(agent)] ||
                                        statusImageLookup.offline}
                                    </span>
                                    Ext: {agent?.extension || ''}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-2.5">
                              {(() => {
                                const status = getAgentStatus(agent);
                                return (
                                  <span
                                    className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold tracking-wide ${statusPillClass[status]}`}
                                  >
                                    {status}
                                  </span>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="px-3 py-2.5">
                              <p className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                                <Timer className="h-3.5 w-3.5 text-gray-400" />
                                {(() => {
                                  const liveCall = getLiveCallForAgent(agent);
                                  const timestamp = getMonitoringCallTimestamp(liveCall, agent);
                                  return formatCallDuration(timestamp);
                                })()}
                              </p>
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-xs font-medium text-gray-700">
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
                            <TableCell className="px-3 py-2.5 text-xs font-medium text-gray-500">
                              {(() => {
                                const liveCall = getLiveCallForAgent(agent);
                                const direction = String(liveCall?.direction || '')
                                  .trim()
                                  .toLowerCase();
                                if (direction === 'local') return '--';
                                return liveCall?.caller_number || '--';
                              })()}
                            </TableCell>
                            <TableCell className="px-3 py-2.5">
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
                                    />
                                    <p className="text-[11px] font-semibold text-gray-500">
                                      {formatUtilizationPercent(utilizationPercent)}
                                    </p>
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="px-3 py-2.5">
                              <div className="flex flex-col text-[11px] leading-5 text-gray-500">
                                {(() => {
                                  const agentStats = getCampaignAgentStats(
                                    String(agent?.extension || ''),
                                  );
                                  return (
                                    <>
                                      <span>
                                        Calls:{' '}
                                        <span className="font-semibold text-gray-700">
                                          {agentStats?.total_calls ?? '--'}
                                        </span>
                                      </span>
                                      <span>
                                        AHT:{' '}
                                        <span className="font-semibold text-gray-700">
                                          {formatAht(agentStats?.avg_handle_time)}
                                        </span>
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-2.5">
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
        <DialogContent className="md:max-w-[1260px] xl:max-w-[1366px] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-gray-200 px-5 py-4">
            <DialogTitle className="text-base font-semibold text-gray-900">
              {selectedCallListMetric?.label || 'Call'}{' '}
              {isSelectedCallbackTaskMetric ? 'tasks' : 'records'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {isSelectedCallbackTaskMetric
                ? 'Showing callback tasks from the calendar task list.'
                : 'Showing records from today using the phone call list report.'}
            </DialogDescription>
          </DialogHeader>
          <div className="dashboard-modal-horizontal-scroll p-4">
            <div
              className={
                isSelectedCallbackTaskMetric
                  ? 'min-w-[1050px]'
                  : selectedCallListMetric?.callListKey
                    ? 'min-w-[1280px]'
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
                    return 'hover:bg-slate-50/80 transition-colors';
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
