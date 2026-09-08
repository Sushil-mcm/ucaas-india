import { CallIntersection, ImPhoneHangUp } from '@/assets/icons';
import { Icon } from '@/assets/icons/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomTooltip from '@/components/custom/custom-tooltip';
import GroupedAvatar from '@/components/custom/grouped-avatar';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { capitalizeFirstLetter, handleAlert } from '@/lib/utils';
import {
  MONITOR_ACTION_LABELS,
  getMonitorTargetCallId,
  isDialpadMonitoringSessionActiveForCall,
  normalizeMonitorDialValue,
} from '@/lib/monitoring-actions';
import { ColumnDef } from '@tanstack/react-table';
import { useDialpad } from '@/hooks/use-dialpad';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ear, MicIcon, UsersIcon } from 'lucide-react';
import { CallPathCell, CallPathDialog } from '../call-path-cell';
import { MonitoringTopbarSlot } from '../topbar';
import LiveCallList from '../live-call-list';
import { useUsersDirectory } from '@/hooks/use-users-directory';
import { getUserNameByExtension } from '@/lib/extension-utility';

/* How long a caller may wait before the row escalates. Waiting is the only
   state where elapsed time is itself a problem, so these apply to it alone —
   a connected call runs as long as it needs to. */
const WAIT_WARNING_MS = 60 * 1000;
const WAIT_CRITICAL_MS = 3 * 60 * 1000;

const STATE_TYPE_NAME = {
  answered: 'Connected',
  bridged: 'Connected',
  on_hold: 'On Hold',
  early: 'Ringing',
  ringing: 'Ringing',
  trying: 'Trying',
  started: 'Started',
  waiting: 'Waiting',
};

type ConferenceMember = {
  name?: string;
  username?: string;
  number?: string;
  extension?: string;
  profile?: string;
  avatar?: string;
  joined?: string | number | null;
  joined_at?: string | number | null;
  joinedAt?: string | number | null;
  start_time?: string | number | null;
  left?: string | null;
};

const getConferenceMembers = (call: any): ConferenceMember[] => {
  if (Array.isArray(call?.conference_members)) return call.conference_members;
  if (Array.isArray(call?.conferenceData?.conference_members)) {
    return call.conferenceData.conference_members;
  }
  return [];
};

const getActiveConferenceMembers = (call: any): ConferenceMember[] =>
  getConferenceMembers(call).filter((member) => !member?.left);

const getConferenceMemberDisplayName = (member: ConferenceMember) =>
  `${member?.name || member?.username || ''}`.trim() ||
  `${member?.number || member?.extension || ''}`.trim() ||
  'Unknown Member';

const getConferenceMemberDialTarget = (member: ConferenceMember) =>
  String(member?.extension || member?.number || '').trim();

const parseTimestampMs = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }

  const rawValue = String(value || '').trim();
  if (!rawValue) return null;

  if (/^\d+(\.\d+)?$/.test(rawValue)) {
    const parsedNumeric = Number(rawValue);
    if (!Number.isFinite(parsedNumeric)) return null;
    return parsedNumeric < 1_000_000_000_000 ? parsedNumeric * 1000 : parsedNumeric;
  }

  const parsedDateMs = Date.parse(rawValue);
  if (!Number.isFinite(parsedDateMs)) return null;
  return parsedDateMs;
};

const getFirstValidTimestampMs = (...values: unknown[]): number | null => {
  for (const value of values) {
    const parsedTimestamp = parseTimestampMs(value);
    if (parsedTimestamp !== null) return parsedTimestamp;
  }

  return null;
};

const getConferenceMemberJoinedAtMs = (member: ConferenceMember): number | null =>
  getFirstValidTimestampMs(member?.joined, member?.joined_at, member?.joinedAt, member?.start_time);

const getCallDurationStartedAtMs = (call: any): number | null =>
  getFirstValidTimestampMs(
    call?.answered_time,
    call?.answered_at,
    call?.bridged_at,
    call?.start_time,
    call?.started_at,
  );

const normalizeRowIdPart = (value: unknown): string =>
  String(value ?? '')
    .replace(/\s+/g, '')
    .trim();

const getAllCallsRowId = (call: any, index: number): string => {
  const primaryId =
    call?.b_leg_uuid ||
    call?.leg_uuid ||
    call?.member_uuid ||
    call?.sip_call_id ||
    call?.sipCallId ||
    call?.SipCallID ||
    call?.conference_id ||
    call?.confID ||
    call?.call_uuid ||
    call?.uuid ||
    'call';
  const disambiguator = [
    call?.direction,
    call?.call_type,
    call?.agent_extension,
    call?.called_number,
    call?.caller_number,
    call?.did_number,
    call?.forward_type,
    call?.answered_time,
    call?.answered_at,
    call?.bridged_at,
    call?.start_time,
    call?.started_at,
  ]
    .map(normalizeRowIdPart)
    .filter(Boolean)
    .join('|');

  return `${normalizeRowIdPart(primaryId)}|${disambiguator}|${index}`;
};

const formatElapsed = (elapsedMs: number): string => {
  const safeSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const twoDigit = (value: number) => String(value).padStart(2, '0');
  return hours > 0
    ? `${twoDigit(hours)}:${twoDigit(minutes)}:${twoDigit(seconds)}`
    : `${twoDigit(minutes)}:${twoDigit(seconds)}`;
};

const ElapsedTimer = ({
  startTime,
  fallback = '00:00',
  prefix = '',
}: {
  startTime: number | null;
  fallback?: string;
  prefix?: string;
}) => {
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());

  useEffect(() => {
    if (!startTime) return;

    setCurrentTimeMs(Date.now());
    const intervalId = window.setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [startTime]);

  return (
    <>
      {startTime ? `${prefix}${formatElapsed(currentTimeMs - startTime)}` : `${prefix}${fallback}`}
    </>
  );
};

const AllCallMonitoring = () => {
  const { user } = useUser();
  const { liveCalls, eventLiveCallsData, socketEventsManager, usersOnlineStatus } =
    useSocketEvents();
  const { users: extensionUsers = [] } = useUsersDirectory();

  /* The console shows agents by name; the call feed only carries their
     extension, so it is resolved against the directory the rest of
     Monitoring already uses. An extension with no match keeps its number
     rather than reading "Unknown User", which says less than the digits do. */
  const getAgentName = useCallback(
    (extension?: string) => {
      if (!extension) return '';
      return getUserNameByExtension(extensionUsers, extension, String(extension));
    },
    [extensionUsers],
  );

  const isAgentOnline = useCallback(
    (extension?: string) =>
      Boolean(
        extension &&
          usersOnlineStatus?.some(
            (entry: any) =>
              String(entry?.userId ?? '').trim() === String(extension).trim() && entry?.online,
          ),
      ),
    [usersOnlineStatus],
  );
  const liveCallsData = useMemo(() => {
    if (Array.isArray(liveCalls) && liveCalls.length > 0) return liveCalls;
    return Array.isArray(eventLiveCallsData) ? eventLiveCallsData : [];
  }, [eventLiveCallsData, liveCalls]);
  const filteredActiveCalls = useMemo(
    () =>
      liveCallsData
        ?.filter(
          (call: any) =>
            ['answered', 'connecting', 'ringing', 'bridged', 'on_hold', 'waiting']?.includes(
              call?.status,
            ) || call?.call_type === 'conference',
        )
        .map((call: any, index: number) => ({
          ...call,
          _id: getAllCallsRowId(call, index),
        })) || [],
    [liveCallsData],
  );
  console.log('🚀 ~ AllCallMonitoring ~ filteredActiveCalls:', filteredActiveCalls);
  const { features } = useCompanyFeatures();
  const { makeCall, sessions } = useDialpad();
  const monitoringAccessActions = features?.plan_features?.monitoring_features?.action;
  const monitorLockTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [pendingMonitorActions, setPendingMonitorActions] = useState<Record<string, string>>({});
  const [selectedCallPath, setSelectedCallPath] = useState<any>(null);

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

  /**
   * Marks each row with its call state, so the list can be read down the
   * left edge instead of by scanning the Status column.
   *
   * This read `row.original['State']` and matched on 'confirmed' — neither
   * exists in the live-calls payload, which carries lowercase `status` with
   * values like 'answered' and 'waiting'. So every row fell through to '' and
   * nothing was ever styled.
   */
  const getCallState = (call: any) => {
    const status = String(call?.status || '').toLowerCase();

    if (status === 'waiting') {
      const startedAt = getCallDurationStartedAtMs(call);
      const waitedMs = startedAt ? Date.now() - startedAt : 0;
      return waitedMs >= WAIT_CRITICAL_MS ? 'critical' : 'waiting';
    }
    if (status === 'on_hold') return 'hold';
    if (status === 'ringing' || status === 'early' || status === 'trying') return 'ringing';
    return 'connected';
  };

  const monitorCall = (code: string, callId: any) => {
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
    socketEventsManager?.emit('call-hangup', { data: { call_uuid: callId } });
  };

  const columns: ColumnDef<any>[] = [
    {
      header: 'From',
      accessorKey: 'From-User',
      cell: ({ row }) => {
        const data = row?.original;
        return (
          <>
            {data?.call_type === 'conference' ? (
              'Conference'
            ) : data?.forward_type === 'AI' ? (
              'AI'
            ) : (
              <div className="flex flex-col">
                <div>{data?.from?.name}</div>
                <div>{data?.from?.number}</div>
              </div>
            )}
          </>
        );
      },
    },
    {
      header: 'DID',
      accessorKey: 'did_number',
      cell: ({ row }) => {
        const data = row?.original;
        return <>{data?.['did_number'] || ''}</>;
      },
    },
    {
      header: 'Duration',
      accessorKey: 'Time',
      cell: ({ row }) => {
        const data = row?.original;
        const timestamp = getCallDurationStartedAtMs(data);

        /* A waiting caller's timer is the number on this screen that
           actually demands action, and it read exactly like a healthy call's
           duration. Past the thresholds it escalates; a connected call's
           timer stays quiet however long it runs, because length alone is
           not a problem there. */
        const isWaiting = String(data?.status || '').toLowerCase() === 'waiting';
        const waitedMs = isWaiting && timestamp ? Date.now() - timestamp : 0;
        const tone = !isWaiting
          ? 'text-mcm-ink-2'
          : waitedMs >= WAIT_CRITICAL_MS
            ? 'text-mcm-crit font-bold'
            : waitedMs >= WAIT_WARNING_MS
              ? 'text-mcm-warn font-semibold'
              : 'text-mcm-ink-2';

        return (
          <div className={`tabular-nums ${tone}`}>
            <ElapsedTimer startTime={timestamp} />
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessorKey: 'State',
      cell: ({ row }) => {
        const data = row?.original;
        const status = String(data?.status || 'waiting').toLowerCase();
        const label = STATE_TYPE_NAME[status as keyof typeof STATE_TYPE_NAME] || 'Unknown';

        /* A chip rather than plain text, in the design system's own state
           colours — the same treatment the task list uses for OVERDUE /
           SCHEDULED. Waiting past the SLA turns red so a queue in trouble
           is visible without reading every row. */
        const timestamp = getCallDurationStartedAtMs(data);
        const waitedMs = status === 'waiting' && timestamp ? Date.now() - timestamp : 0;
        const tone =
          status === 'waiting'
            ? waitedMs >= WAIT_CRITICAL_MS
              ? 'bg-mcm-crit-wash text-mcm-crit'
              : 'bg-mcm-warn-wash text-mcm-warn'
            : status === 'on_hold'
              ? 'bg-mcm-hold-wash text-mcm-hold'
              : 'bg-mcm-live-wash text-mcm-live';

        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${tone}`}
          >
            {label}
          </span>
        );
      },
    },
    {
      header: 'Direction',
      accessorKey: 'Direction',
      cell: ({ row }) => {
        const data = row?.original;
        return (
          <div>
            <p>{capitalizeFirstLetter(data?.direction)}</p>
          </div>
        );
      },
    },
    {
      header: 'To',
      accessorKey: 'To-User',
      cell: ({ row }) => {
        const data = row?.original;
        const activeConferenceMembers = getActiveConferenceMembers(data);

        return (
          <>
            {/* Nothing for a waiting call. "Waiting for agent." was a status
                sentence sitting in the destination column, contradicting the
                header and repeating the Status chip beside it — there is no
                "to" yet, which an empty cell says accurately. */}
            {data?.status === 'waiting' ? null : data?.call_type === 'conference' ? (
              <Popover>
                <PopoverTrigger asChild>
                  <div className="cursor-pointer flex items-center">
                    <GroupedAvatar userArray={activeConferenceMembers} />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 overflow-hidden rounded-xl border border-gray-100 shadow-xl">
                  <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded-lg">
                        <Icon name="UsersIcon" className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 leading-tight">
                          Conference Members
                        </h4>
                        <p className="text-[11px] text-gray-500 font-medium">
                          {activeConferenceMembers.length} Participants active
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-2">
                    <div className="flex flex-col gap-1">
                      {activeConferenceMembers.length ? (
                        activeConferenceMembers.map((member: ConferenceMember, idx: number) => {
                          const memberName = getConferenceMemberDisplayName(member);
                          const memberNumber = getConferenceMemberDialTarget(member) || '---';
                          const joinedAtMs = getConferenceMemberJoinedAtMs(member);

                          return (
                            <div
                              key={`${memberNumber}-${idx}`}
                              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors group"
                            >
                              <div className="relative">
                                <CustomAvatar
                                  name={memberName}
                                  image={String(member?.profile || member?.avatar || '').trim()}
                                  size="36"
                                />
                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-sm font-semibold text-gray-700 truncate group-hover:text-primary transition-colors">
                                  {memberName}
                                </span>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 truncate text-[11px] text-gray-400 font-medium tabular-nums">
                                    {memberNumber}
                                  </span>
                                  <span className="shrink-0 text-[11px] font-semibold text-gray-500 tabular-nums">
                                    <ElapsedTimer
                                      startTime={joinedAtMs}
                                      fallback="--:--"
                                      prefix="Joined "
                                    />
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-3 py-4 text-center text-xs text-gray-500">
                          No conference members found
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="flex flex-col">
                <div>{data?.to?.name}</div>
                <div>{data?.forward_type === 'AI' ? '' : data?.to?.number}</div>
              </div>
            )}
          </>
        );
      },
    },
    {
      header: 'Call Path',
      accessorKey: 'current_context',
      cell: ({ row }) => {
        const data = row?.original;
        const campaignLabel =
          `${data?.campaign_name || ''}${
            data?.campaign_type ? ` (${data?.campaign_type})` : ''
          }`.trim() || undefined;

        return <CallPathCell call={data} onOpen={setSelectedCallPath} secondary={campaignLabel} />;
      },
    },
    // {
    //   header: 'Forwarding Type',
    //   accessorKey: 'From',
    //   cell: ({ row }) => {
    //     const data = row?.original;
    //     return (
    //       <>
    //         <div className="text-sm font-medium text-gray-800">
    //           {data?.call_type === 'conference'
    //             ? ''
    //             : data?.forward_type === 'CAMPAIGN'
    //               ? data?.campaign_name
    //               : data?.forward_type === 'QUEUE'
    //                 ? data?.queue_name
    //                 : data?.forward_name || ''}
    //         </div>
    //         <div className="text-xs text-slate-500">
    //           {data?.call_type === 'conference' ? (
    //             'Conference'
    //           ) : data?.forward_type ? (
    //             <div className="flex items-center gap-1">
    //               {capitalizeFirstLetter(data?.forward_type)}
    //             </div>
    //           ) : data?.called_number?.length > 5 ? (
    //             'External Call'
    //           ) : (
    //             'Internal Call'
    //           )}
    //         </div>
    //       </>
    //     );
    //   },
    // },
    {
      header: 'Actions',
      accessorKey: 'Call-ID',
      cell: ({ row }) => {
        const call = row?.original;
        // const isCurrentSystemOnCall = Object.values(_uiSessions || {}).some((session: any) =>
        //   [call?.agent_extension, call?.called_number].includes(session?._number?.replace('+', '')),
        // );

        const callId = getMonitorTargetCallId(call);
        const normalizedCallId = normalizeMonitorDialValue(callId);
        const hasPendingMonitorAction = Boolean(pendingMonitorActions?.[normalizedCallId]);
        const hasActiveMonitorSession = hasActiveMonitorSessionForCall(normalizedCallId);
        const isMonitoringActionLocked = hasPendingMonitorAction || hasActiveMonitorSession;

        const isButtonDisabled =
          !call ||
          !['bridged', 'answered'].includes(call?.status) ||
          (call?.called_number?.length > 4 && call?.agent_extension?.length > 4) ||
          [call?.agent_extension, call?.called_number]?.includes(user?.user_info?.extension) ||
          hasAnyActiveCallSession ||
          isMonitoringActionLocked;
        //  &&
        //   isCurrentSystemOnCall
        // monitoringCallJoined;
        // An empty cell reads as 'no action here'; '---' reads as a failed load.
        if (isButtonDisabled) return null;
        return (
          <span className="flex gap-2 items-center">
            {monitoringAccessActions?.listen && (
              <CustomTooltip text="Listen" side="top">
                <span
                  className="cursor-pointer flex items-center justify-center min-h-8 min-w-8 max-w-8 max-h-8 rounded-lg w-8 h-8 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={() => monitorCall('*87', callId)}
                >
                  <Ear className="w-4 h-4" />
                </span>
              </CustomTooltip>
            )}
            {monitoringAccessActions?.whisper && (
              <CustomTooltip text="Whisper" side="top">
                <span
                  className="cursor-pointer flex items-center justify-center min-h-8 min-w-8 max-w-8 max-h-8 rounded-lg w-8 h-8 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={() => monitorCall('*86', callId)}
                >
                  <MicIcon className="w-4 h-4" />
                </span>
              </CustomTooltip>
            )}
            {monitoringAccessActions?.barge && (
              <CustomTooltip text="Barge" side="top">
                <span
                  className="cursor-pointer flex items-center justify-center min-h-8 min-w-8 max-w-8 max-h-8 rounded-lg w-8 h-8 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={() => monitorCall('*88', callId)}
                >
                  <UsersIcon className="w-4 h-4" />
                </span>
              </CustomTooltip>
            )}
            {monitoringAccessActions?.intercept && (
              <CustomTooltip text="Intercept" side="top">
                <span
                  className="cursor-pointer flex items-center justify-center min-h-8 min-w-8 max-w-8 max-h-8 rounded-lg w-8 h-8 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={() => monitorCall('*89', callId)}
                >
                  <CallIntersection className="w-5 h-5" />
                </span>
              </CustomTooltip>
            )}

            {monitoringAccessActions?.hangup && (
              <CustomTooltip text="Hangup" side="top">
                <span
                  className="cursor-pointer flex items-center justify-center min-h-8 min-w-8 max-w-8 max-h-8 rounded-lg w-8 h-8 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={() => terminateCallSession(call)}
                >
                  <ImPhoneHangUp className="w-5 h-5" />
                </span>
              </CustomTooltip>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <section className="w-full overflow-x-auto overflow-y-hidden">
        {/* <Breadcrumb breadcrumbs={breadcrumbData} /> */}
        <MonitoringTopbarSlot>
          <div className="flex items-center justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
            <p className="text-gray-900 font-semibold text-lg flex items-center gap-1">
              Monitoring
              <div className="-rotate-90 text-gray-800">
                <Icon name="ChevronIcon" className="w-5 h-5" />
              </div>
              <span className="text-primary text-md">All Calls</span>
            </p>
            <div className="flex gap-2 "></div>
          </div>
        </MonitoringTopbarSlot>
        <div className="w-full  p-3 flex flex-col gap-2 h-full">
          {/* <h6 className="text-gray-900 font-semibold text-lg">All Calls Monitoring</h6>
          <h5 className="font-semibold text-gray-900 text-md">Calls</h5> */}
          <LiveCallList
            calls={filteredActiveCalls || []}
            columns={columns}
            getState={getCallState}
            getAgentName={getAgentName}
            isAgentOnline={isAgentOnline}
            startedAt={getCallDurationStartedAtMs}
          />
        </div>
      </section>
      <CallPathDialog call={selectedCallPath} onClose={() => setSelectedCallPath(null)} />
    </>
  );
};

export default AllCallMonitoring;
