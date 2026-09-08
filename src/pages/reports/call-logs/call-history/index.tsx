import TableManager from '@/components/custom/table-manager';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Icon } from '@/assets/icons/icon';
import { useNavigate } from 'react-router-dom';
import { ReportsPageLayout } from '../../reports-content-layout';
import { convertDateFormateApis, formatSecondsToMMSS, handleAlert, MEDIA_URL } from '@/lib/utils';
import { downloadCSV } from '@/pages/admin-settings/billing/invoice/constants';
import { useUser } from '@/hooks/use-user';
import { FilterIcon, SearchLine } from '@/assets/icons';
import { Input } from '@/components/ui/input';
import { USD_TO_INR_RATE } from '@/lib/billing-money';
import { Button } from '@/components/ui/button';
import { callList, callListById, forwardActionType, getSessionList } from '@/services/api';
import { CALL_DIRECTIONS, FORWARD_ICONS } from '@/pages/dashboard/constant';
import CustomTooltip from '@/components/custom/custom-tooltip';
import NumberWithFlag from '@/components/custom/number-with-flag';
import AudioModal from '@/pages/phone/audio-dialog';
import CommonFilter, { transFilterObject } from '@/components/custom/custom-filter';
import DateDropdown from '@/components/custom/date-dropdown';
import { dropdownCallInitialVal, handleDate } from '@/components/custom/date-dropdown/constant';
import { Merge, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useCompanyFeatures } from '@/hooks/rbac';
import { useQueries, useQuery } from '@tanstack/react-query';
import { ACTIVITYLIST } from '@/components/activity-list/constants';

import { CALL_TYPE, FORWARD_TYPES_ARR, handleStatus, STATUS_TYPE } from '../constant';
import SideDrawer from '@/components/custom/side-drawer';
import IVRDetailsView from '@/components/activity-list/side-drawers/ivr-details-view';
import DepartmentDetailsView from '@/components/activity-list/side-drawers/department-details-view';
import QueueDetailsView from '@/components/activity-list/side-drawers/queue-details-view';
import { useDialpad } from '@/hooks/use-dialpad';
import { getUserNameByExtension } from '@/lib/extension-utility';
import { useUsersDirectory } from '@/hooks/use-users-directory';
import TranscriptInfo from '@/pages/phone/transcript-info';
import AiSessionDetailDrawer from '@/pages/admin-settings/knowledge-base/components/ai-session-detail-drawer';
import { useRecordingAccess } from '@/hooks/use-recording-access';

type CallHistoryDateFilter = {
  from?: string;
  to?: string;
};

type CallHistoryProps = {
  embedded?: boolean;
  tableOnly?: boolean;
  initialActiveTab?: string;
  initialDateFilter?: CallHistoryDateFilter;
  initialFilters?: { key: string; value: string }[];
  fetcherKey?: string;
  tableMaxHeight?: string;
  tableCustomClass?: string;
  /* Both additive, both passed straight through to `TableManager` and both
     default to its own defaults (false/undefined) — opt-in per caller. */
  splitStickyHeader?: boolean;
  visibleRowCount?: number;
  /* Hides the toolbar's own date dropdown for a host that already has its
     own global date filter above this component (Performance's Interactions
     tab) — `initialDateFilter` still drives the query, it's just no longer
     independently adjustable from in here. Defaults to shown, so every
     other caller (the standalone Reports page, the Home Live Wallboard)
     keeps its own date picker exactly as before. */
  showDateFilter?: boolean;
  /* Every other caller (standalone Reports, the Home Live Wallboard) wants
     the multi-leg call expand/collapse toggle, so it defaults on. The
     Performance tab's compact analytics view never has a use for it and
     turns it off — otherwise TableManager renders that toggle as its own
     leading table column, which sits empty on every ordinary (single-leg)
     row and reads as a dead strip of whitespace before Date. */
  hasSubRows?: boolean;
  /* Every other caller (standalone Reports, the Home Live Wallboard) keeps
     the Queue/IVR Detail views as a right-side SideDrawer. Performance opts
     into a centered modal instead for both — a squished narrow drawer next
     to a mostly-empty page doesn't read the same way next to a full-width
     analytics table full of KPI cards, and leadership specifically asked
     for a centered popup here. Covers both because a "To" queue link (Call
     Info drawer) and an IVR/flow link (Callback Offer, Support Routing —
     `forward_type === 'IVR'`) are the same kind of "see more about this
     destination" action from the user's point of view; only one of them
     getting the new modal was the actual bug reported here. Defaults to
     false so nothing else changes. */
  detailsAsModal?: boolean;
};

const EMPTY_CALL_HISTORY_FILTERS: { key: string; value: string }[] = [];

const getCallHistoryDropdownValue = (dateFilter?: CallHistoryDateFilter) => {
  if (!dateFilter) return dropdownCallInitialVal;

  const value = {
    from: dateFilter.from || '',
    to: dateFilter.to || '',
  };
  const matchedDateOption = dropdownCallInitialVal.dateOptions.find((option: any) => {
    const optionValue = handleDate(option.value);
    return optionValue.from === value.from && optionValue.to === value.to;
  });

  return {
    ...dropdownCallInitialVal,
    date_type: matchedDateOption?.value || 'Custom',
    value,
  };
};

const timeStringToSeconds = (value: string | null | undefined) => {
  const trimmedValue = String(value || '').trim();
  if (!trimmedValue) return null;

  if (/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
    const seconds = Number(trimmedValue);
    return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : null;
  }

  const parts = trimmedValue.split(':').map((part) => Number(part));
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const seconds = parts.reduceRight((total, part, index) => {
    const multiplier = Math.pow(60, parts.length - 1 - index);
    return total + part * multiplier;
  }, 0);

  return Math.max(0, Math.floor(seconds));
};

const formatWaitTime = (row: any) => {
  const durationSeconds = timeStringToSeconds(row?.duration) ?? 0;
  const billsecSeconds = timeStringToSeconds(row?.billsec) ?? 0;
  const waitSeconds = Math.max(0, durationSeconds - billsecSeconds);

  return formatSecondsToMMSS(waitSeconds);
};

const TERMINAL_DIALPAD_SESSION_STATUSES = new Set(['ended', 'failed']);

const normalizeCallTarget = (value: unknown) => {
  const normalizedValue = String(value || '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();

  if (!normalizedValue) return '';

  return normalizedValue
    .replace(/^sip:/i, '')
    .split('@')[0]
    .replace(/_web$/i, '')
    .replace(/^\+/, '');
};

const getCallHistoryDialTarget = (data: any) =>
  data?.direction === 'Outbound' ? data?.destination_number : data?.caller_id_number;

const isLiveDialpadSession = (session: any) =>
  !TERMINAL_DIALPAD_SESSION_STATUSES.has(String(session?.status || '').toLowerCase());

const CallHistory = ({
  embedded = false,
  tableOnly = false,
  initialActiveTab = 'Total Calls',
  initialDateFilter,
  initialFilters = EMPTY_CALL_HISTORY_FILTERS,
  fetcherKey = 'callListingLog',
  tableMaxHeight,
  tableCustomClass = '',
  splitStickyHeader = false,
  visibleRowCount,
  showDateFilter = true,
  hasSubRows = true,
  detailsAsModal = false,
}: CallHistoryProps = {}) => {
  const tableRef = useRef<any>(null);
  const { user } = useUser();
  const navigate = useNavigate();

  const [isFilter, setIsFiltered] = useState(false);
  const [filters, setFilters] = useState<{ key: string; value: string }[]>(initialFilters);
  const [dropdownVal, setDropdownVal] = useState(() =>
    getCallHistoryDropdownValue(initialDateFilter),
  );
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(initialActiveTab);

  const [drawerState, setDrawerState] = useState({
    department: false,
    IVR: false,
    QUEUE: false,
    transcription: false,
  });
  const [transcriptionState, setTranscriptionState] = useState({ url: '', src: '' });

  const [rowData, setRowData] = useState({});
  const [recordingUrl, serRecordingUrl] = useState<any>('');
  const [modalState, setModalState] = useState<any>(false);
  const [selectedAiCallUuid, setSelectedAiCallUuid] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { features } = useCompanyFeatures();
  const canShowTranscriptionAction = Boolean(
    features?.plan_features?.advance_call_management?.access?.TRANSCRIPTION,
  );
  const [selectedFilters, setSelectedFilters] = useState<any>({});
  const SITE_UUID_TEMP = selectedFilters?.site?.value;
  const callLogActionAccess = features?.plan_features?.reports?.action || {};
  const filterRef = useRef<any>(null);
  const { makeCall, sessions } = useDialpad();
  /* Whether this person may play this particular recording, on top of the
     plan permission above. */
  const { canPlayRecording } = useRecordingAccess();
  const activeDialpadSessions = useMemo(
    () => Object.values(sessions || {}).filter(isLiveDialpadSession),
    [sessions],
  );
  const activeDialpadTargets = useMemo(() => {
    const targets = new Set<string>();
    activeDialpadSessions.forEach((session: any) => {
      const remoteNumber = normalizeCallTarget(session?.remoteNumber);
      const extension = normalizeCallTarget(session?.extension);
      if (remoteNumber) targets.add(remoteNumber);
      if (extension) targets.add(extension);
    });
    return targets;
  }, [activeDialpadSessions]);
  const iamOnCall = activeDialpadSessions.length > 0;

  const isOnCallWithUser = useCallback(
    (data: any) => {
      const target = normalizeCallTarget(getCallHistoryDialTarget(data));
      return Boolean(target && activeDialpadTargets.has(target));
    },
    [activeDialpadTargets],
  );

  const handleMakeCall = useCallback(
    (data: any) => {
      if (iamOnCall || isOnCallWithUser(data)) return;

      let number = '';
      if (data?.direction === 'Outbound') {
        number = data?.destination_number;
      } else {
        number = data?.caller_id_number;
      }

      const normalizedNumber = String(number || '').trim();
      if (!normalizedNumber) return;

      const displayCallerNumber = String(data?.display_caller_number ?? '').trim();
      const extraHeaders = [
        data?.via_did ? `X-CallerId: ${data?.via_did}` : '',
        data?.caller_id_number !== data?.display_caller_number && displayCallerNumber
          ? `X-DisplayNumber: ${displayCallerNumber}`
          : '',
      ].filter(Boolean) as string[];

      makeCall(normalizedNumber, { extraHeaders });
    },
    [iamOnCall, isOnCallWithUser, makeCall],
  );
  const { users: extensionUsers = [] } = useUsersDirectory();
  const { data: selectedAiSession = null, isFetching: isLoadingAiSession } = useQuery({
    queryKey: ['callHistoryAiSession', selectedAiCallUuid],
    queryFn: () =>
      getSessionList({
        channel: 'call',
        callUuid: selectedAiCallUuid,
        limit: 1,
      }),
    select: (data) => data?.data?.data?.result?.rows?.[0] || null,
    enabled: Boolean(selectedAiCallUuid),
  });
  const filterFields = useMemo(
    () =>
      [
        {
          type: 'select',
          key: 'direction',
          label: 'Call Type',
          placeholder: 'Select Call Type',
          options: CALL_TYPE,
        },

        {
          type: 'text',
          key: 'contact_name',
          label: 'Contact Name',
          placeholder: 'Enter Contact name',
        },
        {
          type: 'text',
          key: 'phone',
          label: 'Contact Phone Number',
          placeholder: 'Enter Phone Number',
        },
        {
          type: 'select',
          key: 'status',
          label: 'Status',
          placeholder: 'Select Status',
          options: STATUS_TYPE,
        },
      ].filter(Boolean),
    [],
  );

  const handleFilterChange = useCallback((data: any) => {
    const transformed = transFilterObject(data);
    const cleaned = transformed.map((item) => {
      if (item?.key === 'phone' && typeof item?.value === 'string') {
        return { ...item, value: item.value.replace(/\s+/g, '') };
      }
      return item;
    });
    setFilters(cleaned);
  }, []);

  const handleFilterSelect = useCallback((data: any) => {
    setSelectedFilters(data);
  }, []);

  const handleRefetchTableData = () => {
    if (!tableRef?.current) return;
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 450);
    tableRef.current.refetchTable().then(() => {
      handleAlert({ text: 'Refreshed', type: 'success' });
    });
  };

  const formatCallLogsForCSV = (data = []) => {
    return data?.map((row: any) => ({
      Date: convertDateFormateApis(row?.start_stamp, 'MMM DD hh:mm A'),
      From: row?.caller_id_number || '',
      DID: row?.via_did || '',
      To:
        row?.direction === 'Outbound'
          ? row?.destination_number
          : row?.forward_name
            ? `${row?.forward_name} (${row?.forward_value || ''})`
            : row?.destination_number || 'Unknown',
      Status: row?.status?.toLowerCase()?.replaceAll('_', ' ') || '---',
      Duration: row?.billsectotal
        ? formatSecondsToMMSS(Number(row?.billsectotal))
        : row?.billsec?.slice(3) || '00:00',
      'Wait Time': formatWaitTime(row),
      Charge: row?.charge || '0.00',
    }));
  };

  const handleDownloadCSV = () => {
    if (!tableRef.current) return;

    const tableData = tableRef.current.getTableData();

    if (!tableData || tableData.length === 0) {
      handleAlert({ text: 'No data to download', type: 'success' });
      return;
    }
    const formattedData = formatCallLogsForCSV(tableData);

    downloadCSV(formattedData, 'call');
  };

  const handleFilter = () => {
    setIsFiltered((prev) => !prev);
    setFilters([]);
    setSelectedFilters({});
  };

  const handleOpenAudio = useCallback((src: string) => {
    serRecordingUrl(src);
    setModalState(true);
  }, []);
  const handleReset = useCallback(() => {
    setDropdownVal(getCallHistoryDropdownValue(initialDateFilter));
    filterRef?.current?.resetForm();
    setFilters(initialFilters);
    setSelectedFilters({});
    setActiveTab(initialActiveTab);
  }, [initialActiveTab, initialDateFilter, initialFilters]);
  const queries = useQueries({
    queries: FORWARD_TYPES_ARR.map((type) => ({
      queryKey: ['forwardActionType-call-forwarding', SITE_UUID_TEMP, type],
      queryFn: () =>
        forwardActionType({
          page: 1,
          limit: 1000,
          filters: [],
          search: '',
          site_uuid: SITE_UUID_TEMP,
          type,
        }),
      enabled: !!SITE_UUID_TEMP,
      select: (data: any) => data?.data?.data?.result?.rows || [],
    })),
  });
  const forwardActionTypeData: any = queries?.map((query) => query.data);

  const [
    // extensionList = [],
    departmentList = [],
    //  IVRList = [],
    //   queueList = []
  ] = forwardActionTypeData;

  const tableExtraParams = useMemo(
    () => ({
      filter: filters,
      filter_date: {
        from: dropdownVal?.value?.from,
        to: dropdownVal?.value?.to,
      },
    }),
    [dropdownVal?.value?.from, dropdownVal?.value?.to, filters],
  );

  // Badge counts must stay stable across tabs, so they're fetched from an
  // unfiltered query — the main table's call_stats response is scoped to
  // whatever `direction` filter the active tab applies, which would zero out
  // every other tab's count.
  const { data: callStats = null } = useQuery({
    queryKey: ['callHistoryStats', dropdownVal?.value?.from, dropdownVal?.value?.to],
    queryFn: () =>
      callList({
        page: 1,
        limit: 1,
        filter_date: {
          from: dropdownVal?.value?.from,
          to: dropdownVal?.value?.to,
        },
      }),
    select: (res: any) => res?.data?.data?.result?.call_stats || null,
    enabled: !tableOnly,
  });

  const showMoreCallRows = useCallback((row: any) => row?.count > 1, []);

  const makeCallSubRowPayload = useCallback((row: any) => ({ sipcall_id: row?.sipcall_id }), []);

  const columns = useMemo(
    () => [
      {
        header: 'Date',
        accessorKey: 'start_stamp',
        cell: ({ row }: any) => {
          const data = row?.original;
          const type = data?.forward_type;
          let displayDirection = data?.direction;

          if (type === ACTIVITYLIST?.VOICEMAIL) {
            displayDirection = ACTIVITYLIST?.Voicemail;
          } else if (type === ACTIVITYLIST?.MESSAGE) {
            displayDirection = ACTIVITYLIST?.Announcement;
          } else if (
            data?.direction === ACTIVITYLIST?.Inbound &&
            data?.billsec === 0 &&
            data?.is_voicemail === 0
          ) {
            displayDirection = ACTIVITYLIST?.Missed;
          } else {
            displayDirection = data?.direction;
          }

          return (
            <CustomTooltip text={displayDirection} side="right">
              <span className="inline-flex items-center gap-2 w-fit">
                {CALL_DIRECTIONS[displayDirection]}
                {convertDateFormateApis(data?.start_stamp, 'MMM DD, hh:mm A')}
              </span>
            </CustomTooltip>
          );
        },
      },
      {
        header: 'From',
        accessorKey: 'caller_id_number',
        cell: ({ row }: any) => {
          const data = row?.original;

          return (
            <span>
              {data?.caller_id_number !== data?.display_caller_number ? (
                data?.direction === 'Outbound' ? (
                  <span className="flex flex-col">
                    {data?.from_display_name || 'Unknown'}
                    <span className="flex items-center">
                      <Icon name="Grid" className="w-3 h-3 text-grey-500" />
                      <small className="italic">{`(${data?.extension || 'Unknown'})`}</small>
                    </span>
                  </span>
                ) : (
                  <NumberWithFlag number={data?.display_caller_number} />
                )
              ) : (
                <span className="flex items-center gap-1">
                  <NumberWithFlag number={data?.display_caller_number} />
                </span>
              )}
            </span>
          );

          //commented as per internal discussion do no delete
          // return data?.forward_type == 'CAMPAIGN' || data?.forward_type == 'QUEUE' ? (
          //   <span>{data?.forward_name}</span>
          // ) : (
          //   <span>
          //     {data?.caller_id_number !== data?.display_caller_number ? (
          //       data?.direction === 'Outbound' ? (
          //         <span className="flex flex-col">
          //           {extensionObj[data?.extension] || 'Unknown'}
          //           <span className="flex items-center">
          //             <Icon name="Grid" className="w-3 h-3 text-grey-500" />
          //             <small className="italic">{`(${data?.extension || 'Unknown'})`}</small>
          //           </span>
          //         </span>
          //       ) : (
          //         <NumberWithFlag number={data?.display_caller_number} />
          //       )
          //     ) : (
          //       <span className="flex items-center gap-1">
          //         <NumberWithFlag number={data?.display_caller_number} />
          //       </span>
          //     )}
          //   </span>
          // );
        },
      },
      {
        header: 'DID',
        accessorKey: 'via_did',
        cell: ({ row }: any) => {
          const data = row?.original;
          return data?.via_did?.length === 4 ? (
            <span className="flex flex-col">
              <div className="flex gap-1 items-center">
                <Icon name="Grid" className="w-3 h-3 text-grey-500" />
                {data?.caller_id_number
                  ? getUserNameByExtension(
                      extensionUsers,
                      data.caller_id_number,
                      data.caller_id_number,
                    )
                  : '---'}
              </div>

              <small className="italic">{`(${data?.caller_id_number || 'Unknown'})`}</small>
            </span>
          ) : (
            <NumberWithFlag number={data?.via_did} />
          );
        },
      },
      {
        header: 'To',
        accessorKey: 'display_caller_number',
        cell: ({ row }: any) => {
          const data = row?.original;

          const selectedDepartment =
            data?.forward_type === 'DEPARTMENT'
              ? departmentList?.find((item: any) => item?.uuid === data?.forward_value)
              : null;
          const callDirection = data?.direction;

          if (callDirection === 'Outbound') {
            return (
              <span className="flex flex-col gap-0.5">
                {data?.contact_name ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-[#091A3A]">{data?.contact_name}</span>
                    {data?.contact_type ? (
                      <span className="inline-flex items-center rounded bg-[#EFF8FF] border border-[#B2DDFF] px-1.5 py-0.5 text-[10px] font-bold text-[#175CD3] uppercase tracking-wider">
                        {data?.contact_type}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex gap-1 items-center">
                  {data?.forward_type === 'CAMPAIGN' && (
                    <span className="flex justify-center">{FORWARD_ICONS[data?.forward_type]}</span>
                  )}
                  <NumberWithFlag number={data?.display_caller_number} />
                  {data?.forward_type?.toLowerCase() === 'conference' && (
                    <CustomTooltip text="Conference">
                      <span className="flex items-center text-[#175CD3] cursor-pointer ml-1">
                        <Merge className="w-4 h-4" />
                      </span>
                    </CustomTooltip>
                  )}
                </div>
              </span>
            );
          } else {
            if (!data?.forward_type) {
              return (
                <span className="flex flex-col">
                  {data?.to_display_name || 'Unknown'}
                  <span className="flex items-center">
                    <Icon name="Grid" className="w-3 h-3 text-grey-500" />
                    <small className="italic">{`(${data?.display_caller_number || 'Unknown'})`}</small>
                  </span>
                </span>
              );
            }
            const type =
              data?.forward_type === ACTIVITYLIST?.MESSAGE
                ? ACTIVITYLIST.ANNOUNCEMENT
                : data?.forward_type;
            return (
              <span className="flex flex-col  items-start">
                <div className="flex gap-1 items-center">
                  <span className="flex justify-center">{FORWARD_ICONS[type]}</span>
                  {data?.forward_type === 'DEPARTMENT' && data?.destination_number ? (
                    data?.to_display_name || data?.forward_name
                  ) : selectedDepartment?.name ? (
                    selectedDepartment?.name
                  ) : data?.forward_type === 'DEPARTMENT' ||
                    data?.forward_type === 'IVR' ||
                    data?.forward_type === 'QUEUE' ? (
                    <span
                      className={
                        data?.forward_type === 'DEPARTMENT'
                          ? ''
                          : 'text-ucass-active hover:underline cursor-pointer'
                      }
                      onClick={() => {
                        if (data?.forward_type === 'DEPARTMENT') {
                          // setDrawerState((prev) => ({ ...prev, department: true }));
                        } else if (data?.forward_type === 'IVR') {
                          setDrawerState((prev) => ({ ...prev, IVR: true }));
                        } else if (data?.forward_type === 'QUEUE') {
                          setDrawerState((prev) => ({ ...prev, QUEUE: true }));
                        }

                        setRowData({
                          ...row?.original,
                          contactId: row?.original?.sipcall_id,
                          callID: row?.original?.sipcall_id,
                        });
                      }}
                    >
                      {data?.forward_name}
                    </span>
                  ) : (
                    data?.forward_name
                  )}
                  {data?.forward_type?.toLowerCase() === 'conference' && (
                    <CustomTooltip text="Conference">
                      <span className="flex items-center text-[#175CD3] cursor-pointer ml-1">
                        <Merge className="w-4 h-4" />
                      </span>
                    </CustomTooltip>
                  )}
                </div>
                {data?.forward_type === 'EXTENSION' || data?.forward_type === 'VOICEMAIL' ? (
                  <small className="italic">{`(${data?.forward_value})`}</small>
                ) : data?.forward_type === 'DEPARTMENT' && data?.destination_number ? (
                  <small className="italic">{`(${data?.destination_number})`}</small>
                ) : null}
              </span>
            );
          }
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }: any) => {
          const data = row?.original;
          const status =
            data?.status === 'SUCCESS'
              ? 'answered'
              : data?.status?.toLowerCase()?.replaceAll('_', ' ') || '---';
          return (
            <div className="w-full flex">
              <div
                className={`flex items-center gap-1 text-[12px] text capitalize rounded-full px-2 py-0.5 ${handleStatus(status)}`}
              >
                {status}
              </div>
            </div>
          );
        },
      },
      {
        header: 'Duration',
        accessorKey: 'billsectotal',
        cell: ({ row }: any) => {
          const data = row?.original;
          return data?.billsectotal ? (
            formatSecondsToMMSS(Number(data?.billsectotal || 0))
          ) : (
            <span>{data?.billsec?.slice(3)}</span>
          );
        },
      },
      {
        header: 'Wait Time',
        accessorKey: 'wait_time',
        cell: ({ row }: any) => {
          return <span>{formatWaitTime(row?.original)}</span>;
        },
      },
      {
        header: 'Charge',
        accessorKey: 'chargeTotal',
        cell: ({ row }: any) => {
          const data = row?.original;
          const value = Number(data?.chargeTotal ?? data?.charge ?? 0);
          return `₹${(value * USD_TO_INR_RATE).toFixed(2)}`;
        },
      },
      {
        header: 'Action',
        accessorKey: 'action',
        cell: ({ row }: any) => {
          const data = row?.original;
          let number = '';
          if (data?.direction === 'Outbound') {
            number = data?.destination_number;
          } else {
            number = data?.caller_id_number;
          }
          const hasRecording = data?.recording_file || null;
          const hasTranscription = Boolean(data?.transcript_file);

          const recordingSrcUrl = data?.recording_file
            ? `${MEDIA_URL}/${user?.company_info?.uuid}/recording/${data.recording_file}`
            : '';

          return (
            <span className="flex text-center gap-2 items-center">
              {data?.ai_session_id && (
                <CustomTooltip text={'AI Conversation'} side="top">
                  <div
                    className="bg-ucass-active-bg text-ucass-active hover:bg-ucass-active hover:text-white cursor-pointer flex items-center justify-center rounded-full w-8 h-8"
                    onClick={() => setSelectedAiCallUuid(String(data.ai_session_id || '').trim())}
                  >
                    <Icon name="AIChatIcon" className="w-4.5 h-4.5" />
                  </div>
                </CustomTooltip>
              )}
              {callLogActionAccess?.call_recording_listen && canPlayRecording(data).allowed && (
                <CustomTooltip text={hasRecording ? 'Play' : 'No recording available'} side="top">
                  <div
                    className={`${
                      hasRecording
                        ? 'bg-ucass-active-bg text-ucass-active hover:bg-ucass-active hover:text-white cursor-pointer'
                        : 'cursor-not-allowed bg-gray-200 border-transparent'
                    } flex items-center justify-center rounded-full w-8 h-8`}
                    onClick={() => {
                      if (!hasRecording) return;
                      handleOpenAudio(recordingSrcUrl);
                    }}
                  >
                    <Icon name="PlayLine" className="w-4.5 h-4.5" />
                  </div>
                </CustomTooltip>
              )}
              {canShowTranscriptionAction && (
                <CustomTooltip
                  text={hasTranscription ? 'View transcription' : 'No transcription available'}
                  side="top"
                >
                  <div
                    onClick={() => {
                      if (!hasTranscription) return;
                      const url = `${MEDIA_URL}/${user?.company_info?.uuid}/recording/${data?.transcript_file}`;
                      const src = data?.recording_file
                        ? `${MEDIA_URL}/${user?.company_info?.uuid}/recording/${data.recording_file}`
                        : '';
                      setTranscriptionState({ url, src });
                      setDrawerState((prev) => ({ ...prev, transcription: true }));
                    }}
                    className={`flex items-center justify-center rounded-full w-8 h-8 ${hasTranscription ? 'bg-purple-100 text-purple-500 hover:bg-purple-400 hover:text-white cursor-pointer' : 'cursor-not-allowed bg-gray-200 border-transparent'}`}
                  >
                    <Icon name="TranscriptLineIcon" className="w-4 h-4" />
                  </div>
                </CustomTooltip>
              )}
              {callLogActionAccess?.call && (
                <CustomTooltip text={'Call'} side="top">
                  <span
                    className={`${iamOnCall || isOnCallWithUser(data) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-100 text-green-500 hover:bg-green-400 hover:text-white cursor-pointer'}  flex items-center justify-center rounded-full w-8 h-8`}
                    onClick={() => handleMakeCall(data)}
                  >
                    <Icon name="PhoneIcon" className="w-4 h-4" />
                  </span>
                </CustomTooltip>
              )}
              {callLogActionAccess?.sms && (
                <CustomTooltip text="SMS" side="top">
                  <Button
                    size="sm"
                    onClick={() => {
                      navigate(`/inbox?formState=contact&number=${number}`);
                    }}
                    className="rounded-full w-8 h-8 bg-primary/20 border-none text-primary hover:bg-primary hover:text-white"
                  >
                    <Icon name="MessageStrokIcon" className="w-4.5 h-4.5" />
                  </Button>
                </CustomTooltip>
              )}
            </span>
          );
        },
      },
    ],
    [
      canShowTranscriptionAction,
      callLogActionAccess?.call,
      callLogActionAccess?.call_recording_listen,
      callLogActionAccess?.sms,
      departmentList,
      extensionUsers,
      handleMakeCall,
      handleOpenAudio,
      iamOnCall,
      isOnCallWithUser,
      navigate,
      user?.company_info?.uuid,
    ],
  );
  const tabs = [
    { label: 'Total Calls', count: callStats?.total_calls || 0 },
    { label: 'Answered Calls', count: callStats?.inbound_calls || 0 },
    { label: 'Outgoing Calls', count: callStats?.outbound_calls || 0 },
    { label: 'Missed Calls', count: callStats?.missed_calls || 0 },
    { label: 'Voicemails', count: callStats?.voicemail || 0 },
  ];
  const handleTabClick = (tab: string) => {
    let temp = '';
    if (tab === 'Total Calls') {
      temp = '';
    } else if (tab === 'Answered Calls') {
      temp = 'Inbound';
    } else if (tab === 'Outgoing Calls') {
      temp = 'Outbound';
    } else if (tab === 'Missed Calls') {
      temp = 'Missed';
    } else if (tab === 'Voicemails') {
      temp = 'Voicemail';
    }
    if (temp) {
      setFilters([
        {
          key: 'direction',
          value: temp,
        },
      ]);
    } else {
      setFilters([]);
    }
    setActiveTab(tab);
  };

  const searchInput = (
    <div className="w-full sm:w-52 lg:w-60">
      <Input
        placeholder="Search"
        className="pl-10 h-9 min-h-9 rounded-lg"
        value={search}
        onChange={(e) => {
          const value = e.target.value;
          if (value.startsWith(' ')) return;
          setSearch(e.target.value);
        }}
        IconPosition="left-0 pl-2 inset-y-0"
        // maxLength={50}
        Icon={<SearchLine className=" text-gray-700" />}
      />
    </div>
  );

  const dateFilter = showDateFilter && (
    <DateDropdown
      {...{
        dropdownVal,
        setDropdownVal,
      }}
    />
  );

  const actionButtons = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => handleRefetchTableData()}
        className="cursor-pointer flex items-center justify-center min-h-9 min-w-9 max-w-9 max-h-9 rounded-lg w-9 h-9 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
      >
        <Icon name="Refresh" className={`w-5 h-5 ${isLoading ? 'animate-refresh-nudge' : ''}`} />
      </Button>
      <Button
        type="button"
        variant={'ghost'}
        onClick={handleDownloadCSV}
        className="cursor-pointer flex items-center justify-center min-h-9 min-w-9 max-w-9 max-h-9 rounded-lg w-9 h-9 bg-white border border-primary text-primary hover:bg-primary hover:text-white"
      >
        <Icon name="DownloadIcon" className="w-5 h-5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={handleFilter}
        aria-pressed={isFilter}
        className={`cursor-pointer flex items-center justify-center min-h-9 min-w-9 max-w-9 max-h-9 rounded-lg w-9 h-9 bg-white border border-primary text-primary hover:bg-primary hover:text-white ${isFilter ? 'filter-active' : ''}`}
      >
        <FilterIcon className="w-5 h-5" />
      </Button>
    </>
  );

  /* Embedded hosts (Performance, the Home Live Wallboard) get search
     pinned left and the date filter + action buttons grouped right via
     `justify-between` on two flex children. The standalone Reports page
     keeps the original single-row layout untouched — it's wrapped by
     `ReportsPageLayout`, which applies its own `justify-end` to `.filters`
     at the `lg` breakpoint, and restructuring this into two groups there
     would fight that rule instead of composing with it. */
  /* Shared by both the Queue and IVR/flow detail views — leadership asked
     for a "To" queue link (Billing, Onboarding…) and an IVR/flow link
     (Callback Offer, Support Routing — `forward_type === 'IVR'`) to open
     in the exact same centered modal, and duplicating this whole Dialog/
     DialogContent/close-button block per drawer type is exactly how the
     two could silently drift apart again the next time either one gets a
     tweak. Only reached when `detailsAsModal` is true, i.e. only from
     Performance, so the inline warm-sunset styling here doesn't need the
     `.qdv-root`-plus-body-class scoping trick the drawer's own CSS uses —
     this whole function is simply never called for standalone Reports or
     the Home Wallboard. */
  const renderDetailsModal = (isOpen: boolean, onClose: () => void, content: React.ReactNode) => (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="qdv-modal max-w-5xl w-full max-h-[88vh] overflow-y-auto rounded-[20px] bg-[#fffdfb] backdrop-blur-[20px] border border-[rgba(249,115,22,0.18)] shadow-[0_20px_50px_rgba(160,95,30,0.22)] p-0 gap-0"
        overlayClassName="bg-black/30 backdrop-blur-sm"
      >
        <DialogTitle className="sr-only">Details</DialogTitle>
        <DialogClose
          aria-label="Close"
          className="absolute top-[18px] right-6 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[rgba(249,115,22,0.2)] bg-[#fff7ed] text-[#8a6f57] transition-all hover:bg-[#ffedd5] hover:text-[#1a1a1a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <X className="h-4 w-4" />
        </DialogClose>
        {/* pt-12 clears the close button (top-[18px], h-8 — a 32px button
            with 18px of headroom) without a separate header row eating
            its own extra space above — the old drawer's blanket `pt-14`
            (reserved for every drawer's floating close button regardless
            of content) was exactly the "large, awkward empty space above
            Queue Info" being fixed here. */}
        <div className="pt-12 px-6 pb-6">{content}</div>
      </DialogContent>
    </Dialog>
  );

  const Filters = embedded ? (
    <div className="flex w-full flex-wrap items-center justify-between gap-2 filters">
      {searchInput}
      <div className="flex items-center gap-2">
        {dateFilter}
        {actionButtons}
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-2 filters ">
      {searchInput}
      {dateFilter}
      {actionButtons}
    </div>
  );

  const callHistoryContent = (
    <div className={`w-full flex flex-col gap-2 ${embedded ? '' : 'p-3'}`}>
      {!tableOnly && (
        <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 md:grid-cols-5">
          {tabs.map((tab) => (
            <div
              key={tab.label}
              onClick={() => handleTabClick(tab.label)}
              className={`cursor-pointer flex min-h-10 min-w-[10.75rem] flex-col items-center justify-center gap-1 rounded-lg border p-3 py-2 text-center transition-all duration-200 sm:min-w-0  ${
                activeTab === tab.label
                  ? 'border-ucass-primary-200 bg-ucass-primary-200/40 '
                  : 'border-gray-200 hover:bg-gray-50 bg-white'
              }`}
            >
              <div
                className={`min-w-8  px-1 rounded-full flex items-center justify-center  text-base font-semibold leading-none `}
                //   ${
                //     activeTab === tab.label
                //       ? 'bg-primary text-white border-primary'
                //       : 'bg-gray-50 text-gray-600 border-gray-200'
                //   }
                // `}
              >
                {tab.count}
              </div>
              <span
                className={`mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 ${
                  activeTab === tab.label ? 'text-primary' : 'text-gray-600'
                }`}
              >
                {tab.label}
              </span>
            </div>
          ))}
        </div>
      )}
      {/* TableManager's own internal filter panel only ever renders when
          `!splitStickyHeader` (see table-manager.tsx) — under
          splitStickyHeader that panel would sit as a sibling of the
          header/body tables inside a box whose whole layout depends on
          measuring "the first real row", and a filter form dropped in
          there is exactly the kind of non-representative content that
          logic explicitly guards against. Rendering it here instead,
          between the counter cards and TableManager, keeps that
          measurement untouched while still giving splitStickyHeader
          callers (Performance) the same filter toggle standalone
          Reports already has — reusing the exact same state/handlers
          this component already threads down into TableManager for the
          non-split case. */}
      {isFilter && splitStickyHeader && (
        <div className="adv-filter-panel">
          <CommonFilter
            fields={filterFields}
            onFilterChange={handleFilterChange}
            handleReset={handleReset}
            handleFilterSelect={handleFilterSelect}
            ref={filterRef}
          />
        </div>
      )}
      <TableManager
        {...{
          tableRef,
          fetcherKey,
          fetcherFn: callList,
          columns,
          search,
          extraParams: tableExtraParams,
          emptyTablePlaceholder: 'No call records found',
          descriptionEmptyTable: 'Start making or receiving calls to generate call logs.',
          tableMaxHeight,
          customClass: tableCustomClass,
          splitStickyHeader,
          visibleRowCount,

          //for extra row
          hasSubRows,
          showMoreData: showMoreCallRows,
          makeSubRowPayload: makeCallSubRowPayload,
          subRowsMutateFn: callListById,
          subRowsMutateKey: 'callListById',
          isFilter,
          filterFields,
          handleFilterChange,
          handleReset,
          filterRef,
          handleFilterSelect,
        }}
      />
      <AudioModal
        modalState={modalState}
        setModalState={setModalState}
        srcUrl={recordingUrl}
        serRecordingUrl={serRecordingUrl}
      />
      {drawerState?.IVR &&
        (detailsAsModal ? (
          renderDetailsModal(
            drawerState.IVR,
            () => setDrawerState((prev) => ({ ...prev, IVR: false })),
            <IVRDetailsView rowData={rowData} variant="modal" />,
          )
        ) : (
          <SideDrawer
            isTab
            isOpen={drawerState?.IVR}
            handleClose={() => setDrawerState((prev) => ({ ...prev, IVR: false }))}
            content={<IVRDetailsView rowData={rowData} />}
          />
        ))}
      {drawerState?.department && (
        <SideDrawer
          isTab
          isOpen={drawerState?.department}
          handleClose={() => setDrawerState((prev) => ({ ...prev, department: false }))}
          content={
            <DepartmentDetailsView
              notesTab={false}
              showOnlyDepartmentInfo={true}
              rowData={rowData}
            />
          }
        />
      )}
      {drawerState?.QUEUE &&
        (detailsAsModal ? (
          renderDetailsModal(
            drawerState.QUEUE,
            () => setDrawerState((prev) => ({ ...prev, QUEUE: false })),
            <QueueDetailsView rowData={rowData} variant="modal" />,
          )
        ) : (
          <SideDrawer
            isTab
            isOpen={drawerState?.QUEUE}
            handleClose={() => setDrawerState((prev) => ({ ...prev, QUEUE: false }))}
            content={<QueueDetailsView rowData={rowData} />}
          />
        ))}
      {drawerState?.transcription && (
        <SideDrawer
          isHeader
          isOpen={drawerState?.transcription}
          title="Call Intelligence"
          backgroundStyle="bg-transparent"
          handleClose={() => setDrawerState((prev) => ({ ...prev, transcription: false }))}
          content={
            <TranscriptInfo
              initialData={transcriptionState.src}
              transcriptSrcURL={transcriptionState.url}
              setTranscriptionState={setTranscriptionState}
            />
          }
        />
      )}
      {selectedAiCallUuid ? (
        <AiSessionDetailDrawer
          session={selectedAiSession}
          isLoading={isLoadingAiSession}
          onClose={() => setSelectedAiCallUuid('')}
        />
      ) : null}
    </div>
  );

  if (embedded) {
    return (
      <div className="flex min-h-0 w-full flex-col gap-3">
        {!tableOnly && <div className="flex flex-wrap items-center gap-2">{Filters}</div>}
        {callHistoryContent}
      </div>
    );
  }

  return <ReportsPageLayout filters={Filters}>{callHistoryContent}</ReportsPageLayout>;
};

export default CallHistory;
