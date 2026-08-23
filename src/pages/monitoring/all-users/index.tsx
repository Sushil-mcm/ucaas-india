import {
  CallIntersection,
  Clock,
  ImPhoneHangUp,
  PhoneCalling,
  UsersGroup,
  Warning,
} from '@/assets/icons';
import { Icon } from '@/assets/icons/icon';
// import Breadcrumb from '@/components/custom/breadcrumb';
import CustomAvatar from '@/components/custom/custom-avatar';
import CustomTooltip from '@/components/custom/custom-tooltip';
import TableManager from '@/components/custom/table-manager';
import Timer from '@/components/timer';
import { Button } from '@/components/ui/button';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useDialpad } from '@/hooks/use-dialpad';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useUser } from '@/hooks/use-user';
import { IUSERS } from '@/interfaces/extension-interface';
import { capitalizeFirstLetter, handleAlert } from '@/lib/utils';
import {
  MONITOR_ACTION_LABELS,
  getMonitorTargetCallId,
  isDialpadMonitoringSessionActiveForCall,
  normalizeMonitorDialValue,
} from '@/lib/monitoring-actions';
import { getUserList } from '@/services/api';
import { ColumnDef } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getUserNameByExtension } from '@/lib/extension-utility';
import { useUsersDirectory } from '@/hooks/use-users-directory';
import { Ear, MicIcon, UsersIcon } from 'lucide-react';
import { CallPathCell, CallPathDialog } from '../call-path-cell';
import {
  getMonitoringCallDid,
  getMonitoringCallTimestamp,
  getMonitoringLiveCalls,
  isActiveMonitoringCall,
  isMonitoringCallForMember,
} from '../live-call-helpers';

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

type ActiveCallSortedUser = {
  row: IUSERS;
  index: number;
  hasActiveCall: boolean;
};

/**
 * `embedded` is for hosts that supply their own page chrome — the Performance
 * workspace already has a title, tabs and its own stat cards, so the
 * "Monitoring › All Extensions" bar and the viewport-height table box would
 * be a second header and a nested scroller inside its page.
 */
const AllUserMonitoring = ({ embedded = false }: { embedded?: boolean } = {}) => {
  // const breadcrumbData = [{ label: 'Monitoring' }, { label: 'All Users' }];
  const [isShowSummary, setIshowSummary] = useState(false);
  const tableRef = useRef<any>(null);
  const { user } = useUser();
  const { features } = useCompanyFeatures();
  const { makeCall, sessions } = useDialpad();
  const { users: extensionUsers = [] } = useUsersDirectory();
  // const { user_info } = user;
  const { usersOnlineStatus, liveCalls, socketEventsManager, eventLiveCallsData } =
    useSocketEvents();
  const liveCallsData = getMonitoringLiveCalls(liveCalls, eventLiveCallsData);
  const filteredActiveCalls = liveCallsData?.filter(isActiveMonitoringCall) || [];
  const monitoringAccessActions = features?.plan_features?.monitoring_features?.action;
  const monitorLockTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [pendingMonitorActions, setPendingMonitorActions] = useState<Record<string, string>>({});
  const [selectedCallPath, setSelectedCallPath] = useState<any>(null);
  const totalUsers = tableRef?.current?.getTotal() || 0;

  const onlineUser = usersOnlineStatus?.length
    ? usersOnlineStatus?.filter((item) => item?.online)
    : [];

  const agentsOnCall = useMemo(() => {
    return filteredActiveCalls?.filter((c: any) => c?.status !== 'waiting')?.length;
  }, [filteredActiveCalls]);

  const callOnWaiting = useMemo(() => {
    return filteredActiveCalls?.filter((call: any) => call.status === 'waiting')?.length;
  }, [filteredActiveCalls]);

  const getCallInfoByExtension = useCallback(
    (extension: any) =>
      filteredActiveCalls?.find((call: any) => isMonitoringCallForMember(call, extension)),
    [filteredActiveCalls],
  );

  const isUserOnCallByPresence = useCallback(
    (extension: any) =>
      usersOnlineStatus?.some(
        (statusUser: any) =>
          String(statusUser?.userId ?? '').trim() === String(extension ?? '').trim() &&
          Boolean(statusUser?.onCall),
      ),
    [usersOnlineStatus],
  );

  const selectUsersWithActiveCallsFirst = useCallback(
    (response: any) => {
      const rows: IUSERS[] = response?.data?.data?.result?.rows || [];

      return rows
        .map<ActiveCallSortedUser>((row, index) => ({
          row,
          index,
          hasActiveCall:
            Boolean(getCallInfoByExtension(row?.extension)) ||
            isUserOnCallByPresence(row?.extension),
        }))
        .sort((a, b) => {
          if (a.hasActiveCall !== b.hasActiveCall) {
            return a.hasActiveCall ? -1 : 1;
          }

          return a.index - b.index;
        })
        .map(({ row }) => row);
    },
    [getCallInfoByExtension, isUserOnCallByPresence],
  );

  const getRowClassName = (row: any) => {
    // const status = allOngoingCalls?.[`${row?.original?.extension}_web`]?.['State'];
    const extension = row?.original?.extension;

    const callInfo = getCallInfoByExtension(extension);
    const status = callInfo?.status || '';
    switch (status) {
      case 'ringing':
      case 'waiting':
        return 'bg-yellow-100';
      case 'answered':
      case 'bridged':
      case 'on_hold':
        return 'bg-green-100';
      default:
        return isUserOnCallByPresence(extension) ? 'bg-green-100' : '';
    }
  };

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

  const monitorCall = (code: string, extension: any) => {
    const callInfo = getCallInfoByExtension(extension);
    const callId = getMonitorTargetCallId(callInfo);
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

  const columns: ColumnDef<IUSERS>[] = [
    {
      header: 'Name',
      accessorKey: 'first_name',
      cell: ({ row }) => {
        const data = row?.original;
        const fullName = `${data?.first_name}${data?.last_name ? ` ${data?.last_name}` : ''}`;
        return (
          <div className="flex items-center gap-2 w-full">
            <div className="flex ">
              <CustomAvatar
                name={fullName}
                showPresence
                extension={data?.extension}
                image={data?.profile}
              />
            </div>
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between  gap-2">
                <div className="flex flex-col items-start ">
                  <p className="capitalize">{fullName}</p>
                  <small className="text-primary text-[10px]">
                    {data?.custom_role_data?.name || data?.role_data?.name || data?.role}
                  </small>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Icon name="Grid" className="w-4 h-4 " />
                  <div>{data?.extension}</div>
                </div>
              </div>
              <p className="text-gray-500 flex justify-between">
                <div>{data?.email}</div>
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Contact',
      accessorKey: 'email',
      cell: ({ row }) => {
        const extension = row?.original?.extension;
        const callInfo = getCallInfoByExtension(extension);
        return callInfo?.direction === 'inbound' ? (
          <>{callInfo?.contact_name || callInfo?.caller_number || 'Unknown Caller'}</>
        ) : (
          <>
            {callInfo?.call_type === 'conference'
              ? 'Conference'
              : callInfo?.forward_type === 'AI'
                ? 'AI'
                : callInfo?.agent_extension
                  ? getUserNameByExtension(
                      extensionUsers,
                      callInfo?.agent_extension,
                      callInfo?.agent_extension,
                    )
                  : callInfo?.called_number || '---'}
          </>
        );
      },
    },
    {
      header: 'DID',
      accessorKey: 'did',
      cell: ({ row }) => {
        const extension = row?.original?.extension;
        const callInfo = getCallInfoByExtension(extension);
        return <>{getMonitoringCallDid(callInfo)}</>;
      },
    },
    {
      header: 'Duration',
      accessorKey: 'phone',
      cell: ({ row }) => {
        const extension = row?.original?.extension;
        const callInfo = getCallInfoByExtension(extension);
        if (!callInfo) return '00:00';
        const timestamp = getMonitoringCallTimestamp(callInfo, row?.original);
        return (
          <div>
            <Timer startTime={timestamp} />
          </div>
        );
      },
    },
    {
      header: '	Status',
      accessorKey: 'site_uuid',
      cell: ({ row }) => {
        const extension = row?.original?.extension;
        const callInfo = getCallInfoByExtension(extension);
        const status = callInfo?.status || '';
        const statusLabel = status
          ? STATE_TYPE_NAME[status as keyof typeof STATE_TYPE_NAME]
          : isUserOnCallByPresence(extension)
            ? 'On Call'
            : '---';
        return (
          <div>
            <p>{statusLabel}</p>
          </div>
        );
      },
    },
    {
      header: 'Direction',
      accessorKey: 'socket_status',
      cell: ({ row }) => {
        const extension = row?.original?.extension;
        const callInfo = getCallInfoByExtension(extension);
        return (
          <div>
            <p>{callInfo?.direction ? capitalizeFirstLetter(callInfo?.direction) : '---'}</p>
          </div>
        );
      },
    },
    {
      header: 'Call Path',
      accessorKey: 'current_context',
      cell: ({ row }) => {
        const extension = row?.original?.extension;
        const callInfo = getCallInfoByExtension(extension);

        return <CallPathCell call={callInfo} onOpen={setSelectedCallPath} />;
      },
    },
    {
      header: 'Actions',
      accessorKey: 'socket_status',
      cell: ({ row }) => {
        const data = row?.original;
        const extension = row?.original?.extension;
        const callInfo = getCallInfoByExtension(extension);
        const callId = getMonitorTargetCallId(callInfo);
        const normalizedCallId = normalizeMonitorDialValue(callId);
        const hasPendingMonitorAction = Boolean(pendingMonitorActions?.[normalizedCallId]);
        const hasActiveMonitorSession = hasActiveMonitorSessionForCall(normalizedCallId);
        const isMonitoringActionLocked = hasPendingMonitorAction || hasActiveMonitorSession;
        // const isCurrentSystemOnCall = Object.values(_uiSessions || {}).some((session: any) =>
        //   [callInfo?.agent_extension, callInfo?.called_number].includes(
        //     session?._number?.replace('+', ''),
        //   ),
        // );

        const isButtonDisabled =
          !callInfo ||
          !['bridged', 'answered'].includes(callInfo?.status) ||
          (callInfo?.called_number?.length > 4 && callInfo?.agent_extension?.length > 4) ||
          [callInfo?.agent_extension, callInfo?.called_number]?.includes(
            user?.user_info?.extension,
          ) ||
          hasAnyActiveCallSession ||
          isMonitoringActionLocked;
        //  &&
        //   isCurrentSystemOnCall) ||
        // monitoringCallJoined;
        if (isButtonDisabled) return '---';
        return (
          <span className="flex gap-2 items-center">
            {monitoringAccessActions?.listen && (
              <CustomTooltip text="Listen" side="top">
                <span
                  className="cursor-pointer flex items-center justify-center min-h-8 min-w-8 max-w-8 max-h-8 rounded-lg w-8 h-8 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={() => monitorCall('*87', data?.extension)}
                >
                  <Ear className="w-4 h-4" />
                </span>
              </CustomTooltip>
            )}
            {monitoringAccessActions?.whisper && (
              <CustomTooltip text="Whisper" side="top">
                <span
                  className="cursor-pointer flex items-center justify-center min-h-8 min-w-8 max-w-8 max-h-8 rounded-lg w-8 h-8 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={() => monitorCall('*86', data?.extension)}
                >
                  <MicIcon className="w-4 h-4" />
                </span>
              </CustomTooltip>
            )}
            {monitoringAccessActions?.barge && (
              <CustomTooltip text="Barge" side="top">
                <span
                  className="cursor-pointer flex items-center justify-center min-h-8 min-w-8 max-w-8 max-h-8 rounded-lg w-8 h-8 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={() => monitorCall('*88', data?.extension)}
                >
                  <UsersIcon className="w-4 h-4" />
                </span>
              </CustomTooltip>
            )}
            {monitoringAccessActions?.intercept && (
              <CustomTooltip text="Intercept" side="top">
                <span
                  className="cursor-pointer flex items-center justify-center min-h-8 min-w-8 max-w-8 max-h-8 rounded-lg w-8 h-8 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={() => monitorCall('*89', data?.extension)}
                >
                  <CallIntersection className="w-5 h-5" />
                </span>
              </CustomTooltip>
            )}
            {monitoringAccessActions?.hangup && (
              <CustomTooltip text="Hangup" side="top">
                <span
                  className="cursor-pointer flex items-center justify-center min-h-8 min-w-8 max-w-8 max-h-8 rounded-lg w-8 h-8 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={() => terminateCallSession(callInfo)}
                >
                  <ImPhoneHangUp className="w-5 h-5" />
                </span>
              </CustomTooltip>
            )}
            {/* <span className="cursor-pointer" onClick={() => _terminate(presenceData['Call-ID'])}>
              <CustomTooltip text="Hangup">
                <ImPhoneHangUp className="w-5 h-5" />
              </CustomTooltip>
            </span> */}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <section className="w-full overflow-x-auto overflow-y-hidden">
        {/* <Breadcrumb breadcrumbs={breadcrumbData} /> */}
        {!embedded && (
          <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 border-b border-gray-200 min-h-[65px] bg-white">
            <div className="text-gray-900 font-semibold text-lg flex items-center gap-1 min-w-0">
              <span className="truncate">Monitoring</span>
              <div className="-rotate-90 text-gray-800 shrink-0">
                <Icon name="ChevronIcon" className="w-5 h-5" />
              </div>
              <span className="text-primary text-md truncate">All Extensions</span>
            </div>
            <div className="relative z-30 flex gap-2 filters pointer-events-auto shrink-0">
              <Button
                type="button"
                variant={'outline'}
                onClick={() => setIshowSummary((prev) => !prev)}
                className="min-h-9 w-full sm:w-auto"
              >
                Summary
              </Button>
            </div>
          </div>
        )}
        <div
          className={
            embedded
              ? 'w-full flex flex-col gap-2'
              : 'w-full h-[calc(100vh_-_8rem)]   p-3 flex flex-col gap-2 overflow-y-auto'
          }
        >
          {isShowSummary && (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 ">
              <div className="flex justify-between border border-gray-200 rounded-lg w-full p-3 gap-1 bg-white">
                <div className="flex flex-col">
                  <p className="font-semibold text-gray-900 truncate text-sm">Calls Waiting</p>
                  <h2 className="text-gray-700 truncate text-2xl font-semibold">
                    {callOnWaiting || 0}
                  </h2>
                </div>
                <div className="cursor-pointer   bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white  flex items-center justify-center rounded-full w-8 h-8 ">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="flex justify-between border border-gray-200 rounded-lg w-full p-3 gap-1 bg-white">
                <div className="flex flex-col">
                  <p className="font-semibold text-gray-900 truncate text-sm">Online Users</p>
                  <h2 className="text-gray-700 truncate text-2xl font-semibold">
                    {onlineUser?.length || 0}
                    {/* {usersOnlineStatus?.length ? usersOnlineStatus?.filter((item) => item?.online)?.length : 0} */}
                  </h2>
                </div>
                <div className="cursor-pointer   bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white  flex items-center justify-center rounded-full w-8 h-8 ">
                  <UsersGroup className="w-5 h-5" />
                </div>
              </div>
              <div className="flex justify-between border border-gray-200 rounded-lg w-full p-3 gap-1 bg-white">
                <div className="flex flex-col">
                  <p className="font-semibold text-gray-900 truncate text-sm">Offline Users</p>
                  <h2 className="text-gray-700 truncate text-2xl font-semibold">
                    {Math.max(Number(totalUsers) - Object.keys(onlineUser || {}).length, 0)}
                    {/* {usersOnlineStatus?.length ? usersOnlineStatus?.filter((item) => item?.online)?.length : 0} */}
                  </h2>
                </div>
                <div className="cursor-pointer   bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white  flex items-center justify-center rounded-full w-8 h-8 ">
                  <Warning className="w-5 h-5" />
                </div>
              </div>
              <div className="flex justify-between border border-gray-200 rounded-lg w-full p-3 gap-1 bg-white">
                <div className="flex flex-col">
                  <p className="font-semibold text-gray-900 truncate text-sm">Users On Call</p>
                  <h2 className="text-gray-700 truncate text-2xl font-semibold">
                    {agentsOnCall || 0}
                  </h2>
                </div>
                <div className="cursor-pointer   bg-gray-100 text-gray-900/80 hover:bg-primary hover:text-white  flex items-center justify-center rounded-full w-8 h-8 ">
                  <PhoneCalling className="w-6 h-6" />
                </div>
              </div>
            </div>
          )}
          {/* <h5 className="font-semibold text-gray-900 text-md">Users</h5> */}
          <TableManager
            {...{
              fetcherKey: 'getAllUserListForMonitor',
              fetcherFn: getUserList,
              select: selectUsersWithActiveCallsFirst,
              columns,
              tableRef,
              getRowClassName,
              emptyTablePlaceholder: 'No extension activity',
              descriptionEmptyTable: 'Calls for extensions will appear here once available.',
            }}
          />
        </div>
      </section>
      <CallPathDialog call={selectedCallPath} onClose={() => setSelectedCallPath(null)} />
    </>
  );
};

export default AllUserMonitoring;
