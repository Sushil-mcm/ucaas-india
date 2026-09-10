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
import { capitalizeFirstLetter, formatPhoneNumber, handleAlert } from '@/lib/utils';
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
import { Ear, Loader2, MicIcon, UsersIcon } from 'lucide-react';
import { CallPathCell, CallPathDialog } from '../call-path-cell';
import { MonitoringTopbarSlot } from '../topbar';
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

/* A call's raw `status` collapses into one of two visual tones wherever this
   table shows it (the avatar's presence dot, the Status badge): 'connected'
   (answered/bridged — a genuinely live, connected call) or 'ringing' (every
   other in-progress state — ringing, waiting, on hold, trying, started).
   Kept as one shared function so the dot and the badge never disagree with
   each other about which state a given row is in. */
const getActiveCallTone = (status?: string): 'connected' | 'ringing' | undefined => {
  if (!status) return undefined;
  return status === 'answered' || status === 'bridged' ? 'connected' : 'ringing';
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
const AllUserMonitoring = ({
  embedded = false,
  globalSearch,
}: {
  embedded?: boolean;
  /* Performance ▸ Live Interactions' centralized toolbar search
     (index.tsx → live-interactions-tab.tsx). This view has no search
     input of its own to preserve, so it's fed straight into
     TableManager's own `search` prop below. Standalone Monitoring ▸ All
     Extensions never passes it. */
  globalSearch?: string;
} = {}) => {
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

  /* No more full-row colour wash — the Status cell's own `pl-tag` badge
     now carries that signal on its own. The actual hover colour is a
     scoped CSS rule (`.mcm-allext table tbody tr:hover` in mcm-page.css)
     rather than a Tailwind class here — this table inherits
     `.mcm-admin table tbody tr:hover`, which a same-specificity Tailwind
     utility can't outrank. */
  const getRowClassName = () => 'transition-colors';

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
        const callInfo = getCallInfoByExtension(data?.extension);
        return (
          <div className="flex items-center gap-2 w-full min-w-0">
            <div className="flex ">
              <CustomAvatar
                name={fullName}
                showPresence
                extension={data?.extension}
                image={data?.profile}
                /* Only reskin the dot inside Performance ▸ Live Interactions
                   (`embedded`) — the standalone Monitoring ▸ All Extensions
                   route keeps its original red "on call" dot exactly as
                   before. */
                activeCallTone={embedded ? getActiveCallTone(callInfo?.status) : undefined}
              />
            </div>
            <div className="flex flex-col w-full min-w-0">
              <div className="flex items-center justify-between  gap-2">
                {/* `min-w-0` lets this block actually shrink below its own
                    text's natural width inside a fixed-width column — without
                    it, a flex child defaults to `min-width: auto` (its
                    content's full width), so a longer name pushed the
                    extension badge past the cell's own right edge and, with
                    no overflow clipping on the cell, straight into the next
                    column's text (`1005Pooja Bansal`). `truncate` below is
                    then what actually uses that shrunk space to ellipsize
                    instead of overflowing. */}
                <div className="flex flex-col items-start min-w-0">
                  <p className="capitalize w-full">{fullName}</p>
                  <small className="text-primary text-[10px]">
                    {data?.custom_role_data?.name || data?.role_data?.name || data?.role}
                  </small>
                </div>
                {/* `flex-shrink-0` — the extension badge is short and fixed,
                    the name is what should give way when space is tight. */}
                <div className="flex shrink-0 items-center gap-1 text-gray-500">
                  <Icon name="Grid" className="w-4 h-4 " />
                  <div>{data?.extension}</div>
                </div>
              </div>
              <p className="text-gray-500 flex justify-between">
                <div className="truncate">{data?.email}</div>
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
      meta: { textAlign: 'center' },
      cell: ({ row }) => {
        const extension = row?.original?.extension;
        const callInfo = getCallInfoByExtension(extension);
        const did = getMonitoringCallDid(callInfo);
        // A dense run of digits (`+911800123456`) is a lot harder to scan
        // than the spaced form a real dial pad or contact card would show
        // (`+91 1800 12 3456`) — reuse the same international formatter the
        // CRM number list already renders DIDs through, rather than a
        // one-off regex just for this column.
        return <>{did === '---' ? did : formatPhoneNumber(did) || did}</>;
      },
    },
    {
      header: 'Duration',
      accessorKey: 'phone',
      meta: { textAlign: 'center' },
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
      meta: { textAlign: 'center' },
      cell: ({ row }) => {
        const extension = row?.original?.extension;
        const callInfo = getCallInfoByExtension(extension);
        const status = callInfo?.status || '';
        const statusLabel = status
          ? STATE_TYPE_NAME[status as keyof typeof STATE_TYPE_NAME]
          : isUserOnCallByPresence(extension)
            ? 'On Call'
            : '---';
        /* Same 'connected'/'ringing' split the avatar dot uses
           (getActiveCallTone) so the badge and the dot never disagree —
           the presence-only "On Call" fallback (no callInfo, but the
           socket says this extension is on a call) reads as connected
           since that is the only tone that fallback can honestly claim. */
        const tone = status ? getActiveCallTone(status) : statusLabel === 'On Call' ? 'connected' : undefined;
        const tagClass =
          tone === 'connected' ? 'pl-tag-pos' : tone === 'ringing' ? 'pl-tag-warn' : 'pl-tag-neu';
        return (
          <div>
            <p className={`pl-tag ${tagClass}`}>{statusLabel}</p>
          </div>
        );
      },
    },
    {
      header: 'Direction',
      accessorKey: 'socket_status',
      meta: { textAlign: 'center' },
      cell: ({ row }) => {
        const extension = row?.original?.extension;
        const callInfo = getCallInfoByExtension(extension);
        return (
          <div>
            <p className="pl-tag pl-tag-dir">
              {callInfo?.direction ? capitalizeFirstLetter(callInfo?.direction) : '---'}
            </p>
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
      /* NOT `meta: { textAlign: 'center' }` — that flag centers the BODY
         cell's content too (table-manager-row.tsx wraps it in a centered
         flex div), and once `splitStickyHeader`'s measured colgroup gives
         this column exactly the 5-button row's own content width, centering
         a row that's already exactly as wide as its column pushes it out
         evenly on both sides — clipped by `overflow: hidden` on the cell,
         so the Listen button's left edge silently vanished. The header
         label alone is centered via CSS instead (`thead th:last-child`,
         live-theme.css), leaving the body row's own left-aligned layout
         untouched. */
      cell: ({ row }) => {
        const data = row?.original;
        const extension = row?.original?.extension;
        const callInfo = getCallInfoByExtension(extension);
        const callId = getMonitorTargetCallId(callInfo);
        const normalizedCallId = normalizeMonitorDialValue(callId);
        const pendingActionCode = pendingMonitorActions?.[normalizedCallId];
        const hasActiveMonitorSession = hasActiveMonitorSessionForCall(normalizedCallId);
        /* Whether this row can start a NEW monitor action right now — a
           different action already pending/active for this same call, or
           any monitor session active anywhere (the dialpad can only run
           one at a time). This only gates whether a click is *allowed*;
           unlike the boolean this replaced, it never controls whether the
           buttons themselves render — see the bug note below. */
        const isRowLocked =
          Boolean(pendingActionCode) || hasActiveMonitorSession || hasAnyActiveCallSession;

        const hasEligibleCall =
          Boolean(callInfo) &&
          ['bridged', 'answered'].includes(callInfo?.status) &&
          !(callInfo?.called_number?.length > 4 && callInfo?.agent_extension?.length > 4) &&
          ![callInfo?.agent_extension, callInfo?.called_number]?.includes(
            user?.user_info?.extension,
          );

        // No call on this row worth monitoring at all — nothing to click,
        // ever, regardless of any pending action elsewhere.
        if (!hasEligibleCall) return '---';

        /* All 5 buttons used to be replaced outright by a bare "---" the
           instant ANY monitor action started anywhere in the table — the
           whole row (every other action too, on every other row) blinked
           out for as long as that action stayed pending/active, reading as
           "the icons disappeared" rather than "an action is running".
           Buttons now stay mounted at all times; only their `disabled`
           state changes, and only the one actually clicked shows a
           spinner in place of its icon. */
        const renderMonitorButton = (
          show: boolean,
          code: string,
          label: string,
          IconCmp: any,
          colourClass: string,
          onClick: () => void,
        ) => {
          if (!show) return null;
          const isThisPending = pendingActionCode === code;
          return (
            <CustomTooltip text={label} side="top">
              <button
                type="button"
                disabled={isRowLocked && !isThisPending}
                onClick={onClick}
                className={`ma-action-btn ${colourClass} flex min-h-8 min-w-8 max-h-8 max-w-8 h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-xs transition-all hover:scale-105 disabled:pointer-events-none disabled:opacity-50`}
              >
                {isThisPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <IconCmp className="h-4 w-4" />
                )}
              </button>
            </CustomTooltip>
          );
        };

        return (
          <span className="flex items-center gap-1.5">
            {renderMonitorButton(
              Boolean(monitoringAccessActions?.listen),
              '*87',
              'Listen',
              Ear,
              'ma-action-listen',
              () => monitorCall('*87', data?.extension),
            )}
            {renderMonitorButton(
              Boolean(monitoringAccessActions?.whisper),
              '*86',
              'Whisper',
              MicIcon,
              'ma-action-whisper',
              () => monitorCall('*86', data?.extension),
            )}
            {renderMonitorButton(
              Boolean(monitoringAccessActions?.barge),
              '*88',
              'Barge',
              UsersIcon,
              'ma-action-barge',
              () => monitorCall('*88', data?.extension),
            )}
            {renderMonitorButton(
              Boolean(monitoringAccessActions?.intercept),
              '*89',
              'Intercept',
              CallIntersection,
              'ma-action-transfer',
              () => monitorCall('*89', data?.extension),
            )}
            {monitoringAccessActions?.hangup && (
              <CustomTooltip text="Hangup" side="top">
                <button
                  type="button"
                  onClick={() => terminateCallSession(callInfo)}
                  className="ma-action-btn ma-action-hangup flex min-h-8 min-w-8 max-h-8 max-w-8 h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-xs transition-all hover:scale-105"
                >
                  <ImPhoneHangUp className="h-4 w-4" />
                </button>
              </CustomTooltip>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <section className="mcm-allext w-full overflow-x-auto overflow-y-hidden">
        {/* <Breadcrumb breadcrumbs={breadcrumbData} /> */}
        {!embedded && (
          <MonitoringTopbarSlot>
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
          </MonitoringTopbarSlot>
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
              /* Only for the Performance ▸ Live embed (live-theme.css,
                 `.perf-live`) — standalone Monitoring ▸ All Users keeps its
                 own existing (non-split, paginated) behaviour, unrelated to
                 the Directory-parity work done on the Performance side.
                 `visibleRowCount` (same approach as Agents, agents-tab.tsx)
                 is what actually bounds the card's height — in
                 `splitStickyHeader` mode that height comes from
                 `visibleRowCount * fixedRowHeight` regardless of
                 `showPagination` (table-manager.tsx), so the pagination
                 footer can render without the card losing its fixed
                 6-row height or its internal scrollbar. `showPagination`
                 was originally left `false` here on the assumption the
                 two were linked; they aren't — the footer (page-size
                 picker, record count, page numbers) is worth keeping for
                 a live monitoring list that can hold more rows than fit
                 on screen at once. */
              ...(embedded
                ? { splitStickyHeader: true, showPagination: true, visibleRowCount: 6 }
                : {}),
              /* `getUserList`'s generic `search` param isn't confirmed to
                 match against agent name/extension/contact server-side —
                 `clientSideSearch` filters the fetched page itself
                 instead, so this stays correct either way (same reasoning
                 as Performance ▸ Flows/Callbacks). Only for the Performance
                 ▸ Live embed; standalone Monitoring ▸ All Users never
                 passes `globalSearch`. */
              ...(embedded ? { search: globalSearch, clientSideSearch: true } : {}),
            }}
          />
        </div>
      </section>
      <CallPathDialog call={selectedCallPath} onClose={() => setSelectedCallPath(null)} />
    </>
  );
};

export default AllUserMonitoring;
